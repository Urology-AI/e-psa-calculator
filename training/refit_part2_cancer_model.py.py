#!/usr/bin/env python3
"""
Refit ePSA Part 2 model (Cancer risk: csPCa GG>=2).

Label:
  ClinicallySignificant = 1 if Grade Group >= 2 else 0
  Parsed from 'Final Path' (supports "GG2", "Grade Group 2", "Gleason 3+4", etc.)

Predictors (default):
  logPSA
  PIRADS dummies: pirads_3, pirads_4, pirads_5 (ref: <=2 / missing)
Optional:
  age bins + raceBlack + fhBinary + BMI bins (set --include_demographics)

Outputs:
  - pooled out-of-fold AUC
  - Brier score (pooled OOF)
  - threshold table (you can set your own later)
  - deploy intercept + weights for calculatorConfig.js
"""

from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from typing import Optional, Tuple, List

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.metrics import roc_auc_score, brier_score_loss


BLACK_VALUES = {
    "black", "black or african american", "african american", "black/aa", "black/african american"
}

def normalize_str(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip().lower()

def safe_log_psa(psa: float) -> float:
    return float(np.log(max(psa, 0.1)))

def parse_grade_group(final_path: str) -> Optional[int]:
    """
    Attempt to parse Grade Group from a free-text pathology string.
    Handles common patterns:
      - "GG1", "GG 2", "Grade Group 3"
      - "Gleason 3+4" => GG2
      - "Gleason 4+3" => GG3
      - "Gleason 4+4" => GG4
      - "Gleason 4+5/5+4/5+5" => GG5
    Returns int 1..5 or None if cannot parse.
    """
    s = normalize_str(final_path)
    if not s:
        return None

    # Direct "grade group"
    m = re.search(r"(grade\s*group|gg)\s*[:\-]?\s*(\d)", s)
    if m:
        gg = int(m.group(2))
        if 1 <= gg <= 5:
            return gg

    # Gleason patterns like 3+4, 4+3, etc.
    m = re.search(r"gleason\s*(score)?\s*[:\-]?\s*(\d)\s*\+\s*(\d)", s)
    if m:
        a = int(m.group(2))
        b = int(m.group(3))
        # Map to GG
        if (a, b) == (3, 3):
            return 1
        if (a, b) == (3, 4):
            return 2
        if (a, b) == (4, 3):
            return 3
        if (a, b) == (4, 4):
            return 4
        # Any primary 5 or total pattern implying 9-10 -> GG5
        if a == 5 or b == 5:
            return 5

    return None

@dataclass
class Cols:
    psa: str = "PSA"
    pirads: str = "PIRADS"
    final_path: str = "Final Path"
    # Optional demographics
    age_group: str = "Age Group"
    race: str = "Race"
    bmi: str = "BMI"
    family_history: str = "FH of prostate"

def age_group_midpoint(age_group: str) -> Optional[float]:
    s = normalize_str(age_group)
    if not s:
        return None
    m = re.match(r"^(\d{2,3})\+$", s)
    if m:
        base = float(m.group(1))
        return base + 5.0
    m = re.match(r"^(\d{2,3})\s*-\s*(\d{2,3})$", s)
    if m:
        a = float(m.group(1)); b = float(m.group(2))
        return (a + b) / 2.0
    try:
        return float(s)
    except Exception:
        return None

def recode_family_history_to_binary(x) -> int:
    s = normalize_str(x)
    if not s:
        return 0
    if s in ("yes", "y", "true", "1"):
        return 1
    if s in ("no", "n", "false", "0"):
        return 0
    try:
        v = float(s)
        return 1 if v > 0 else 0
    except Exception:
        pass
    return 1

AGE_BINS = [(40, 49, "40-49"), (50, 59, "50-59"), (60, 69, "60-69"), (70, 200, "70+")]
BMI_BINS = [(0, 24.999, "<25"), (25, 29.999, "25-29.9"), (30, 200, ">=30")]

def pick_bin_label(x: float, bins: List[Tuple[float, float, str]], default: str) -> str:
    if x is None or not np.isfinite(x):
        return default
    for lo, hi, label in bins:
        if x >= lo and x <= hi:
            return label
    return default

def build_features(df: pd.DataFrame, cols: Cols, include_demographics: bool) -> Tuple[pd.DataFrame, pd.Series]:
    psa = pd.to_numeric(df[cols.psa], errors="coerce")
    pirads = pd.to_numeric(df[cols.pirads], errors="coerce")
    gg = df[cols.final_path].apply(parse_grade_group)
    gg = pd.to_numeric(gg, errors="coerce")

    y = (gg >= 2).astype(int)

    X = pd.DataFrame(index=df.index)
    X["logPSA"] = psa.apply(lambda v: safe_log_psa(v) if np.isfinite(v) else np.nan)

    # PIRADS dummies (ref: <=2)
    X["pirads_3"] = (pirads == 3).astype(int)
    X["pirads_4"] = (pirads == 4).astype(int)
    X["pirads_5"] = (pirads == 5).astype(int)

    if include_demographics:
        age_mid = pd.to_numeric(df[cols.age_group].apply(age_group_midpoint), errors="coerce")
        age_bin = age_mid.apply(lambda v: pick_bin_label(v, AGE_BINS, "40-49"))
        X["age_50_59"] = (age_bin == "50-59").astype(int)
        X["age_60_69"] = (age_bin == "60-69").astype(int)
        X["age_70_plus"] = (age_bin == "70+").astype(int)

        bmi = pd.to_numeric(df[cols.bmi], errors="coerce")
        bmi_bin = bmi.apply(lambda v: pick_bin_label(v, BMI_BINS, "<25"))
        X["bmi_25_29_9"] = (bmi_bin == "25-29.9").astype(int)
        X["bmi_ge_30"] = (bmi_bin == ">=30").astype(int)

        race_norm = df[cols.race].apply(normalize_str)
        X["raceBlack"] = race_norm.isin(BLACK_VALUES).astype(int)
        X["fhBinary"] = df[cols.family_history].apply(recode_family_history_to_binary).astype(int)

    # Require label + key predictors
    mask = gg.notna() & psa.notna() & pirads.notna()
    X = X.loc[mask].copy()
    y = y.loc[mask].copy()
    return X, y

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--repeats", type=int, default=100)
    ap.add_argument("--splits", type=int, default=5)
    ap.add_argument("--C", type=float, default=1.0)
    ap.add_argument("--include_demographics", action="store_true")
    args = ap.parse_args()

    df = pd.read_excel(args.xlsx, sheet_name=args.sheet)
    cols = Cols()

    for required in [cols.psa, cols.pirads, cols.final_path]:
        if required not in df.columns:
            raise ValueError(f"Required column '{required}' not found. Available: {list(df.columns)}")

    X, y = build_features(df, cols, include_demographics=args.include_demographics)

    rskf = RepeatedStratifiedKFold(n_splits=args.splits, n_repeats=args.repeats, random_state=42)
    oof_prob = np.zeros(len(y), dtype=float)

    for train_idx, test_idx in rskf.split(X, y):
        m = LogisticRegression(penalty="l2", C=args.C, solver="liblinear", max_iter=5000)
        m.fit(X.iloc[train_idx], y.iloc[train_idx])
        oof_prob[test_idx] = m.predict_proba(X.iloc[test_idx])[:, 1]

    auc = roc_auc_score(y, oof_prob)
    brier = brier_score_loss(y, oof_prob)

    # Deploy fit
    model = LogisticRegression(penalty="l2", C=args.C, solver="liblinear", max_iter=5000)
    model.fit(X, y)

    intercept = float(model.intercept_[0])
    weights = {fn: float(w) for fn, w in zip(X.columns, model.coef_[0])}

    ordered = list(X.columns)
    variables = [{"id": vid, "name": vid, "weight": weights[vid], "type": "continuous" if vid == "logPSA" else "binary"} for vid in ordered]

    out = {
        "part": "part2",
        "n_used": int(len(y)),
        "prevalence_csPCa": float(y.mean()),
        "auc_oof": float(auc),
        "brier_oof": float(brier),
        "deploy": {
            "intercept": intercept,
            "variables": variables,
            "encodings": {"psaTransform": "log", "piradsMode": "dummies"}
        }
    }

    print("\n===== PART 2 csPCa (GG>=2) REFIT RESULTS =====")
    print(json.dumps(out, indent=2))
    print("\n----- Paste into calculatorConfig.js (part2) -----")
    print(f"intercept: {intercept:.6f},")
    print("encodings: { psaTransform: 'log', piradsMode: 'dummies' },")
    print("variables: [")
    for v in variables:
        print(f"  {{ id: '{v['id']}', name: '{v['id']}', weight: {v['weight']:.6f}, type: '{v['type']}' }},")
    print("],")

if __name__ == "__main__":
    main()