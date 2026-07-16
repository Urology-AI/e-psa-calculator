/**
 * Shared form helpers used by both ClinicalModeFlow (fast/proxy mode)
 * and Part1Form (full mode). Centralises the mappings so both flows
 * produce identical formData shapes for the engine and REDCap.
 */

export const FH_MAP = { none: 0, one: 1, two_plus: 2, unknown: 'unknown' };
export const DIET_MAP = { red_meat: 'western', mixed: 'other', plant: 'plant-based' };

/**
 * Maps the single IPSS Quality-of-Life question (0–6) to a 7-item IPSS
 * array used by the engine. Clinical Mode uses this proxy; Part1Form
 * collects each of the 7 items individually.
 */
export function deriveIpssFromQol(qol) {
  const q = Number(qol);
  // Bins must stay consistent with the engine's IPSS severity thresholds:
  // mild 0–7, moderate 8–19, severe 20–35 (sum of 7 items, each 0–5).
  if (q <= 1) return [1, 1, 1, 1, 1, 1, 1]; // total 7 — mild
  if (q <= 3) return [2, 2, 2, 2, 2, 2, 2]; // total 14 — moderate
  return [5, 5, 5, 5, 5, 5, 5]; // total 35 — severe
}

/**
 * Expands a single SHIM score (1–5) into the 5-item array the engine
 * expects. Clinical Mode collects one question; Part1Form collects all 5.
 */
export function expandShimSingle(val) {
  const v = Number(val);
  return [v, v, v, v, v];
}
