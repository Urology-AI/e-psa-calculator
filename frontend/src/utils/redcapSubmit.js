/**
 * REDCap API submission via Cloud Function.
 *
 * SECURITY: The REDCap API token must NEVER appear in frontend code or VITE_* env vars.
 * All REDCap calls are proxied through the `submitRedcap` Cloud Function which holds
 * the token in Firebase Functions secrets (firebase functions:secrets:set REDCAP_TOKEN).
 *
 * Only non-sensitive record data is sent to the Cloud Function; the token is never
 * transmitted to or from the browser.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Map Quick ePSA answers + engine result → REDCap flat record.
 * All field names must match your REDCap instrument data dictionary exactly.
 */
function buildRecord(answers, engineResult, consentTimestamp) {
  const { epsaTierKey, epsaTierLabel, recommendPSA, psaRecommendMessage,
          calculationDetails, score } = engineResult;

  // REDCap requires a unique record_id per submission.
  // Using timestamp + random suffix avoids collisions without PII.
  const record_id = `bus_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    record_id,

    // Consent
    qepsa_consent: '1',
    qepsa_consent_timestamp: consentTimestamp,
    qepsa_study_id: 'STUDY-14-00050',

    // Demographics
    qepsa_age:  answers.age,
    qepsa_race: answers.race,

    // Clinical inputs
    qepsa_family_history: answers.familyHistory,
    qepsa_qol_score:      answers.qol,
    qepsa_shim_q1:        answers.shim,
    qepsa_exercise:       answers.exercise,
    qepsa_smoking:        answers.smoking,
    qepsa_diet:           answers.diet,
    qepsa_bmi:            answers.bmi != null ? parseFloat(answers.bmi).toFixed(1) : '',

    // Engine outputs
    qepsa_tier_key:       epsaTierKey,
    qepsa_tier_label:     epsaTierLabel,
    qepsa_recommend_psa:  recommendPSA ? '1' : '0',
    qepsa_psa_message:    psaRecommendMessage || '',
    qepsa_raw_score:      calculationDetails?.rawScore ?? '',
    qepsa_score_pct:      score ?? '',

    // Metadata
    qepsa_submitted_at:   new Date().toISOString(),
    qepsa_source:         'mobile_bus',
  };
}

/**
 * Submit a Quick ePSA result to REDCap via Cloud Function.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function submitToRedcap(answers, engineResult) {
  const consentTimestamp = new Date().toISOString();
  const record = buildRecord(answers, engineResult, consentTimestamp);

  try {
    const functions = getFunctions();
    const submitRedcap = httpsCallable(functions, 'submitRedcap');
    await submitRedcap({ record });
    return { success: true };
  } catch (err) {
    console.error('REDCap submit failed:', err);
    return { success: false, error: err?.message || 'Submission failed' };
  }
}
