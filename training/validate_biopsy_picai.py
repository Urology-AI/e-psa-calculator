"""
External validation of the deployed ePSA biopsy-risk model (v4) on the public
PI-CAI clinical table (CC BY-NC 4.0 — research/validation use only).

Scores every case with @epsa/engine's own predictBiopsyRisk (via Node) so the
numbers reflect the deployed model, not a hand-copied one. Outcome: case_csPCa
(ISUP >= 2), which matches v4's GG>=2 label.

Get the data (98 KB):
  curl -L -o marksheet.csv https://raw.githubusercontent.com/DIAGNijmegen/picai_labels/main/clinical_information/marksheet.csv

Run from repo root:
  python training/validate_biopsy_picai.py --csv marksheet.csv
"""
from __future__ import annotations
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

REPO = Path(__file__).resolve().parents[1]
ENGINE = REPO / "frontend" / "node_modules" / "@epsa" / "engine" / "src" / "index.js"

NODE_SCORER = """
import { predictBiopsyRisk } from %r;
import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = rows.map(r => {
  const res = predictBiopsyRisk(r.pirads, r.psa, r.volume, r.volume ? r.psa / r.volume : null);
  return res ? { prob: res.prob, version: res.modelVersion } : null;
});
fs.writeFileSync(process.argv[3], JSON.stringify(out));
"""


def max_pirads(s) -> float:
    vals = [int(v) for v in str(s).split(",") if v.strip() in {"1", "2", "3", "4", "5"}]
    return float(max(vals)) if vals else np.nan


def score(rows: list[dict]) -> list[dict | None]:
    with tempfile.TemporaryDirectory() as td:
        inp, out, js = Path(td, "in.json"), Path(td, "out.json"), Path(td, "score.mjs")
        inp.write_text(json.dumps(rows))
        js.write_text(NODE_SCORER % ENGINE.as_uri())
        subprocess.run(["node", str(js), str(inp), str(out)], check=True)
        return json.loads(out.read_text())


def boot_ci(y, p, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    a = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() != y[i].max():
            a.append(roc_auc_score(y[i], p[i]))
    return np.percentile(a, [2.5, 97.5])


def calibration(y, p, bins=5):
    q = pd.qcut(p, bins, duplicates="drop")
    t = pd.DataFrame({"y": y, "p": p, "q": q}).groupby("q", observed=True).agg(n=("y", "size"), observed=("y", "mean"), predicted=("p", "mean"))
    return t.round(3)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--threshold", type=float, default=0.25, help="deployed biopsy threshold")
    a = ap.parse_args()

    d = pd.read_csv(a.csv)
    d["pirads"] = d["lesion_PIRADS"].map(max_pirads)
    d["y"] = (d["case_csPCa"] == "YES").astype(int)
    n0 = len(d)
    d = d[d.pirads.notna() & d.psa.notna() & (d.psa > 0)].copy()
    print(f"cases: {n0} -> {len(d)} with PSA + PI-RADS ({n0 - len(d)} dropped); csPCa {d.y.mean():.1%}")
    d["volume"] = d["prostate_volume"].where(d["prostate_volume"] > 0)

    res = score([{"pirads": r.pirads, "psa": r.psa, "volume": None if pd.isna(r.volume) else r.volume}
                 for r in d.itertuples()])
    d["p"] = [r["prob"] if r else np.nan for r in res]
    d["ver"] = [r["version"] if r else None for r in res]
    d = d[d.p.notna()]
    y, p = d.y.to_numpy(), d.p.to_numpy()

    def row(name, yy, pp):
        lo, hi = boot_ci(yy, pp)
        return f"{name:34s} AUC {roc_auc_score(yy, pp):.3f}  [{lo:.3f}, {hi:.3f}]  n={len(yy)}"

    print("\n--- Discrimination ---")
    print(row("v4 (deployed, all scored)", y, p))
    full = d[d.volume.notna()]
    print(row("v4, volume available only", full.y.to_numpy(), full.p.to_numpy()))
    print(row("PSA alone", y, d.psa.to_numpy()))
    print(row("PI-RADS alone (max)", y, d.pirads.to_numpy()))
    d["psad"] = d.psa / d.volume
    ps = d[d.psad.notna()]
    print(row("PSA density alone", ps.y.to_numpy(), ps.psad.to_numpy()))

    print("\n--- Per-site AUC (v4) ---")
    for c, g in d.groupby("center"):
        print(row(c, g.y.to_numpy(), g.p.to_numpy()))

    print(f"\n--- At deployed threshold {a.threshold} ---")
    pred = p >= a.threshold
    tp, fn = int((pred & (y == 1)).sum()), int((~pred & (y == 1)).sum())
    tn, fp = int((~pred & (y == 0)).sum()), int((pred & (y == 0)).sum())
    print(f"sensitivity {tp / (tp + fn):.3f}  specificity {tn / (tn + fp):.3f}  PPV {tp / max(tp + fp, 1):.3f}  NPV {tn / max(tn + fn, 1):.3f}  biopsies avoided {(~pred).mean():.1%}")

    print("\n--- Calibration (quintiles of predicted risk) ---")
    print(calibration(y, p).to_string())
    print(f"\nmean predicted {p.mean():.3f} vs observed {y.mean():.3f}")
    print("model path counts:", d["ver"].value_counts().to_dict())


if __name__ == "__main__":
    main()
