/**
 * Clinical Workspace — predicted vs actual biopsy outcome.
 *
 * "Predicted positive" means the Part 3 biopsy model's P(GG≥2) is at or above
 * its own decision threshold (returned by the model; 0.5 only if absent).
 * "Actual positive" means biopsy pathology showed Grade Group ≥ 2.
 * Only patients with both a prediction and a known outcome are compared.
 */

const FALLBACK_THRESHOLD = 0.5;

/** Model probability (0–1) and threshold for a scored patient, or null. */
export function predictedProb(p) {
  const bp = p.results?.part3?.apiPrediction;
  if (!bp || !Number.isFinite(Number(bp.prob))) return null;
  return { prob: Number(bp.prob), threshold: Number.isFinite(Number(bp.threshold)) ? Number(bp.threshold) : FALLBACK_THRESHOLD, reliable: bp.reliable !== false };
}

/** 'TP' | 'FP' | 'TN' | 'FN' | null for one patient. */
export function classify(p) {
  const pred = predictedProb(p);
  const actual = p.actual?.gg2;
  if (!pred || actual === null || actual === undefined) return null;
  const positive = pred.prob >= pred.threshold;
  if (positive) return actual ? 'TP' : 'FP';
  return actual ? 'FN' : 'TN';
}

/** Area under the ROC curve via the rank-sum statistic; null if one class is absent. */
export function auc(scores, labels) {
  const pos = []; const neg = [];
  scores.forEach((s, i) => (labels[i] ? pos : neg).push(s));
  if (!pos.length || !neg.length) return null;
  let wins = 0;
  for (const a of pos) for (const b of neg) wins += a > b ? 1 : a === b ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

const ratio = (n, d) => (d > 0 ? n / d : null);

/** Cohort-level agreement summary across every patient with prediction + outcome. */
export function summariseComparison(patients) {
  const c = { TP: 0, FP: 0, TN: 0, FN: 0 };
  const scores = []; const labels = [];
  let withOutcome = 0;
  for (const p of patients) {
    if (p.actual?.gg2 !== null && p.actual?.gg2 !== undefined) withOutcome += 1;
    const k = classify(p);
    if (!k) continue;
    c[k] += 1;
    scores.push(predictedProb(p).prob);
    labels.push(p.actual.gg2);
  }
  const n = c.TP + c.FP + c.TN + c.FN;
  const meanPredicted = n ? scores.reduce((s, v) => s + v, 0) / n : null;
  const observed = n ? (c.TP + c.FN) / n : null;
  return {
    withOutcome, compared: n, ...c,
    accuracy: ratio(c.TP + c.TN, n),
    sensitivity: ratio(c.TP, c.TP + c.FN),
    specificity: ratio(c.TN, c.TN + c.FP),
    ppv: ratio(c.TP, c.TP + c.FP),
    npv: ratio(c.TN, c.TN + c.FN),
    auc: auc(scores, labels),
    meanPredicted, observed,
  };
}
