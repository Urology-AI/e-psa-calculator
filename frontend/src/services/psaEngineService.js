import { httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';
import { functions, auth } from '../config/firebase';

/**
 * Single source of truth for the pre-PSA and post-PSA/MRI recommendation —
 * calls the shared calculatePsaRecommendation Cloud Function instead of
 * computing locally. This is the same callable the iOS app uses
 * (PsaEngineService.swift), so web/iOS/epsa-screening-tool can never
 * silently drift apart on scoring logic again.
 */
const calculatePsaRecommendationFn = httpsCallable(functions, 'calculatePsaRecommendation');

// The callable requires context.auth. Local computation never needed auth, so a
// user reaching Part 1 before UniversalAuth's sign-in flow completes (or via a
// path that never triggers it) previously worked fine and now 401s. iOS already
// guards this (AuthService.shared.ensureSignedIn() before every callable) — this
// mirrors that instead of assuming some other code path already signed them in.
async function ensureSignedIn() {
  if (!auth) throw new Error('Firebase auth is not configured');
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

/**
 * @param {object} prePsa - Part 1 form data (age, race, bmi, ipss, shim, etc.)
 * @param {object} [postPsa] - Part 2 data (psa, pirads, prostateVolume, etc.) — omit to compute Part 1 only
 * @returns {Promise<{part1: object, part2?: object}>}
 */
export const calculatePsaRecommendation = async (prePsa, postPsa) => {
  await ensureSignedIn();
  const payload = { prePsa };
  if (postPsa) payload.postPsa = postPsa;
  const result = await calculatePsaRecommendationFn(payload);
  return result.data;
};

/**
 * Convenience wrapper matching the shape App.jsx/QuickEntry.jsx already expect from
 * the old local calculateDynamicEPsa()/calculateDynamicEPsaPost() pair — returns
 * { preResult, postResult } instead of the callable's raw { part1, part2 }, so call
 * sites migrating off local computation only need to swap the function call itself.
 *
 * @param {object} step1 - Part 1 form data
 * @param {object} [step2] - Part 2 data; only sent (and postResult only computed) if step2.psa has a value
 * @returns {Promise<{preResult: object|null, postResult: object|null}>}
 */
export const computeSessionResults = async (step1, step2) => {
  if (!step1) return { preResult: null, postResult: null };
  const hasPostPsa = step2 && step2.psa !== undefined && step2.psa !== null && step2.psa !== '';
  const { part1, part2 } = await calculatePsaRecommendation(step1, hasPostPsa ? step2 : undefined);
  return { preResult: part1 ?? null, postResult: part2 ?? null };
};
