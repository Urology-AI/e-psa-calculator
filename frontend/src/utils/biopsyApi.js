import { httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';
import { functions, auth } from '../config/firebase';

/**
 * Client for the ePSA GG≥2 biopsy-risk model (v4). Runs as a Firebase callable
 * (predictBiopsyRisk) — ported from the standalone Urology-AI/biopsy-prediction
 * FastAPI service (model/model.py) so Part 3 isn't dependent on that service's
 * Render free-tier cold starts, which were the source of the
 * "biopsy prediction model temporarily unavailable" errors.
 */
const predictBiopsyRiskFn = httpsCallable(functions, 'predictBiopsyRisk');

// Mirrors psaEngineService.js's ensureSignedIn — the callable requires
// context.auth, so make sure anonymous auth has completed before calling it.
async function ensureSignedIn() {
  if (!auth) throw new Error('Firebase auth is not configured');
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

/**
 * @param {{psa: number, pirads: number, prostateVolume?: number|null}} params
 * @returns {Promise<{prob:number, percent:number, interpretation:string, guideline_rate:string, reliable:boolean, psad:number|null, psad_tier:string|null, model_version:string, threshold:number}>}
 */
export async function fetchBiopsyPrediction({ psa, pirads, prostateVolume }) {
  await ensureSignedIn();
  const result = await predictBiopsyRiskFn({
    psa,
    pirads,
    prostateVolume: prostateVolume != null && prostateVolume > 0 ? prostateVolume : null,
  });
  return result.data;
}
