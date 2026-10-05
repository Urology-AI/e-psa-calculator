"""
Fit a logistic recalibration (intercept + slope on the logit) of the deployed
biopsy-risk model (v4) using the public PI-CAI clinical table, and report what
it would change. Nothing is deployed by this script.

    p' = sigmoid(a + b * logit(p_v4))

Only the 1,439 PI-CAI cases that take the full v4 path (PSA + volume + PI-RADS)
are used. Reports cross-validated Brier/AUC/calibration, bootstrap CIs on a and
b, and how the engine's four output tiers (cutoffs 0.15 / 0.25 / 0.45) migrate.

PI-CAI is CC BY-NC 4.0 and a Dutch/Norwegian cohort: treat the fitted a, b as a
candidate to re-check on local (Mount Sinai) data, not as a deployable change.

  python training/recalibrate_biopsy_picai.py --csv marksheet.csv
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold

sys.path.insert(0, str(Path(__file__).parent))
from validate_biopsy_picai import max_pirads, score  # noqa: E402

CUTS = [0.15, 0.25, 0.45]
TIERS = ["Not indicated", "Monitoring", "Discussion", "Recommended"]


def logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def fit_ab(z, y):
    m = LogisticRegression(C=1e6, max_iter=1000).fit(z.reshape(-1, 1), y)
    return float(m.intercept_[0]), float(m.coef_[0][0])


def apply_ab(z, a, b):
    return 1 / (1 + np.exp(-(a + b * z)))


def tier(p):
    return np.digitize(p, CUTS)


def quintiles(y, p):
    q = pd.qcut(p, 5, duplicates="drop")
    return pd.DataFrame({"y": y, "p": p}).groupby(q, observed=True).agg(n=("y", "size"), observed=("y", "mean"), predicted=("p", "mean")).round(3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--repeats", type=int, default=20)
    a_ = ap.parse_args()

    d = pd.read_csv(a_.csv)
    d["pirads"] = d["lesion_PIRADS"].map(max_pirads)
    d["y"] = (d["case_csPCa"] == "YES").astype(int)
    d = d[d.pirads.notna() & d.psa.notna() & (d.psa > 0) & (d.prostate_volume > 0)].copy()
    res = score([{"pirads": r.pirads, "psa": r.psa, "volume": r.prostate_volume} for r in d.itertuples()])
    d["p0"] = [r["prob"] for r in res]
    y, p0 = d.y.to_numpy(), d.p0.to_numpy()
    z = logit(p0)
    print(f"n={len(y)}  csPCa {y.mean():.1%}")

    # Cross-validated comparison
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=a_.repeats, random_state=1)
    oof, cnt = np.zeros(len(y)), np.zeros(len(y))
    for tr, te in cv.split(z, y):
        a, b = fit_ab(z[tr], y[tr])
        oof[te] += apply_ab(z[te], a, b)
        cnt[te] += 1
    p1_cv = oof / cnt
    print("\n--- Cross-validated ---")
    for name, p in [("v4 as deployed", p0), ("v4 recalibrated (CV)", p1_cv)]:
        print(f"{name:24s} AUC {roc_auc_score(y, p):.3f}  Brier {brier_score_loss(y, p):.4f}  mean pred {p.mean():.3f} (obs {y.mean():.3f})")
    print("\nCalibration, deployed v4:\n" + quintiles(y, p0).to_string())
    print("\nCalibration, recalibrated (CV):\n" + quintiles(y, p1_cv).to_string())

    # Final fit on all data + bootstrap CI
    a, b = fit_ab(z, y)
    rng = np.random.default_rng(0)
    boots = np.array([fit_ab(z[i], y[i]) for i in (rng.integers(0, len(y), len(y)) for _ in range(500))])
    lo, hi = np.percentile(boots, [2.5, 97.5], axis=0)
    print(f"\n--- Fitted on all {len(y)} cases ---")
    print(f"intercept a = {a:.3f}  (95% CI {lo[0]:.3f}, {hi[0]:.3f})")
    print(f"slope     b = {b:.3f}  (95% CI {lo[1]:.3f}, {hi[1]:.3f})   [b>1 = original probabilities too compressed; b<1 = too extreme]")

    # What the 3 deployed cutoffs mean after recalibration
    p1 = apply_ab(z, a, b)
    print("\nDeployed cutoff -> equivalent recalibrated risk:")
    for c in CUTS:
        print(f"  {c:.2f} -> {apply_ab(logit(np.array([c])), a, b)[0]:.3f}")

    # Tier migration if the same cutoffs were applied to recalibrated probabilities
    t0, t1 = tier(p0), tier(p1)
    mig = pd.crosstab(pd.Series(t0, name="deployed").map(dict(enumerate(TIERS))),
                      pd.Series(t1, name="recalibrated").map(dict(enumerate(TIERS))))
    print("\nTier migration (same 0.15/0.25/0.45 cutoffs on recalibrated risk):\n" + mig.to_string())
    for name, t in [("deployed", t0), ("recalibrated", t1)]:
        flagged = t >= 2
        print(f"{name:13s} biopsy-discussion or higher: {flagged.mean():.1%}  sens {flagged[y == 1].mean():.3f}  spec {(~flagged)[y == 0].mean():.3f}")


if __name__ == "__main__":
    main()
