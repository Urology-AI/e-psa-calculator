/**
 * REDCap submission for Clinical Mode.
 * Fields match redcap_data_dictionary_clinical_mode.csv exactly.
 *
 * Env vars:
 *   VITE_REDCAP_API_URL   — e.g. https://redcap.mountsinai.org/api/
 *   VITE_REDCAP_API_TOKEN — project-specific token
 */

const REDCAP_URL   = import.meta.env.VITE_REDCAP_API_URL;
const REDCAP_TOKEN = import.meta.env.VITE_REDCAP_API_TOKEN;

/**
 * Build a record matching the clinical mode instrument.
 * formData is the shape produced by ClinicalModeFlow handleSubmit.
 */
function buildClinicalRecord(formData) {
  // chemical_exposure in form: no | agent_orange | wtc_911 | other_chemical
  // CSV only has: no | yes | unknown
  const chemRaw = formData.chemicalExposure;
  const chemical_exposure =
    chemRaw === 'no' ? 'no'
    : chemRaw === 'unknown' ? 'unknown'
    : chemRaw ? 'yes'
    : undefined;

  const record = {
    record_id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,

    // patient_info
    age:  formData.age,
    race: formData.race,

    // clinical_inputs — Family & Genetic Risk
    family_history: formData.familyHistory,   // 0 | 1 | 2 | unknown
    genetic_risk:   formData.brcaStatus,      // yes | no | unknown

    // clinical_inputs — Body
    bmi: formData.bmi != null ? parseFloat(String(formData.bmi)).toFixed(1) : undefined,

    // clinical_inputs — Lifestyle
    exercise:         formData.exercise,
    smoking:          formData.smoking,
    chemical_exposure,
    diet_pattern:     formData.dietPattern,
    comorbidities:    formData.comorbidityScore ?? 0,  // 0 | 1 | 2

    // symptom_scores
    ipss_qol:             formData.ipssQol,   // 0–6  (IPSS Q8)
    erection_confidence:  formData.shim?.[0], // 1–5  (SHIM Q1)
  };

  // Drop undefined / null / empty
  const clean = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  return clean;
}

/**
 * Submit a Clinical Mode record to REDCap.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function submitToRedcap(formData) {
  if (!REDCAP_URL || !REDCAP_TOKEN) {
    console.warn('REDCap env vars not set — skipping submission.');
    return { success: false, error: 'REDCap not configured' };
  }

  const record = buildClinicalRecord(formData);
  const body = new URLSearchParams({
    token:         REDCAP_TOKEN,
    content:       'record',
    format:        'json',
    type:          'flat',
    data:          JSON.stringify([record]),
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
