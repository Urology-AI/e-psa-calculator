import * as functions from 'firebase-functions';
import { z } from 'zod';

// Single source of truth for BOTH the pre-PSA ("should I get a PSA test?")
// decision and the post-PSA/MRI combined-tier decision, shared with
// epsa-screening-tool and e-psa web. iOS calls this instead of carrying its
// own copy of the guideline/scoring logic, so all three surfaces can never
// drift apart again. Part 1 always runs; Part 2 runs in the same call whenever
// PSA data is supplied, so entering a PSA value re-runs both parts together
// exactly like the web app does — never partially stale.

const PrePsaInputSchema = z.object({
  age: z.union([z.number().int().min(18).max(120), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  race: z.enum(['black', 'white', 'asian', 'hispanic', 'other', 'prefer-not-to-say', 'african-american', 'american-indian', 'native-hawaiian', 'unknown']),
  ethnicity: z.enum(['hispanic-latino', 'not-hispanic-latino', 'unknown']).optional(),
  heightFt: z.union([z.number().int().min(1).max(9), z.string(), z.null()]).optional(),
  heightIn: z.union([z.number().int().min(0).max(11), z.string(), z.null()]).optional(),
  heightCm: z.union([z.number().positive(), z.string(), z.null()]).optional(),
  weight: z.union([z.number().positive(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  bmi: z.union([z.number().positive(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  heightUnit: z.enum(['ft', 'cm', 'imperial', 'metric']).optional().transform(val => val === 'imperial' ? 'ft' : val === 'metric' ? 'cm' : val),
  weightUnit: z.enum(['lbs', 'kg']).optional(),
  weightKg: z.union([z.number().positive(), z.string(), z.null()]).optional(),
  familyHistory: z.union([z.number().int().min(0).max(3), z.null()]).transform(val => val === null ? 0 : val),
  // Must match the vocabulary the engine's brcaPositive check actually tests for
  // ('yes'/'lynch'/'other_elevated'/'other_unknown' => positive), NOT an invented
  // brca1/brca2/both scheme — those values silently fail to trigger the +16 anchor
  // since the engine only string-compares against this exact set.
  brcaStatus: z.enum(['yes', 'lynch', 'other_elevated', 'other_unknown', 'no', 'unknown']).optional().transform(val => val || 'unknown'),
  ipss: z.array(z.union([z.number().int().min(0).max(5), z.null()])).transform(arr => arr.map(val => val === null ? 0 : val)),
  shim: z.array(z.union([z.number().int().min(1).max(5), z.null()])).transform(arr => arr.map(val => val === null ? 1 : val)),
  exercise: z.union([z.number().int().min(0).max(2), z.null()]).transform(val => val === null ? 0 : val),
  smoking: z.union([z.number().int().min(0).max(2), z.null()]).optional(),
  // Must match the string vocabulary the engine's _ceStrong/_ceWeak checks test
  // for directly — a plain 0/1 number (the prior shape) matches none of those
  // string comparisons, so chemical-exposure points silently never applied.
  chemicalExposure: z.enum(['agent_orange', 'nine_eleven', 'other_chemical', 'none', 'unknown']).optional(),
  dietPattern: z.enum(['western', 'mediterranean', 'dash', 'plant-based', 'pescatarian', 'low-carb-keto', 'other']).optional().transform(val => val || ''),
  // Count (0-2+) of diagnosed cardiometabolic conditions (hypertension, hyperlipidemia,
  // CAD, diabetes) — the engine's validateInputs() requires this OR all four individual
  // boolean fields; without either, calculateDynamicEPsa() silently returns null and every
  // caller gets a bogus zero/default-tier result instead of a real score or an error.
  comorbidityScore: z.union([z.number().int().min(0).max(2), z.string(), z.null()]).optional().transform(val => {
    if (val === null || val === undefined || val === '') return undefined;
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    return Number.isFinite(n) ? Math.min(2, Math.max(0, n)) : undefined;
  }),
  // Expanded germline panel (HOXB13/ATM/CHEK2/PALB2/Lynch-MMR) — additive to brcaStatus,
  // not double-counted by the engine if both fire. Must match epsaEngine.js's PANEL_GENES
  // vocabulary (case-insensitive): hoxb13, atm, chek2, palb2, lynch, mlh1, msh2, msh6, pms2.
  germlineMutations: z.array(z.string()).optional(),
  // Family history of breast/ovarian/pancreatic cancer — hereditary-syndrome proxy,
  // distinct from familyHistory (which is prostate-specific).
  familyHistoryCancerTypes: z.array(z.enum(['breast', 'ovarian', 'pancreatic'])).optional(),
  // Ashkenazi Jewish ancestry — BRCA1/2 carrier-probability marker.
  ashkenaziJewish: z.union([z.boolean(), z.enum(['yes', 'no'])]).optional().transform(val => val === 'yes' || val === true),
});

const PostPsaInputSchema = z.object({
  psa: z.union([z.number().min(0).max(1000), z.string(), z.null()]).optional(),
  pirads: z.union([z.number().int().min(1).max(5), z.string(), z.null()]).optional(),
  prostateVolume: z.union([z.number().min(5).max(500), z.string(), z.null()]).optional(),
  priorPsa: z.union([z.number().min(0).max(1000), z.string(), z.null()]).optional(),
  onHormonalTherapy: z.boolean().optional(),
  hormonalTherapyType: z.enum(['', 'finasteride', 'dutasteride', 'other']).optional(),
  knowPirads: z.boolean().optional(),
});

const RequestSchema = z.object({
  prePsa: PrePsaInputSchema,
  postPsa: PostPsaInputSchema.optional(),
});

// Maps an age to its AUA_PSA_THRESHOLDS bucket (age45_49/age50_59/age60_69/age70plus).
// Below 45, no AUA age-varying threshold applies.
function auaThresholdForAge(age: number, thresholds: Record<string, { threshold: number }>): { threshold: number } | null {
  if (age >= 70) return thresholds.age70plus;
  if (age >= 60) return thresholds.age60_69;
  if (age >= 50) return thresholds.age50_59;
  if (age >= 45) return thresholds.age45_49;
  return null;
}

/**
 * calculatePsaRecommendation
 *
 * Callable by any authenticated client (web, iOS with Firebase anonymous auth).
 * Runs the exact same @epsa/engine logic used by e-psa web and
 * epsa-screening-tool — clients must never reimplement this decision locally.
 * Always computes Part 1 (pre-PSA); computes Part 2 (post-PSA/PI-RADS combined
 * tier) in the same response whenever `postPsa` is supplied, so both parts stay
 * in lockstep — entering/changing a PSA value re-runs both together.
 */
export const calculatePsaRecommendation = functions.https.onCall(
  async (data: unknown, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    let input;
    try {
      input = RequestSchema.parse(data);
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid PSA input data', error);
    }

    try {
      // Vendored copy of e-psa's own engine (kept in sync with
      // frontend/vendor/epsa-engine/src) — NOT the @epsa/engine npm package,
      // which has fallen behind e-psa's current logic (life-expectancy gate,
      // expanded germline panel, guideline-track scoring, re-screening interval,
      // and a highRiskAnchors bug fix). This backend copy is the single source
      // of truth for iOS and any other non-web client; frontend/vendor is the
      // source of truth for web. Update both together when the engine changes.
      const { calculateDynamicEPsa, checkGuardrails, calculateDynamicEPsaPost, AUA_PSA_THRESHOLDS } = await import('./vendor/epsa-engine/src/index.js');

      const part1 = calculateDynamicEPsa(input.prePsa);
      const guardrails = checkGuardrails(input.prePsa, 'pre_psa');
      const result: { part1: unknown; part2?: unknown } = {
        part1: { ...part1, guardrailAlerts: guardrails.guardrailAlerts || [] },
      };

      if (input.postPsa && input.postPsa.psa !== undefined && input.postPsa.psa !== null && input.postPsa.psa !== '') {
        const part2 = calculateDynamicEPsaPost(part1, input.postPsa);
        const auaThresholdEntry = auaThresholdForAge(input.prePsa.age, AUA_PSA_THRESHOLDS);
        const psaVal = Number(input.postPsa.psa);
        result.part2 = {
          ...part2,
          auaThreshold: auaThresholdEntry?.threshold ?? null,
          psaAboveAuaThreshold: auaThresholdEntry ? psaVal > auaThresholdEntry.threshold : false,
        };
      }

      return result;
    } catch (error) {
      functions.logger.error('calculatePsaRecommendation failed', { error });
      throw new functions.https.HttpsError('internal', 'Failed to calculate recommendation', error);
    }
  }
);
