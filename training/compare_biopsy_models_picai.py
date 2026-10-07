"""
Three-way comparison on the public PI-CAI clinical table (CC BY-NC 4.0):

  1. v4      — the deployed e-Biopsy / e-PSA model (via @epsa/engine)
  2. MSP-RC  — Mount Sinai Prebiopsy Risk Calculator (Parekh/Tewari, Eur Urol
               Open Sci 2022), RECONSTRUCTED from the paper's Table 2 odds
               ratios (no intercept published, so ranking only). PI-CAI has no
               family history / DRE / biopsy history, so those stay at their
               reference level; PI-RADS 4 and 5 share one OR (9.85).
  3. refit   — logistic regression refit on PI-CAI (v4 inputs + age), scored
               out-of-fold with repeated 5-fold CV so it is not graded on its
               own training rows.

Because AUC and "biopsies avoided at fixed sensitivity" depend only on ranking,
the comparison is fair to MSP-RC despite the missing intercept. Brier uses an
out-of-fold intercept+slope calibration for every model.

  python training/compare_biopsy_models_picai.py --csv marksheet.csv
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

L = np.log
NAMES = {"v4": "v4 (deployed)", "msp": "MSP-RC (reconstructed)", "refit": "Refit on PI-CAI (CV)"}


def msp_rc_linear(d: pd.DataFrame) -> np.ndarray:
    """Published csPCa odds ratios, Table 2. FH/DRE/biopsy history at reference."""
    return (L(1.04) * d.patient_age + L(1.18) * d.psa + L(0.98) * d.prostate_volume
            + np.where(d.pi == 3, L(3.46), 0) + np.where(d.pi >= 4, L(9.85), 0))


def msp_rc_any_linear(d: pd.DataFrame) -> np.ndarray:
    """Published any-PCa (GG>=1) odds ratios, Table 2. DRE/biopsy history at reference."""
    return (L(1.03) * d.patient_age + L(1.08) * d.psa + L(0.98) * d.prostate_volume
            + np.where(d.pi == 3, L(2.27), 0) + np.where(d.pi >= 4, L(5.44), 0))


def features(d: pd.DataFrame) -> np.ndarray:
    return pd.DataFrame({"lpsa": L(d.psa.clip(lower=0.01)), "lvol": L(d.prostate_volume.clip(lower=1)),
                      "p3": (d.pi == 3) * 1, "p4": (d.pi == 4) * 1, "p5": (d.pi == 5) * 1,
                      "age": d.patient_age}).to_numpy(float)


def refit_oof(d: pd.DataFrame, y: np.ndarray, repeats: int) -> np.ndarray:
    F = features(d)
    tot, cnt = np.zeros(len(y)), np.zeros(len(y))
    for tr, te in RepeatedStratifiedKFold(n_splits=5, n_repeats=repeats, random_state=1).split(F, y):
        m = LogisticRegression(C=1e6, max_iter=2000).fit(F[tr], y[tr])
        tot[te] += m.decision_function(F[te]); cnt[te] += 1
    return tot / cnt  # out-of-fold logit


def calibrated_brier(score_: np.ndarray, y: np.ndarray, repeats: int) -> float:
    z = np.asarray(score_, float).reshape(-1, 1)
    tot, cnt = np.zeros(len(y)), np.zeros(len(y))
    for tr, te in RepeatedStratifiedKFold(n_splits=5, n_repeats=repeats, random_state=2).split(z, y):
        m = LogisticRegression(C=1e6, max_iter=1000).fit(z[tr], y[tr])
        tot[te] += m.predict_proba(z[te])[:, 1]; cnt[te] += 1
    return brier_score_loss(y, tot / cnt)


def avoided_at_sensitivity(s: np.ndarray, y: np.ndarray, target: float) -> tuple[float, int]:
    """Largest share of men who can skip biopsy while still catching >= target of csPCa."""
    order = np.argsort(-s)  # biopsy highest scores first
    caught = np.cumsum(y[order])
    k = int(np.searchsorted(caught, np.ceil(target * y.sum())) + 1)
    return 1 - k / len(y), int(y.sum() - caught[k - 1])


def boot(y, a, b, n=1500, seed=0):
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() != y[i].max():
            out.append(roc_auc_score(y[i], a[i]) - roc_auc_score(y[i], b[i]))
    return np.percentile(out, [2.5, 97.5])


def auc_ci(y, s, n=1000, seed=0):
    rng = np.random.default_rng(seed)
    b = [roc_auc_score(y[i], s[i]) for i in (rng.integers(0, len(y), len(y)) for _ in range(n)) if y[i].min() != y[i].max()]
    return np.percentile(b, [2.5, 97.5])


def three_outcomes(d: pd.DataFrame, repeats: int) -> None:
    """Same three models on three questions, using PI-CAI's case-level ISUP grade."""
    g = d.case_ISUP.to_numpy()
    print("\n=== Three outcome groups (case ISUP) ===")
    print("  no cancer (ISUP 0): %d | low-grade (ISUP 1): %d | significant (ISUP>=2): %d" % ((g == 0).sum(), (g == 1).sum(), (g >= 2).sum()))
    v4 = np.log(d.v4p / (1 - d.v4p)).to_numpy()
    print("\nMean v4 risk by group:  no cancer %.1f%% | low-grade %.1f%% | significant %.1f%%   (observed share significant = 0 / 0 / 100%%)"
          % tuple(100 * d.v4p[g == k].mean() if k < 2 else 100 * d.v4p[g >= 2].mean() for k in (0, 1, 2)))
    tasks = [
        ("A. Significant vs everything else (GG>=2 vs GG0/1)", np.ones(len(g), bool), (g >= 2).astype(int), msp_rc_linear(d).to_numpy()),
        ("B. Any cancer vs no cancer (GG>=1 vs GG0)", np.ones(len(g), bool), (g >= 1).astype(int), msp_rc_any_linear(d).to_numpy()),
        ("C. Significant vs low-grade only (GG>=2 vs GG1)", g >= 1, (g >= 2).astype(int), msp_rc_linear(d).to_numpy()),
    ]
    print(f"\n{'question':54s} {'v4':>22s} {'MSP-RC (rebuilt)':>22s} {'Refit (CV)':>22s}")
    for name, mask, y_all, msp in tasks:
        dm, y = d[mask], y_all[mask]
        row = []
        for sc in (v4[mask], msp[mask], refit_oof(dm, y, repeats)):
            lo, hi = auc_ci(y, sc)
            row.append(f"{roc_auc_score(y, sc):.3f} [{lo:.3f},{hi:.3f}]")
        print(f"{name:54s} {row[0]:>22s} {row[1]:>22s} {row[2]:>22s}   n={len(y)}, positives={int(y.sum())}")
    print("\nNote: v4 is trained for GG>=2 only; on question B it is used as-is (not an any-cancer model).")
    print("MSP-RC uses its own any-PCa odds ratios for B and its csPCa ones for A and C.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--repeats", type=int, default=20)
    a = ap.parse_args()

    d = pd.read_csv(a.csv)
    d["pi"] = d.lesion_PIRADS.map(max_pirads)
    d["y"] = (d.case_csPCa == "YES").astype(int)
    d = d[d.pi.notna() & d.psa.notna() & (d.psa > 0) & (d.prostate_volume > 0)].copy()
    d["v4p"] = [r["prob"] for r in score([{"pirads": r.pi, "psa": r.psa, "volume": r.prostate_volume} for r in d.itertuples()])]
    y = d.y.to_numpy()
    S = {"v4": np.log(d.v4p / (1 - d.v4p)).to_numpy(), "msp": msp_rc_linear(d).to_numpy(),
         "refit": refit_oof(d, y, a.repeats)}
    print(f"n={len(y)}  csPCa={int(y.sum())} ({y.mean():.1%})  — all men already had an MRI\n")

    print(f"{'model':26s} AUC [95% CI]           Brier(cal)  skip-biopsy @95% sens (missed)  @90% sens (missed)")
    for k, s in S.items():
        rng = np.random.default_rng(0)
        bs = [roc_auc_score(y[i], s[i]) for i in (rng.integers(0, len(y), len(y)) for _ in range(1500)) if y[i].min() != y[i].max()]
        lo, hi = np.percentile(bs, [2.5, 97.5])
        av95, m95 = avoided_at_sensitivity(s, y, 0.95)
        av90, m90 = avoided_at_sensitivity(s, y, 0.90)
        print(f"{NAMES[k]:26s} {roc_auc_score(y, s):.3f} [{lo:.3f}, {hi:.3f}]   {calibrated_brier(s, y, a.repeats):.4f}     "
              f"{av95:5.1%} ({m95:3d})                    {av90:5.1%} ({m90:3d})")

    print("\nPaired AUC differences (bootstrap 95% CI):")
    for x, z in [("refit", "v4"), ("refit", "msp"), ("v4", "msp")]:
        lo, hi = boot(y, S[x], S[z])
        print(f"  {NAMES[x]} minus {NAMES[z]}: {roc_auc_score(y, S[x]) - roc_auc_score(y, S[z]):+.3f}  ({lo:+.3f}, {hi:+.3f})")

    three_outcomes(d, a.repeats)


if __name__ == "__main__":
    main()
