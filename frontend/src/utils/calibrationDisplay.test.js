import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  getCalibrationDisplay, isTierEstimateReliable, MIN_TIER_N, CALIBRATION_COHORT_N,
} from './calibrationDisplay';

const here = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(here, '../i18n/locales/en/translation.json'), 'utf8'));

// Minimal i18next-style interpolation so the test checks the real English copy.
const render = ({ key, params }) => {
  const [ns, k] = key.split('.');
  return en[ns][k].replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in params)) throw new Error(`missing interpolation param ${name} for ${key}`);
    return String(params[name]);
  });
};

const tier = (over) => ({
  empiricalRate: 0.28, empiricalRateCiLo: 0.19, empiricalRateCiHi: 0.39,
  empiricalRateN: 75, empiricalRateEvents: 21, ...over,
});

describe('getCalibrationDisplay', () => {
  it('shows the rate with the referral-cohort label when N is large enough', () => {
    const d = getCalibrationDisplay(tier());
    expect(d.kind).toBe('rate');
    const text = render(d);
    expect(text).toContain(`small referral cohort of ${CALIBRATION_COHORT_N} patients, not a general screening population`);
    expect(text).toContain('21 of 75');
    expect(text).toContain('28%');
    expect(text).toContain('19%–39%');
  });

  it('replaces the rate with "too few patients to estimate" below the minimum N', () => {
    for (const n of [0, 5, 14, MIN_TIER_N - 1]) {
      const d = getCalibrationDisplay(tier({ empiricalRateN: n, empiricalRate: 0.2 }));
      expect(d.kind).toBe('insufficient');
      const text = render(d);
      expect(text).toContain('too few patients');
      expect(text).toContain('not a general screening population');
      expect(text).not.toMatch(/\d+%/);
    }
  });

  it('shows the rate exactly at the minimum N', () => {
    expect(getCalibrationDisplay(tier({ empiricalRateN: MIN_TIER_N })).kind).toBe('rate');
  });

  it('treats a null rate (no data in the cohort) as insufficient', () => {
    expect(getCalibrationDisplay(tier({ empiricalRate: null, empiricalRateN: 40 })).kind).toBe('insufficient');
  });

  it('omits the CI wording when the result has no interval (Part 2 shape)', () => {
    const d = getCalibrationDisplay({ empiricalRate: 0.21, empiricalRateN: 58, empiricalRateEvents: 12 });
    expect(d.key).toBe('part1Results.empiricalProbabilityTextNoCi');
    expect(render(d)).not.toContain('CI');
  });

  it('returns null when there is no calibration data at all', () => {
    expect(getCalibrationDisplay(null)).toBeNull();
    expect(getCalibrationDisplay({})).toBeNull();
  });

  it('flags the fragile intermediate tier (N=5, as shipped by the engine) as unreliable', () => {
    expect(isTierEstimateReliable({ empiricalRateN: 5 })).toBe(false);
  });
});

describe('English calibration copy', () => {
  it('no longer calls the cohort a "validation study"', () => {
    for (const k of ['empiricalProbabilityText', 'empiricalProbabilityTextNoCi', 'empiricalInsufficientText']) {
      expect(en.part1Results[k]).toBeTruthy();
      expect(en.part1Results[k]).not.toMatch(/validation/i);
    }
  });
});
