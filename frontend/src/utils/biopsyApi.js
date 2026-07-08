/**
 * Client for the standalone biopsy-prediction service (ePSA Model v3).
 * Logistic regression on log(PSA) + PSAD + PI-RADS, trained on N=120 Mount
 * Sinai biopsy-registry patients. See github.com/Urology-AI/biopsy-prediction.
 */
const BIOPSY_API_URL = 'https://biopsy-prediction.onrender.com';

/**
 * @param {{psa: number, pirads: number, prostateVolume?: number|null}} params
 * @returns {Promise<{prob:number, percent:number, interpretation:string, guideline_rate:string, reliable:boolean, psad:number|null, psad_tier:string|null, model_version:string, threshold:number}>}
 */
export async function fetchBiopsyPrediction({ psa, pirads, prostateVolume }) {
  const body = { psa, pirads };
  if (prostateVolume != null && prostateVolume > 0) body.prostate_volume = prostateVolume;

  const res = await fetch(`${BIOPSY_API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Biopsy prediction service returned ${res.status}`);
  return res.json();
}
