/**
 * Clinical Workspace — batch scoring.
 *
 * Runs each parsed patient through the same shared scoring path as the
 * single-patient Clinician View (computeSessionResults + the biopsy-risk
 * callable), a few at a time so a large cohort doesn't stampede the backend.
 * Results live only in the caller's React state — nothing is persisted here.
 */
import { computeSessionResults } from '../services/psaEngineService';
import { fetchBiopsyPrediction } from '../utils/biopsyApi';
import { classify, predictedProb } from './cohortCompare';

export const DEFAULT_CONCURRENCY = 4;

/** Score one normalised patient. Resolves to a result object; rejects only on transport failure. */
export async function scorePatient(patient, deps = {}) {
  const compute = deps.computeSessionResults || computeSessionResults;
  const biopsy = deps.fetchBiopsyPrediction || fetchBiopsyPrediction;
  const { part1, part2 } = patient;

  const { preResult, postResult } = await compute(part1, part2 || undefined);
  if (!preResult) throw new Error('Part 1 could not be scored — check the inputs');
  if (part2 && !postResult) throw new Error('Part 2 could not be scored — check PSA / PI-RADS');

  let part2Interim = null;
  let part3 = null;
  let part2Final = null;
  if (part2) {
    if (part1.pathwayMode === 'post_mri') {
      // Same two-step the wizard shows: PSA-only interim, then PSA + MRI.
      part2Interim = (await compute(part1, { ...part2, pathwayMode: 'post_psa' })).postResult;
      part3 = { ...postResult };
      const psa = Number(part2.psa);
      const volume = Number(part2.prostateVolume);
      try {
        part3.apiPrediction = await biopsy({
          psa,
          pirads: Number(part2.pirads),
          prostateVolume: Number.isFinite(volume) && volume > 0 ? volume : null,
        });
      } catch {
        part3.apiPrediction = null;
        part3.apiPredictionFailed = true;
      }
    } else {
      part2Final = postResult;
    }
  }
  return { part1: preResult, part2: part2Final || part2Interim, part3 };
}

/**
 * Run `patients` with bounded concurrency. `onUpdate(id, patch)` fires as each
 * patient moves running -> done/error. Patients with blocking input issues are
 * marked error without calling the backend. `signal` cancels pending work.
 */
export async function runCohort(patients, { onUpdate, signal, concurrency = DEFAULT_CONCURRENCY, deps } = {}) {
  const queue = patients.filter((p) => p.status !== 'done');
  let next = 0;
  const worker = async () => {
    while (next < queue.length && !signal?.aborted) {
      const p = queue[next]; next += 1;
      if (p.issues.length > 0) {
        onUpdate?.(p.uid, { status: 'error', error: p.issues.join('; ') });
        continue;
      }
      onUpdate?.(p.uid, { status: 'running', error: null });
      try {
        const results = await scorePatient(p, deps);
        onUpdate?.(p.uid, { status: 'done', results, error: null });
      } catch (err) {
        onUpdate?.(p.uid, { status: 'error', error: err?.message || 'Scoring failed' });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
}

/** One CSV row per patient — answers + all three parts — for the cohort export. */
export function buildCohortCsvRows(patients) {
  return patients.map((p) => {
    const f = p.part1;
    const r = p.results || {};
    const p2 = r.part2 || {};
    const p3 = r.part3 || {};
    const bp = p3.apiPrediction || {};
    return {
      patientId: p.id,
      source: p.source,
      status: p.status,
      error: p.error || '',
      assumedDefaults: p.assumed.join('|'),
      age: f.age ?? '',
      race: f.race ?? '',
      bmi: f.bmi ?? '',
      ipssTotal: Array.isArray(f.ipss) ? f.ipss.reduce((s, v) => s + (v ?? 0), 0) : '',
      shimTotal: Array.isArray(f.shim) ? f.shim.reduce((s, v) => s + (v ?? 0), 0) : '',
      familyHistory: f.familyHistory ?? '',
      brcaStatus: f.brcaStatus ?? '',
      part1Score: r.part1?.score ?? '',
      part1Tier: r.part1?.tierRisk ?? r.part1?.risk ?? '',
      part1RecommendPSA: r.part1?.recommendPSA ?? '',
      psa: p.part2?.psa ?? '',
      prostateVolume: p.part2?.prostateVolume ?? '',
      pirads: p.part2?.knowPirads ? p.part2.pirads : '',
      part2RiskPct: p2.riskPct ?? '',
      part2RiskClass: p2.riskClass ?? '',
      part3RiskPct: p3.riskPct ?? '',
      part3RiskClass: p3.riskClass ?? '',
      part3BiopsyProbPct: bp.percent ?? '',
      modelVersion: r.part1?.modelVersion ?? '',
      predictedGG2Prob: predictedProb(p)?.prob ?? '',
      predictedGG2Positive: predictedProb(p) ? predictedProb(p).prob >= predictedProb(p).threshold : '',
      actualGG: p.actual?.gg ?? '',
      actualGG2Positive: p.actual?.gg2 ?? '',
      cribriform: p.actual?.cribriform ?? '',
      agreement: classify(p) ?? '',
    };
  });
}
