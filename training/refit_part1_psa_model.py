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
  - point-scaled block ready to paste into epsaEngine.js addImpact() calls
  - sanity check warnings for counterintuitive coefficient directions
"""

from __future__ import annotations
import argparse
import json
import math
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
    race: str = "Race.1"          # dataset uses Race.1 for the coded race field
    bmi: str = "BMI"
    family_history: str = "FH of prostate"
    exercise: str = "Exercise Freq"
    smoking: str = "Smoking Status"
    diet: str = "Diet Type"
    comorbidities: str = "Comorbidities"
    genetic_risk: str = "Genetic Risk"
    knowledge_psa: str = "Knowledge of PSA level"
    # IPSS total (preferred) or compute from 7 items if needed
    ipss_total: str = "TOTAL"     # trailing space stripped at load time
    # Individual IPSS item columns
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
    thresholds = np.unique(prob)
    best = {"threshold": 0.5, "sensitivity": 0.0, "specificity": 0.0}

    for t in thresholds:
        y_hat = (prob >= t).astype(int)
        sens, spec = sensitivity_specificity(y_true, y_hat)
        if sens >= target_sens:
            if spec > best["specificity"]:
                best = {"threshold": float(t), "sensitivity": float(sens), "specificity": float(spec)}

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
# Sanity checks
# -------------------------

# Expected positive direction for PSA>4 outcome.
# Variables not listed here are not checked.
EXPECTED_POSITIVE = {
    "age_50_59", "age_60_69", "age_70_plus",
    "bmi_ge_30",
    "raceBlack",
    "fhBinary",
    "exercise_none",
}

# Within-group monotonicity constraints:
# each tuple is (lower_bin, higher_bin) — higher should have larger coefficient.
MONOTONICITY_CHECKS = [
    ("age_50_59", "age_60_69", "age_70_plus"),   # older → higher PSA risk
    ("bmi_25_29_9", "bmi_ge_30"),                 # more obese → higher PSA risk
    ("ipss_moderate", "ipss_severe"),             # severity ordering
    ("exercise_some", "exercise_none"),           # less exercise → higher risk
]

def run_sanity_checks(weights: Dict[str, float]) -> List[str]:
    issues = []

    for vid, w in weights.items():
        if vid in EXPECTED_POSITIVE and w < 0:
            issues.append(
                f"  ⚠  {vid}: expected POSITIVE coefficient (risk factor for PSA>4) "
                f"but got {w:.4f}. Check data encoding or sample size."
            )

    for group in MONOTONICITY_CHECKS:
        present = [v for v in group if v in weights]
        if len(present) < 2:
            continue
        vals = [weights[v] for v in present]
        for i in range(len(vals) - 1):
            if vals[i] > vals[i + 1]:
                issues.append(
                    f"  ⚠  Monotonicity violated: {present[i]} ({vals[i]:.4f}) > "
                    f"{present[i+1]} ({vals[i+1]:.4f}). "
                    f"Expected {present[i]} ≤ {present[i+1]}."
                )

    return issues


# -------------------------
# Points scaling
# -------------------------

# Features included in the engine's point-based score for Part 1.
# These are the variables the logistic model covers; other engine features
# (smoking, BRCA, diet, chemical exposure, SHIM, comorbidities) keep their
# current clinical-judgment values and are NOT overwritten here.
ENGINE_POINT_MAP = {
    # (variable_id): description for output
    "age_50_59":   "Age 50-59 pts",
    "age_60_69":   "Age 60-69 pts",
    "age_70_plus": "Age 70+ pts",
    "bmi_25_29_9": "BMI 25-29.9 pts",
    "bmi_ge_30":   "BMI ≥30 pts",
    "ipss_moderate": "IPSS moderate pts",
    "ipss_severe":   "IPSS severe pts",
    "exercise_some": "Exercise some pts",
    "exercise_none": "Exercise none pts",
    "raceBlack":   "Black ancestry pts",
    "fhBinary":    "Family history pts",
}

def derive_engine_points(weights: Dict[str, float], scale: float) -> Dict[str, int]:
    """
    Convert logistic coefficients to non-negative integer point values.

    Negative coefficients are zeroed (unexpected direction — flagged separately
    by sanity checks). Scale factor: engine_pts = round(coef * scale).
    Default scale (10.0) means a log-OR of 1.0 → 10 pts.
    """
    pts: Dict[str, int] = {}
    for vid in ENGINE_POINT_MAP:
        w = weights.get(vid, 0.0)
        pts[vid] = max(0, round(w * scale))
    return pts


# -------------------------
# Main
# -------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True, help="Path to Excel file")
    ap.add_argument("--sheet", default=None, help="Optional sheet name; default first sheet")
    ap.add_argument("--col-psa", default=None)
    ap.add_argument("--col-age-group", default=None)
    ap.add_argument("--col-race", default=None)
    ap.add_argument("--col-bmi", default=None)
    ap.add_argument("--col-family-history", default=None)
    ap.add_argument("--col-exercise", default=None)
    ap.add_argument("--col-ipss-total", default=None)
    ap.add_argument("--col-ipss-item", action="append", default=[])
    ap.add_argument("--target_sens", type=float, default=0.95)
    ap.add_argument("--repeats", type=int, default=50)
    ap.add_argument("--splits", type=int, default=5)
    ap.add_argument("--C", type=float, default=1.0)
    ap.add_argument("--no_interactions", action="store_true")
    ap.add_argument(
        "--points_scale", type=float, default=10.0,
        help=(
            "Scale factor: engine_pts = round(coef * scale). "
            "Default 10 means a log-OR of 1.0 maps to 10 pts. "
            "Increase to spread points further apart."
        )
    )
    args = ap.parse_args()

    if args.xlsx.lower().endswith(".csv"):
        df = pd.read_csv(args.xlsx)
    else:
        df = pd.read_excel(args.xlsx, sheet_name=args.sheet)
        if isinstance(df, dict):
            if args.sheet is None:
                sheet_name = next(iter(df))
                df = df[sheet_name]
            else:
                raise ValueError(
                    f"Specified sheet '{args.sheet}' not found; available sheets: {list(df.keys())}"
                )
    df.columns = df.columns.str.strip()

    cols = Cols()
    for attr in ("psa", "age_group", "race", "bmi", "family_history", "exercise", "ipss_total"):
        cli_val = getattr(args, f"col_{attr.replace('_', '-')}", None)
        if cli_val:
            setattr(cols, attr, cli_val)
    if args.col_ipss_item:
        cols.ipss_items = tuple(args.col_ipss_item)

    # knowledge_psa filter: only train on rows where patient actually had PSA measured
    knowledge_psa_col = cols.knowledge_psa if cols.knowledge_psa in df.columns else None

    def norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(s).strip().lower())

    available = list(df.columns)
    auto_map: Dict[str, str] = {}
    for field in ["psa", "age_group", "race", "bmi", "family_history", "exercise", "ipss_total", "smoking", "diet", "comorbidities", "genetic_risk"]:
        required = getattr(cols, field)
        if required in df.columns:
            continue
        norm_matches = [c for c in available if norm(c) == norm(required)]
        if len(norm_matches) == 1:
            auto_map[required] = norm_matches[0]
            setattr(cols, field, norm_matches[0])
            continue
        matches = difflib.get_close_matches(required, available, n=2, cutoff=0.7)
        if len(matches) == 1:
            auto_map[required] = matches[0]
            setattr(cols, field, matches[0])
            continue
    if auto_map:
        print("Warning: auto-mapped column names based on closest matches:")
        for orig, new in auto_map.items():
            print(f"  '{orig}' -> '{new}'")

    # Apply knowledge_psa filter before building features
    if knowledge_psa_col:
        pre = len(df)
        df = df[df[knowledge_psa_col].apply(normalize_str).isin(["yes", "y", "1", "true"])].copy()
        print(f"Filtered to rows where '{knowledge_psa_col}' = Yes: {len(df)} / {pre} rows kept")
    else:
        print(f"Warning: '{cols.knowledge_psa}' column not found — using all rows")

    missing = []
    for required in [cols.psa, cols.age_group, cols.race, cols.bmi, cols.family_history, cols.exercise]:
        if required not in df.columns:
            missing.append(required)
    if missing:
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

    print(f"\nDataset: {len(y)} rows used, {y.sum()} with PSA>4 ({y.mean()*100:.1f}%)")

    # Print class distribution per age bin for sanity
    print("\nPSA>4 rate by age bin (sanity check):")
    age_mid_all = df.loc[X.index, cols.age_group].apply(age_group_midpoint)
    age_bin_all = pd.to_numeric(age_mid_all, errors="coerce").apply(
        lambda v: pick_bin_label(v, AGE_BINS, "40-49")
    )
    for label in ["40-49", "50-59", "60-69", "70+"]:
        mask = age_bin_all == label
        n = mask.sum()
        rate = y.loc[mask].mean() if n > 0 else float("nan")
        print(f"  {label}: n={n}, PSA>4 rate={rate*100:.1f}%")

    # Model
    model = LogisticRegression(
        penalty="l2",
        C=args.C,
        solver="liblinear",
        max_iter=5000,
        class_weight=None
    )

    # Out-of-fold CV
    rskf = RepeatedStratifiedKFold(n_splits=args.splits, n_repeats=args.repeats, random_state=42)
    oof_prob = np.zeros(len(y), dtype=float)

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

    # Final model on full data
    model.fit(X, y)

    intercept = float(model.intercept_[0])
    coef = model.coef_[0]
    feature_names = list(X.columns)
    weights = {fn: float(w) for fn, w in zip(feature_names, coef)}

    # -------------------------
    # Sanity checks
    # -------------------------
    issues = run_sanity_checks(weights)
    if issues:
        print("\n===== SANITY CHECK WARNINGS =====")
        for msg in issues:
            print(msg)
        print(
            "\n  These may indicate: small sample size causing unstable estimates, "
            "unexpected correlations in your cohort, or data encoding issues. "
            "Review the PSA>4 rate by bin above before using these weights."
        )
    else:
        print("\n✓ All sanity checks passed — coefficients are in expected directions.")

    # -------------------------
    # Config-ready output
    # -------------------------
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

    # -------------------------
    # Points output for epsaEngine.js
    # -------------------------
    pts = derive_engine_points(weights, args.points_scale)
    zeroed = [vid for vid, w in weights.items() if vid in ENGINE_POINT_MAP and w < 0]

    print(f"\n===== POINT VALUES FOR epsaEngine.js (scale={args.points_scale}) =====")
    print(
        "These replace only the model-covered features in calculateDynamicEPsa().\n"
        "Smoking, BRCA, diet, chemical exposure, SHIM, and comorbidity points\n"
        "are NOT changed — keep those at their current clinical-judgment values.\n"
    )
    if zeroed:
        print(
            f"  Note: {zeroed} had negative coefficients and were zeroed.\n"
            "  Review sanity check warnings above before accepting these values.\n"
        )

    print("  // --- paste into calculateDynamicEPsa() addImpact() calls ---")
    print(f"  if (ageNum >= 70)      addImpact('Age', ..., {pts['age_70_plus']});")
    print(f"  else if (ageNum >= 60) addImpact('Age', ..., {pts['age_60_69']});")
    print(f"  else if (ageNum >= 50) addImpact('Age', ..., {pts['age_50_59']});")
    print(f"  else                   addImpact('Age', ..., 0);")
    print()
    print(f"  // BMI")
    print(f"  if (bmiNum >= 30)      addImpact('BMI', ..., {pts['bmi_ge_30']});")
    print(f"  else if (bmiNum >= 25) addImpact('BMI', ..., {pts['bmi_25_29_9']});")
    print(f"  else                   addImpact('BMI', ..., 0);")
    print()
    print(f"  // IPSS")
    print(f"  if (ipssTotal >= 20)   addImpact('IPSS total', ..., {pts['ipss_severe']});")
    print(f"  else if (ipssTotal >= 8) addImpact('IPSS total', ..., {pts['ipss_moderate']});")
    print(f"  else                   addImpact('IPSS total', ..., 0);")
    print()
    print(f"  // Exercise")
    print(f"  if (exerciseCode === 2) addImpact('Exercise', 'None', {pts['exercise_none']});")
    print(f"  else if (exerciseCode === 1) addImpact('Exercise', 'Some', {pts['exercise_some']});")
    print(f"  else                    addImpact('Exercise', 'Regular', 0);")
    print()
    print(f"  // Race / FH")
    print(f"  addImpact('Black ancestry', ..., isBlack ? {pts['raceBlack']} : 0);")
    print(f"  addImpact('Family history', ..., fhBinary === 1 ? {pts['fhBinary']} : 0);")

    print(f"\n  MAX_POINTS should be re-evaluated after changing point values.")
    total_max_model = sum(max(v, 0) for v in pts.values())
    print(f"  Sum of all model-derived positive points above: {total_max_model}")
    print(
        f"  Add your fixed non-model points (smoking max 6, BRCA 16, diet 4,\n"
        f"  chemical 4, SHIM 8, comorbidities 20) to get the new MAX_POINTS."
    )


if __name__ == "__main__":
    main()
