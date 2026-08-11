import * as functions from 'firebase-functions';
import { z } from 'zod';

/**
 * predictBiopsyRisk
 *
 * Runs the ePSA GG≥2 biopsy-risk model (currently v4) via
 * @urology-ai/epsa-engine's predictBiopsyRisk, as a Firebase callable
 * alongside calculatePsaRecommendation, instead of depending on the
 * standalone Render-hosted FastAPI service, whose free-tier cold starts were
 * causing the "biopsy prediction model temporarily unavailable" errors on
 * the Part 3 results screen.
 *
 * The model is trained/retrained/validated in Urology-AI/biopsy-prediction
 * (source of truth for coefficients); epsa-engine's src/biopsyRisk.js is the
 * single versioned port of it for JS/TS consumers — this file no longer
 * hand-transcribes coefficients, so it can't drift from that port silently.
 */

// Literature-anchored threshold — see Urology-AI/biopsy-prediction's
// model/model.py module docstring for the full derivation against AUA/SUO
// 2026 EDPC Statement 11 / Part II.
const THRESHOLD = 0.25;

const PredictRequestSchema = z.object({
  psa: z.union([z.number().positive(), z.string()]).transform(val => (typeof val === 'string' ? parseFloat(val) : val)),
  pirads: z.union([z.number().int().min(1).max(5), z.string()]).transform(val => (typeof val === 'string' ? parseInt(val, 10) : val)),
  prostateVolume: z.union([z.number().positive(), z.string(), z.null()]).nullable().optional().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return Number.isFinite(n) && n > 0 ? n : null;
  }),
});

export const predictBiopsyRisk = functions.https.onCall(
  async (data: unknown, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    let input;
    try {
      input = PredictRequestSchema.parse(data);
    } catch (error) {
      const issues = error instanceof z.ZodError
        ? error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
        : [];
      throw new functions.https.HttpsError('invalid-argument', 'Invalid biopsy prediction input', { issues });
    }

    if (!Number.isFinite(input.psa) || input.psa <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'PSA must be a positive number');
    }

    // @urology-ai/epsa-engine is the single source of truth for this model
    // (see module docstring above) — no locally re-derived coefficients.
    const { predictBiopsyRisk: predictBiopsyRiskEngine, ENGINE_VERSION, GUIDELINE_VERSION } = await import('@urology-ai/epsa-engine');

    // Client only ever sends prostateVolume, never a raw PSAD — derive it here
    // purely for the informational psadTier display field. It never affects
    // the logit: whenever volume is present the engine always takes the v4
    // (logPSA + logVolume + PI-RADS) path regardless of this value.
    const psad = input.prostateVolume && input.prostateVolume > 0
      ? input.psa / input.prostateVolume
      : null;

    const result = predictBiopsyRiskEngine(input.pirads, input.psa, input.prostateVolume, psad);
    if (!result) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid biopsy prediction input');
    }

    return {
      prob: result.prob,
      percent: result.percent,
      interpretation: result.interpretation,
      tier: result.tier,
      guideline_rate: result.guidelineRate,
      reliable: result.reliable,
      psad: result.psad,
      psad_tier: result.psadTier,
      model_version: result.modelVersion,
      engine_version: ENGINE_VERSION,
      guideline_version: GUIDELINE_VERSION,
      threshold: THRESHOLD,
    };
  }
);
