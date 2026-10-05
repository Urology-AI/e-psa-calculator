"""Tests for compare_biopsy_models_picai.py. Run: python -m pytest training/test_compare_biopsy_models_picai.py"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent))
from compare_biopsy_models_picai import avoided_at_sensitivity, msp_rc_any_linear, msp_rc_linear  # noqa: E402


def test_avoided_at_sensitivity_perfect_ranking():
    y = np.array([1, 1, 1, 1, 0, 0, 0, 0, 0, 0])
    s = np.array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0], float)  # all cancers ranked first
    avoided, missed = avoided_at_sensitivity(s, y, 1.0)
    assert avoided == pytest.approx(0.6) and missed == 0


def test_avoided_at_sensitivity_random_ranking_avoids_little():
    rng = np.random.default_rng(0)
    y = (rng.random(2000) < 0.3).astype(int)
    avoided, _ = avoided_at_sensitivity(rng.random(2000), y, 0.95)
    assert avoided < 0.15  # an uninformative score cannot skip many biopsies at 95% sensitivity


def test_avoided_at_sensitivity_reports_missed_within_target():
    rng = np.random.default_rng(1)
    y = (rng.random(500) < 0.3).astype(int)
    _, missed = avoided_at_sensitivity(rng.random(500) + y * 0.8, y, 0.90)
    assert missed <= int(np.floor(0.10 * y.sum())) + 1


@pytest.mark.parametrize("fn", [msp_rc_linear, msp_rc_any_linear])
def test_msp_rc_increases_with_pirads_psa_and_age_and_falls_with_volume(fn):
    base = dict(patient_age=65, psa=7.0, prostate_volume=50.0, pi=2)
    mk = lambda **kw: pd.DataFrame([{**base, **kw}])
    b = fn(mk())[0]
    assert fn(mk(pi=3))[0] > b and fn(mk(pi=4))[0] > fn(mk(pi=3))[0]
    assert fn(mk(psa=12.0))[0] > b and fn(mk(patient_age=75))[0] > b
    assert fn(mk(prostate_volume=90.0))[0] < b


def test_msp_rc_pirads_4_and_5_share_one_odds_ratio():
    mk = lambda pi: pd.DataFrame([dict(patient_age=65, psa=7.0, prostate_volume=50.0, pi=pi)])
    assert msp_rc_linear(mk(4))[0] == msp_rc_linear(mk(5))[0]  # paper pools PI-RADS 4-5
