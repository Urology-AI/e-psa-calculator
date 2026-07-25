import * as functions from 'firebase-functions';
import { z } from 'zod';

/**
 * predictBiopsyRisk
 *
 * TypeScript port of the ePSA GG≥2 biopsy-risk model (model/model.py,
 * Urology-AI/biopsy-prediction). Ported so this can run as a Firebase
 * callable alongside calculatePsaRecommendation instead of depending on the
 * standalone Render-hosted FastAPI service, whose free-tier cold starts were
 * causing the "biopsy prediction model temporarily unavailable" errors on
 * the Part 3 results screen.
 *
 * The model itself is closed-form logistic regression on frozen
 * coefficients — no scikit-learn/runtime ML dependency, just arithmetic —
 * so the port is a direct line-for-line translation. Coefficients are
 * retrained in the Python repo (source of truth for training); when they
 * change, update this file to match model/model.py by hand.
 *
 * v4: N=126, Mount Sinai biopsy registry, 39.7% GG≥2 prevalence, AUC OOF
 * 0.7389, retrained 2026-07-02. Predictors: logPSA + logVolume + PI-RADS
 * dummies (ref: PI-RADS 1-2). Falls back to v3 (logPSA + PSAD + PI-RADS)
 * when volume is unavailable but PSAD is, or v2 (logPSA + PI-RADS only)
 * when neither is available.
 */

// AUA 2026 Table 5 population-level GG≥2 detection rates by PI-RADS
// (pooled 23 studies; AUA/SUO EDPC 2026 p.21)
const GUIDELINE_RATES: Record<number, string> = {
  1: '7% (95%CI 4–11%)',
  2: '7% (95%CI 4–11%)',
  3: '11% (95%CI 8–14%)',
  4: '37% (95%CI 33–40%)',
  5: '70% (95%CI 62–79%)',
};

const RELIABLE_PIRADS = new Set([4, 5]);

// Literature-anchored threshold — see model/model.py module docstring for
// the full derivation against AUA/SUO 2026 EDPC Statement 11 / Part II.
const THRESHOLD = 0.25;

interface ModelResult {
  prob: number;
  percent: number;
  interpretation: string;
  guidelineRate: string;
  reliable: boolean;
  psad: number | null;
  psadTier: string | null;
  modelVersion: string;
}

function predict(pirads: number, psa: number, prostateVolumeCc: number | null): ModelResult {
  const pirads3 = pirads === 3 ? 1 : 0;
  const pirads4 = pirads === 4 ? 1 : 0;
  const pirads5 = pirads === 5 ? 1 : 0;
  const logPsa = Math.log(Math.max(psa, 0.01));

  const psad = prostateVolumeCc && prostateVolumeCc > 0 ? psa / prostateVolumeCc : null;

  let logit: number;
  let modelVersion: string;

  if (prostateVolumeCc !== null) {
    // v4 — logPSA + logVolume + PI-RADS
    const logVol = Math.log(Math.max(prostateVolumeCc, 1.0));
    logit =
      0.928327 +
      0.234065 * logPsa +
      -0.693935 * logVol +
      -0.274166 * pirads3 +
      0.953916 * pirads4 +
      1.898259 * pirads5;
    modelVersion = 'v4 (PSA + volume + PI-RADS)';
  } else if (psad !== null) {
    // v3 fallback — logPSA + PSAD + PI-RADS (volume unavailable)
    logit =
      -1.485772 +
      0.145017 * logPsa +
      0.942349 * psad +
      -1.181514 * pirads3 +
      0.468079 * pirads4 +
      0.735267 * pirads5;
    modelVersion = 'v3 fallback (PSA + PSAD + PI-RADS)';
  } else {
    // v2 fallback when neither volume nor PSAD is available
    logit =
      -1.526236 +
      0.260607 * logPsa +
      -1.200596 * pirads3 +
      0.424159 * pirads4 +
      0.792264 * pirads5;
    modelVersion = 'v2 fallback (PSA + PI-RADS)';
  }

  const prob = 1 / (1 + Math.exp(-logit));
  const percent = Math.round(prob * 1000) / 10;

  // Bands calibrated to 39.7% GG≥2 prevalence, anchored to THRESHOLD (0.25)
  let interpretation: string;
  if (prob < 0.15) {
    interpretation = 'Low GG≥2 risk';
  } else if (prob < THRESHOLD) {
    interpretation = 'Below-average GG≥2 risk';
  } else if (prob < 0.45) {
    interpretation = 'Intermediate GG≥2 risk — biopsy recommended';
  } else {
    interpretation = 'Elevated GG≥2 risk — biopsy strongly recommended';
  }

  // PSAD tier (AUA 2026 Statement 16) — informational only, not used in logit
  let psadTier: string | null = null;
  if (psad !== null) {
    if (psad < 0.1) {
      psadTier = 'Low (<0.10) — biopsy may be deferred (NPV 94%)';
    } else if (psad < 0.15) {
      psadTier = 'Borderline (0.10–0.15)';
    } else {
      psadTier = 'Elevated (≥0.15) — supports biopsy';
    }
  }

  return {
    prob,
    percent,
    interpretation,
    guidelineRate: GUIDELINE_RATES[pirads] ?? '—',
    reliable: RELIABLE_PIRADS.has(pirads),
    psad: psad !== null ? Math.round(psad * 1000) / 1000 : null,
    psadTier,
    modelVersion,
  };
}

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

    const result = predict(input.pirads, input.psa, input.prostateVolume);

    return {
      prob: result.prob,
      percent: result.percent,
      interpretation: result.interpretation,
      guideline_rate: result.guidelineRate,
      reliable: result.reliable,
      psad: result.psad,
      psad_tier: result.psadTier,
      model_version: result.modelVersion,
      threshold: THRESHOLD,
    };
  }
);
