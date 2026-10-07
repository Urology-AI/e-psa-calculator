/**
 * How the engine's per-tier empirical rate may be shown to a patient.
 *
 * The rates (result.empiricalRate / empiricalRateN / ...) come from a 94-patient
 * biopsied referral cohort and are in-sample: they are not a general screening
 * population and the small tiers are very fragile (the intermediate ePSA tier is
 * N=5). So the rate is only ever displayed with that label, and replaced by
 * "too few patients to estimate" when the tier is too small.
 *
 * This module only decides what to say; it never alters a score or a tier.
 */

/** Size of the referral cohort the tier rates were measured in. */
export const CALIBRATION_COHORT_N = 94;

/** Tiers with fewer patients than this are not shown as a rate. */
export const MIN_TIER_N = 20;

/**
 * TODO(engine 0.2.6): replace the hard-coded MIN_TIER_N with the engine's own
 * reliability flag (read it here, nowhere else), e.g.
 *   if (typeof result.empiricalRateReliable === 'boolean') return result.empiricalRateReliable;
 */
export function isTierEstimateReliable(result) {
  const n = result?.empiricalRateN;
  return Number.isFinite(n) && n >= MIN_TIER_N;
}

const pct = (x) => Math.round(x * 100);

/**
 * @returns {null | {kind: 'rate', key: string, params: object} | {kind: 'insufficient', key: string, params: object}}
 *   null when the result carries no calibration data at all (nothing to show).
 *   `key` is an i18n key under part1Results; `params` are its interpolation values.
 */
export function getCalibrationDisplay(result) {
  if (!result || result.empiricalRateN == null) return null;

  const base = { cohortN: CALIBRATION_COHORT_N };
  const rate = result.empiricalRate;
  if (!isTierEstimateReliable(result) || !Number.isFinite(rate)) {
    return { kind: 'insufficient', key: 'part1Results.empiricalInsufficientText', params: base };
  }

  const params = {
    ...base,
    n: result.empiricalRateN,
    events: result.empiricalRateEvents,
    rate: pct(rate),
  };
  if (Number.isFinite(result.empiricalRateCiLo) && Number.isFinite(result.empiricalRateCiHi)) {
    return {
      kind: 'rate',
      key: 'part1Results.empiricalProbabilityText',
      params: { ...params, ciLo: pct(result.empiricalRateCiLo), ciHi: pct(result.empiricalRateCiHi) },
    };
  }
  return { kind: 'rate', key: 'part1Results.empiricalProbabilityTextNoCi', params };
}
