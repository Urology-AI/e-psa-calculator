/**
 * REDCap API submission for Clinical ePSA mode.
 * Env vars required:
 *   VITE_REDCAP_API_URL   — e.g. https://redcap.mountsinai.org/api/
 *   VITE_REDCAP_API_TOKEN — project-specific API token
 *
 * REDCap field names below must match your instrument exactly.
 * Ask your REDCap admin for the data dictionary export to verify.
 */

const REDCAP_URL   = import.meta.env.VITE_REDCAP_API_URL;
const REDCAP_TOKEN = import.meta.env.VITE_REDCAP_API_TOKEN;

/**
 * Map Clinical ePSA answers + engine result → REDCap flat record.
 * All field names are placeholders — replace with your instrument's variable names.
 */
function buildRecord(answers, engineResult, consentTimestamp) {
  const { epsaTierKey, epsaTierLabel, recommendPSA, psaRecommendMessage,
          calculationDetails, score } = engineResult;

  // REDCap requires a unique record_id per submission.
  // Using timestamp + random suffix avoids collisions without PII.
  const record_id = `clinical_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    record_id,

    // Consent
    qepsa_consent: '1',                          // 1 = agreed
    qepsa_consent_timestamp: consentTimestamp,
    qepsa_study_id: 'STUDY-14-00050',

    // Demographics
    qepsa_age:  answers.age,
    qepsa_race: answers.race,

    // Clinical inputs
    qepsa_family_history: answers.familyHistory,  // none/one/two_plus/unknown
    qepsa_qol_score:      answers.qol,            // 0–6
    qepsa_shim_q1:        answers.shim,           // 1–5
    qepsa_exercise:       answers.exercise,       // 0/1/2
    qepsa_smoking:        answers.smoking,        // 0/1/2
    qepsa_diet:           answers.diet,           // red_meat/mixed/plant
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
    qepsa_source:         'mobile_clinical',
  };
}

/**
 * Submit a Clinical ePSA result to REDCap.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function submitToRedcap(answers, engineResult) {
  if (!REDCAP_URL || !REDCAP_TOKEN) {
    console.warn('REDCap env vars not configured — skipping submission.');
    return { success: false, error: 'REDCap not configured' };
  }

  const consentTimestamp = new Date().toISOString();
  const record = buildRecord(answers, engineResult, consentTimestamp);

  const body = new URLSearchParams({
    token:   REDCAP_TOKEN,
    content: 'record',
    format:  'json',
    type:    'flat',
    data:    JSON.stringify([record]),
    returnContent: 'ids',
  });

  try {
    const res = await fetch(REDCAP_URL, { method: 'POST', body });
    if (!res.ok) {
      const text = await res.text();
      console.error('REDCap error:', res.status, text);
      return { success: false, error: `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    console.error('REDCap submit failed:', err);
    return { success: false, error: err.message };
  }
}
