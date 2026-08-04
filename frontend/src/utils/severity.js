/**
 * Maps an engine itemImpacts point value to a High/Medium/Low severity label.
 * The exact point values (and the model's rationale text) should never be
 * shown to end users — this bucketing lets result screens say "this was a
 * high-impact factor" without exposing the underlying scoring weights.
 *
 * Buckets follow the engine's own anchor scale (see epsaEngine.js comments):
 *   High   >= 10 pts  (age 70+/60-69, family history, BRCA/germline panel, SHIM<12)
 *   Medium  4-9 pts   (IPSS>=8, Black ancestry, current smoker, age 50-59, BMI>=30,
 *                       no exercise, western diet, chemical exposure strong,
 *                       Ashkenazi ancestry, hereditary cancer family history)
 *   Low     1-3 pts   (former smoker, some exercise, chemical exposure weak)
 *   null    0 pts     (factor not present / did not contribute)
 */
export function pointsToSeverity(points) {
  if (!Number.isFinite(points) || points <= 0) return null;
  if (points >= 10) return 'high';
  if (points >= 4) return 'medium';
  return 'low';
}

export const SEVERITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Strips point values from an engine itemImpacts array, replacing them with
 * a severity bucket. Use this instead of rendering item.points directly.
 * @param {Array<{item: string, value: string, points: number}>} itemImpacts
 * @returns {Array<{item: string, value: string, severity: 'high'|'medium'|'low'|null}>}
 */
export function toSeverityBreakdown(itemImpacts) {
  return (itemImpacts || [])
    .map(({ item, value, points }) => ({ item, value, severity: pointsToSeverity(points) }))
    .filter((row) => row.severity !== null);
}

/**
 * Normalizes each factor's raw points into a share of the total positive
 * score, as a whole-number percent (e.g. "PSA" +22). Clinical-only — Patient
 * view must keep using pointsToSeverity's qualitative tiers instead.
 * @param {Array<{item: string, points: number}>} itemImpacts
 * @returns {Map<string, number>} item name -> contribution percent
 */
export function toContributionPct(itemImpacts) {
  const positive = (itemImpacts || []).filter((i) => Number.isFinite(Number(i.points)) && Number(i.points) > 0);
  const total = positive.reduce((sum, i) => sum + Number(i.points), 0);
  const map = new Map();
  if (total <= 0) return map;
  positive.forEach((i) => {
    map.set(i.item, Math.round((Number(i.points) / total) * 100));
  });
  return map;
}
