#!/usr/bin/env python3
"""
Refit ePSA Part 1 model (Need PSA test?) using binned + dummy variables.

Outcome:
  y = 1 if PSA > 4 else 0

Features (production-aligned ids):
  age_50_59, age_60_69, age_70_plus        (ref: 40-49)
  bmi_25_29_9, bmi_ge_30                    (ref: <25)
  ipss_moderate, ipss_severe                (ref: mild)
  exercise_some, exercise_none              (ref: regular)
  raceBlack                                 (Black vs Non-Black)
  fhBinary                                  (family history yes/no)
Optional interactions:
  age60plus_x_ipss_moderate, age60plus_x_ipss_severe

Outputs:
  - cross-validated AUC
  - threshold achieving target sensitivity (default 0.95) with max specificity
  - final intercept + coefficients for calculatorConfig.js
"""

from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import difflib

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.metrics import roc_auc_score


# -------------------------
# Helpers: parsing / bins
# -------------------------

BLACK_VALUES = {
    "black", "black or african american", "african american", "black/aa", "black/african american"
}

def normalize_str(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip().lower()

def age_group_midpoint(age_group: str) -> Optional[float]:
    """
    Accepts strings like:
      "40-49", "50-59", "60-69", "70+", "70-79", "80+"
    Returns numeric midpoint (70+ -> 75 by default).
    """
    s = normalize_str(age_group)
    if not s:
        return None
    # 70+ or 80+
    m = re.match(r"^(\d{2,3})\+$", s)
    if m:
        base = float(m.group(1))
        return base + 5.0  # assume + means decade bin
    # 40-49
    m = re.match(r"^(\d{2,3})\s*-\s*(\d{2,3})$", s)
    if m:
        a = float(m.group(1))
        b = float(m.group(2))
        return (a + b) / 2.0
    # fallback: try numeric
    try:
        return float(s)
    except Exception:
        return None

def pick_bin_label(x: float, bins: List[Tuple[float, float, str]], default: str) -> str:
    if x is None or not np.isfinite(x):
        return default
    for lo, hi, label in bins:
        if x >= lo and x <= hi:
            return label
    return default

AGE_BINS = [
    (40, 49, "40-49"),
    (50, 59, "50-59"),
    (60, 69, "60-69"),
    (70, 200, "70+"),
]
BMI_BINS = [
    (0, 24.999, "<25"),
    (25, 29.999, "25-29.9"),
    (30, 200, ">=30"),
]
IPSS_BINS = [
    (0, 7, "mild"),
    (8, 19, "moderate"),
    (20, 35, "severe"),
]


# -------------------------
# Column mapping (edit if needed)
# -------------------------

@dataclass
class Cols:
    psa: str = "PSA"
    age_group: str = "Age Group"
    race: str = "Race"
    bmi: str = "BMI"
    # Family history field in your sheet may differ; update this name if needed:
    family_history: str = "FH of prostate"
    # Exercise may be categorical already; update as needed:
    exercise: str = "Exercise Freq"
    # IPSS total (preferred) or compute from 7 items if needed
    ipss_total: str = "TOTAL"
    # If IPSS total column is missing, list your 7 IPSS item column names here
    ipss_items: Tuple[str, ...] = (
        "Incomplete Emptying",
        "Frequency",
        "Intermittency",
        "Urgency",
        "Weak Stream",
        "Straining",
        "Nocturia",
    )

def derive_ipss_total(df: pd.DataFrame, cols: Cols) -> pd.Series:
    if cols.ipss_total in df.columns:
        return pd.to_numeric(df[cols.ipss_total], errors="coerce")
    # sum IPSS items if present
    missing = [c for c in cols.ipss_items if c not in df.columns]
    if missing:
        raise ValueError(f"Missing IPSS total and missing IPSS item columns: {missing}")
    ipss_mat = df[list(cols.ipss_items)].apply(pd.to_numeric, errors="coerce")
    return ipss_mat.sum(axis=1)

def recode_exercise_to_code(x) -> Optional[int]:
    """
    Production expects:
      0 = Regular
      1 = Some
      2 = None
    Map common strings accordingly.
    """
    s = normalize_str(x)
    if not s:
        return None
    if "regular" in s or "daily" in s or "frequent" in s:
        return 0
    if "some" in s or "moderate" in s or "occas" in s:
        return 1
    if "none" in s or "no " in s or s == "no":
        return 2
    # If already numeric-like:
    try:
        v = int(float(s))
        if v in (0, 1, 2):
            return v
    except Exception:
        pass
    return None

def recode_family_history_to_binary(x) -> int:
    """
    Returns 1 if any family history reported, else 0.
    Accepts "Yes/No" or counts or strings.
    """
    s = normalize_str(x)
    if not s:
        return 0
    if s in ("yes", "y", "true", "1"):
        return 1
    if s in ("no", "n", "false", "0"):
        return 0
    # numeric count?
    try:
        v = float(s)
        return 1 if v > 0 else 0
    except Exception:
        pass
    # Explicitly catch "no history" and similar before substring fallback
    if s.startswith("no ") or s in ("no history", "none", "no family history", "no fh"):
        return 0
    # fallback: if contains known positive-FH keywords treat as yes
    return 1 if any(k in s for k in ["father", "brother", "family", "relative", "first-degree"]) else 0


# -------------------------
# Feature builder (aligned to JS ids)
# -------------------------

def build_features(df: pd.DataFrame, cols: Cols, add_interactions: bool = True) -> Tuple[pd.DataFrame, pd.Series]:
    # Outcome
    psa = pd.to_numeric(df[cols.psa], errors="coerce")
    y = (psa > 4.0).astype(int)

    # Age numeric from Age Group
    age_mid = df[cols.age_group].apply(age_group_midpoint)
    age_mid = pd.to_numeric(age_mid, errors="coerce")

    # Race black vs non-black
    race_norm = df[cols.race].apply(normalize_str)
    race_black = race_norm.isin(BLACK_VALUES).astype(int)

    # BMI
    bmi = pd.to_numeric(df[cols.bmi], errors="coerce")

    # IPSS
    ipss_total = derive_ipss_total(df, cols)

    # Exercise -> code
    exercise_code = df[cols.exercise].apply(recode_exercise_to_code)
    exercise_code = pd.to_numeric(exercise_code, errors="coerce")

    # Family history -> binary
    fh = df[cols.family_history].apply(recode_family_history_to_binary).astype(int)

    # Bins
    age_bin = age_mid.apply(lambda v: pick_bin_label(v, AGE_BINS, "40-49"))
    bmi_bin = bmi.apply(lambda v: pick_bin_label(v, BMI_BINS, "<25"))
    ipss_sev = ipss_total.apply(lambda v: pick_bin_label(v, IPSS_BINS, "mild"))

    # Dummy vars (reference categories drop to 0)
    X = pd.DataFrame(index=df.index)

    X["age_50_59"] = (age_bin == "50-59").astype(int)
    X["age_60_69"] = (age_bin == "60-69").astype(int)
    X["age_70_plus"] = (age_bin == "70+").astype(int)

    X["bmi_25_29_9"] = (bmi_bin == "25-29.9").astype(int)
    X["bmi_ge_30"] = (bmi_bin == ">=30").astype(int)

    X["ipss_moderate"] = (ipss_sev == "moderate").astype(int)
    X["ipss_severe"] = (ipss_sev == "severe").astype(int)

    # exercise dummies: ref = 0 regular
    X["exercise_some"] = (exercise_code == 1).astype(int)
    X["exercise_none"] = (exercise_code == 2).astype(int)

    X["raceBlack"] = race_black
    X["fhBinary"] = fh

    if add_interactions:
        age60plus = (age_mid >= 60).astype(int)
        X["age60plus_x_ipss_moderate"] = age60plus * X["ipss_moderate"]
        X["age60plus_x_ipss_severe"] = age60plus * X["ipss_severe"]

    # Drop rows with missing key inputs that make bins meaningless
    # (keep this strict so training matches production requirements)
    required_mask = (
        psa.notna()
        & age_mid.notna()
        & bmi.notna()
        & ipss_total.notna()
        & exercise_code.notna()
    )
    X = X.loc[required_mask].copy()
    y = y.loc[required_mask].copy()

    return X, y


# -------------------------
# Threshold selection
# -------------------------

def sensitivity_specificity(y_true: np.ndarray, y_pred: np.ndarray) -> Tuple[float, float]:
    tp = np.sum((y_true == 1) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    sens = tp / (tp + fn) if (tp + fn) else 0.0
    spec = tn / (tn + fp) if (tn + fp) else 0.0
    return sens, spec

def pick_threshold_for_sensitivity(
    y_true: np.ndarray,
    prob: np.ndarray,
    target_sens: float = 0.95
) -> Dict[str, float]:
    # scan thresholds from unique probs (sorted high->low)
    thresholds = np.unique(prob)
    best = {"threshold": 0.5, "sensitivity": 0.0, "specificity": 0.0}

    for t in thresholds:
        y_hat = (prob >= t).astype(int)
        sens, spec = sensitivity_specificity(y_true, y_hat)
        if sens >= target_sens:
            # maximize specificity among thresholds meeting sensitivity
            if spec > best["specificity"]:
                best = {"threshold": float(t), "sensitivity": float(sens), "specificity": float(spec)}

    # If nothing meets sensitivity target, fall back to threshold with max sensitivity, then max specificity
    if best["sensitivity"] < target_sens:
        fallback = {"threshold": 0.5, "sensitivity": -1.0, "specificity": -1.0}
        for t in thresholds:
            y_hat = (prob >= t).astype(int)
            sens, spec = sensitivity_specificity(y_true, y_hat)
            if sens > fallback["sensitivity"] or (sens == fallback["sensitivity"] and spec > fallback["specificity"]):
                fallback = {"threshold": float(t), "sensitivity": float(sens), "specificity": float(spec)}
        best = fallback

    return best


# -------------------------
# Main
# -------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True, help="Path to Excel file, e.g. 'ePSA Initial Data  w PSA + MRI.xlsx'")
    ap.add_argument("--sheet", default=None, help="Optional sheet name; default first sheet")
    # column overrides so users can map their own headers
    ap.add_argument("--col-psa", default=None, help="Column name for PSA")
    ap.add_argument("--col-age-group", default=None, help="Column name for age group")
    ap.add_argument("--col-race", default=None, help="Column name for race")
    ap.add_argument("--col-bmi", default=None, help="Column name for BMI")
    ap.add_argument("--col-family-history", default=None, help="Column name for family history")
    ap.add_argument("--col-exercise", default=None, help="Column name for exercise frequency")
    ap.add_argument("--col-ipss-total", default=None, help="Column name for IPSS total (or set of IPSS items")
    ap.add_argument("--col-ipss-item", action="append", default=[], help="Individual IPSS item column name (can pass multiple)")
    ap.add_argument("--target_sens", type=float, default=0.95, help="Target sensitivity for Recommend PSA threshold")
    ap.add_argument("--repeats", type=int, default=50, help="CV repeats")
    ap.add_argument("--splits", type=int, default=5, help="CV folds")
    ap.add_argument("--C", type=float, default=1.0, help="Inverse regularization strength for LogisticRegression")
    ap.add_argument("--no_interactions", action="store_true", help="Disable Age>=60 x IPSS interactions")
    args = ap.parse_args()

    # Read Excel; if no sheet provided pandas returns a dict of all sheets which later breaks code.
    df = pd.read_excel(args.xlsx, sheet_name=args.sheet)
    # pandas returns a dict when sheet_name is None or a list. We expect a single DataFrame.
    if isinstance(df, dict):
        if args.sheet is None:
            # use first sheet by default
            sheet_name = next(iter(df))
            df = df[sheet_name]
        else:
            raise ValueError(
                f"Specified sheet '{args.sheet}' not found; available sheets: {list(df.keys())}"
            )
    # strip whitespace from column headers to avoid mismatches like 'TOTAL '
    df.columns = df.columns.str.strip()

    # build Cols object, applying any overrides from CLI
    cols = Cols()
    for attr in ("psa", "age_group", "race", "bmi", "family_history", "exercise", "ipss_total"):
        cli_val = getattr(args, f"col_{attr.replace('_', '-')}", None)
        if cli_val:
            setattr(cols, attr, cli_val)
    # override ipss_items if provided via CLI
    if args.col_ipss_item:
        cols.ipss_items = tuple(args.col_ipss_item)

    # helper: normalized string for matching
    def norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(s).strip().lower())

    # attempt to auto-map missing column names using exact, normalized, or difflib
    available = list(df.columns)
    auto_map: Dict[str, str] = {}
    for field in ["psa", "age_group", "race", "bmi", "family_history", "exercise", "ipss_total"]:
        required = getattr(cols, field)
        if required in df.columns:
            continue
        # try normalization match
        norm_matches = [c for c in available if norm(c) == norm(required)]
        if len(norm_matches) == 1:
            auto_map[required] = norm_matches[0]
            setattr(cols, field, norm_matches[0])
            continue
        # try difflib
        matches = difflib.get_close_matches(required, available, n=2, cutoff=0.7)
        if len(matches) == 1:
            auto_map[required] = matches[0]
            setattr(cols, field, matches[0])
            continue
    if auto_map:
        print("Warning: auto-mapped column names based on closest matches:")
        for orig, new in auto_map.items():
            print(f"  '{orig}' -> '{new}'")

    # final validation
    missing = []
    for required in [cols.psa, cols.age_group, cols.race, cols.bmi, cols.family_history, cols.exercise]:
        if required not in df.columns:
            missing.append(required)
    if missing:
        # collect suggestions for error message (unchanged from before)
        suggestions: Dict[str, List[str]] = {}
        for required in missing:
            matches = difflib.get_close_matches(required, available, n=3, cutoff=0.6)
            if matches:
                suggestions[required] = matches
        msg = f"Required column(s) not found: {missing}.\n"
        if suggestions:
            for req, sugg in suggestions.items():
                msg += f"  Could any of {sugg} match '{req}'?\n"
        msg += f"Available columns: {available}"
        raise ValueError(msg)

    X, y = build_features(df, cols, add_interactions=not args.no_interactions)

    # Model
    model = LogisticRegression(
        penalty="l2",
        C=args.C,
        solver="liblinear",
        max_iter=5000,
        class_weight=None
    )

    # Out-of-fold probabilities
    rskf = RepeatedStratifiedKFold(n_splits=args.splits, n_repeats=args.repeats, random_state=42)
    oof_prob = np.zeros(len(y), dtype=float)

    # Manual CV loop to get pooled OOF predictions
    for train_idx, test_idx in rskf.split(X, y):
        Xtr, Xte = X.iloc[train_idx], X.iloc[test_idx]
        ytr = y.iloc[train_idx]
        m = LogisticRegression(
            penalty="l2", C=args.C, solver="liblinear", max_iter=5000
        )
        m.fit(Xtr, ytr)
        oof_prob[test_idx] = m.predict_proba(Xte)[:, 1]

    auc = roc_auc_score(y, oof_prob)
    best = pick_threshold_for_sensitivity(y.to_numpy(), oof_prob, target_sens=args.target_sens)

    # Fit final model on full data for deployable coefficients
    model.fit(X, y)

    intercept = float(model.intercept_[0])
    coef = model.coef_[0]
    feature_names = list(X.columns)
    weights = {fn: float(w) for fn, w in zip(feature_names, coef)}

    # Emit config-ready block
    variables = []
    for vid in [
        "age_50_59","age_60_69","age_70_plus",
        "bmi_25_29_9","bmi_ge_30",
        "ipss_moderate","ipss_severe",
        "exercise_some","exercise_none",
        "raceBlack","fhBinary",
        "age60plus_x_ipss_moderate","age60plus_x_ipss_severe"
    ]:
        if vid in weights:
            variables.append({"id": vid, "name": vid, "weight": weights[vid], "type": "binary"})

    out = {
        "n_used": int(len(y)),
        "prevalence_psa_gt_4": float(y.mean()),
        "auc_oof": float(auc),
        "threshold_sensitivity_target": float(args.target_sens),
        "picked_threshold": best,
        "deploy": {
            "intercept": intercept,
            "recommendThreshold": best["threshold"],
            "variables": variables
        }
    }

    print("\n===== PART 1 PSA>4 REFIT RESULTS =====")
    print(json.dumps(out, indent=2))

    print("\n----- Paste into calculatorConfig.js (part1) -----")
    print(f"intercept: {intercept:.6f},")
    print(f"recommendThreshold: {best['threshold']:.6f},")
    print("variables: [")
    for v in variables:
        print(f"  {{ id: '{v['id']}', name: '{v['id']}', weight: {v['weight']:.6f}, type: 'binary' }},")
    print("],")

if __name__ == "__main__":
    main()