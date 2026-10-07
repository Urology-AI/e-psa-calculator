"""Tests for validate_biopsy_picai.py. Run: python -m pytest training/test_validate_biopsy_picai.py"""
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent))
from validate_biopsy_picai import ENGINE, boot_ci, calibration, max_pirads, score  # noqa: E402

needs_engine = pytest.mark.skipif(not ENGINE.exists(), reason="frontend deps not installed")


@pytest.mark.parametrize("raw,expected", [
    ("4", 4.0), ("5,2", 5.0), ("2,4,3", 4.0), ("5,N/A", 5.0), ("2,2,2,5", 5.0),
    ("N/A", math.nan), ("", math.nan), (None, math.nan), (float("nan"), math.nan),
    ("0", math.nan), ("6", math.nan),
])
def test_max_pirads(raw, expected):
    got = max_pirads(raw)
    assert (math.isnan(got) and math.isnan(expected)) or got == expected


@needs_engine
def test_engine_matches_independent_v4_calculation():
    # Same v4 coefficients, re-derived here only as a cross-check of the Node bridge.
    psa, vol, pirads = 7.7, 55.0, 4
    logit = 0.928327 + 0.234065 * math.log(psa) - 0.693935 * math.log(vol) + 0.953916
    expected = 1 / (1 + math.exp(-logit))
    (res,) = score([{"pirads": pirads, "psa": psa, "volume": vol}])
    assert res["prob"] == pytest.approx(expected, abs=1e-9)
    assert res["version"].startswith("v4")


@needs_engine
def test_fallback_and_invalid_inputs():
    rows = [
        {"pirads": 3, "psa": 5.0, "volume": None},   # no volume -> v2 fallback
        {"pirads": 9, "psa": 5.0, "volume": 50.0},   # invalid PI-RADS
        {"pirads": 4, "psa": 0.0, "volume": 50.0},   # invalid PSA
    ]
    a, b, c = score(rows)
    assert a["version"].startswith("v2")
    assert b is None and c is None


@needs_engine
def test_risk_increases_with_pirads_and_psa():
    probs = [r["prob"] for r in score([{"pirads": k, "psa": 8.0, "volume": 50.0} for k in (2, 3, 4, 5)])]
    assert probs[2] < probs[3] and probs[0] < probs[2]
    lo, hi = (r["prob"] for r in score([{"pirads": 4, "psa": p, "volume": 50.0} for p in (3.0, 20.0)]))
    assert lo < hi


def test_boot_ci_brackets_auc_and_is_ordered():
    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 400)
    p = y * 0.6 + rng.random(400) * 0.8
    lo, hi = boot_ci(y, p, n=300)
    from sklearn.metrics import roc_auc_score
    assert lo < roc_auc_score(y, p) < hi


def test_calibration_quintiles_are_monotone_for_calibrated_input():
    rng = np.random.default_rng(1)
    p = rng.random(5000)
    y = (rng.random(5000) < p).astype(int)
    t = calibration(y, p)
    assert t["observed"].is_monotonic_increasing
    assert (t["observed"] - t["predicted"]).abs().max() < 0.06


def test_script_handles_sample_rows_end_to_end(tmp_path, capsys):
    if not ENGINE.exists():
        pytest.skip("frontend deps not installed")
    import validate_biopsy_picai as v
    rng = np.random.default_rng(2)
    n = 300
    pir = rng.choice([1, 2, 3, 4, 5], n)
    psa = rng.lognormal(2, 0.5, n)
    y = rng.random(n) < (0.05 + 0.15 * (pir - 1))
    pd.DataFrame({
        "psa": psa, "prostate_volume": rng.uniform(30, 90, n),
        "lesion_PIRADS": [f"{p},2" for p in pir],
        "case_csPCa": np.where(y, "YES", "NO"),
        "center": rng.choice(["A", "B"], n),
    }).to_csv(tmp_path / "m.csv", index=False)
    sys.argv = ["x", "--csv", str(tmp_path / "m.csv")]
    v.main()
    out = capsys.readouterr().out
    assert "Discrimination" in out and "Calibration" in out and "AUC" in out
