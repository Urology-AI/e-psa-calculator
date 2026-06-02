/**
 * sinaiSubmit.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend helpers for the Mount Sinai clinic-cohort flow.
 *
 *   - readSinaiConfig()           — read appConfig/sinai feature flag
 *   - validateCode(code)          — call validateClinicCode
 *   - submitLive(...)             — call submitSinaiCohort (live REDCap)
 *   - claimOffline(code)          — call claimCodeOffline (no clinical data)
 *   - buildSinaiCsv(...)          — build REDCap-import-ready CSV in browser
 *   - downloadSinaiCsv(...)       — trigger the download
 *
 * The CSV column names mirror the backend mapper in
 * backend/src/sinaiCohort.ts so the file imports cleanly into REDCap
 * without manual remapping.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '../config/firebase';

// ─── Feature flag ──────────────────────────────────────────────────────────

/**
 * Read appConfig/sinai. Returns { redcapEnabled } with redcapEnabled=false
 * when the doc is missing or unreadable — i.e., default to the offline path
 * so we never accidentally try a misconfigured live REDCap submission.
 */
export async function readSinaiConfig() {
  if (!db) return { redcapEnabled: false };
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'sinai'));
    if (!snap.exists()) return { redcapEnabled: false };
    const data = snap.data() || {};
    return { redcapEnabled: data.redcapEnabled === true };
  } catch {
    return { redcapEnabled: false };
  }
}

// ─── Callables ─────────────────────────────────────────────────────────────

function requireFunctions() {
  if (!functions) {
    throw new Error('Firebase Functions is not configured.');
  }
}

export async function validateCode(code) {
  requireFunctions();
  const fn = httpsCallable(functions, 'validateClinicCode');
  const res = await fn({ code });
  return res.data; // { valid: boolean, reason?: string }
}

/**
 * Unified submit entry point. The backend decides (based on
 * appConfig/sinai.redcapEnabled) whether to attempt a live REDCap POST or
 * leave the session in `pending` status for an admin to handle later.
 *
 * Returns: { ok, sessionId, redcapSubmitted, redcapRecordId?, ttlDays }
 */
export async function submitSession(payload) {
  requireFunctions();
  const fn = httpsCallable(functions, 'submitSinaiSession');
  const res = await fn(payload);
  return res.data;
}

// ─── Submission payload builder ────────────────────────────────────────────

/**
 * Build the shape that submitSinaiCohort expects. Mirrors the public-cohort
 * submitToRedcap payload but is computed locally so the offline CSV path can
 * use the same canonical record.
 */
export function buildSinaiPayload({
  clinicCode,
  sessionId,
  step1,
  result,
  step2,
  finalCategory,
  finalScore,
  pathwayMode,
}) {
  return {
    clinicCode,
    sessionId,
    step1,
    result,
    step2,
    finalCategory,
    finalScore,
    pathwayMode,
  };
}

// ─── REDCap CSV builder (mirrors backend/src/sinaiCohort.ts mapper) ────────

function mapDietPattern(val) {
  if (!val) return undefined;
  return val.replace(/-/g, '_');
}

// Normalise chemical_exposure to CSV codings:
//   agent_orange | nine_eleven | other_chemical | none | unknown
function mapChemicalExposure(val) {
  if (!val || val === 'no') return 'none';
  if (val === 'wtc_911') return 'nine_eleven';
  // clinical mode sends 'yes' (simple form) → treat as other_chemical
  if (val === 'yes') return 'other_chemical';
  return val;
}

// genetic_risk: yes | no | unknown
function mapGeneticRisk(val) {
  if (!val || val === 'unknown') return 'unknown';
  if (val === 'none' || val === 'no') return 'no';
  return 'yes';
}

/**
 * Build a single REDCap record object from a Sinai submission payload.
 * The keys are the REDCap field names; values are the data dictionary
 * codings (numbers and short strings).
 */
export function buildRedcapRecord(recordId, payload) {
  const s1 = payload.step1 || {};
  const s2 = payload.step2 || {};
  const ipss = s1.ipss || [];
  const shim = s1.shim || [];

  const psaRaw = s2.psa ? parseFloat(s2.psa) : undefined;
  const isOn5ari =
    s2.onHormonalTherapy === true &&
    (s2.hormonalTherapyType === 'finasteride' || s2.hormonalTherapyType === 'dutasteride');

  const record = {
    record_id: recordId,

    // Demographics
    age:  s1.age,
    race: s1.race,

    // Family & genetic risk
    family_history:  s1.familyHistory,          // 0 | 1 | 2 | unknown
    inflammation_hx: s1.inflammationHistory,    // 0 | 1
    genetic_risk:    mapGeneticRisk(s1.brcaStatus), // yes | no | unknown

    // Body — raw height/weight; REDCap calculates BMI
    height_ft:  s1.heightFt  ?? undefined,
    height_in:  s1.heightIn  ?? undefined,
    height_cm:  s1.heightCm  ?? undefined,
    weight_lbs: s1.weightUnit === 'lbs' ? s1.weight : undefined,
    weight_kg:  s1.weightUnit === 'kg'  ? s1.weight : (s1.weightKg ?? undefined),

    // Lifestyle
    exercise:         s1.exercise,
    smoking:          s1.smoking,
    chemical_exposure: mapChemicalExposure(s1.chemicalExposure),
    diet_pattern:     mapDietPattern(s1.dietPattern),
    comorbidities:    s1.comorbidityScore,       // 0 | 1 | 2

    // IPSS — named fields per CSV; blank when clinical mode (only QoL collected)
    incomplete_emptying: ipss[0],
    frequency:           ipss[1],
    intermittency:       ipss[2],
    urgency:             ipss[3],
    weak_stream:         ipss[4],
    straining:           ipss[5],
    nocturia:            ipss[6],
    quality_of_life:     s1.ipssQol,

    // SHIM — named fields per CSV; only erection_confidence filled by clinical mode
    erection_confidence:  shim[0],
    erection_penetration: shim[1],
    maintain_erection:    shim[2],
    complete_erection:    shim[3],
    satisfactory:         shim[4],
  };

  if (payload.step2) {
    record.psa = psaRaw;
    record.on_hormonal_therapy = s2.onHormonalTherapy ? 1 : 0;
    record.hormonal_therapy_type =
      s2.hormonalTherapyType && s2.hormonalTherapyType !== ''
        ? s2.hormonalTherapyType
        : undefined;
    record.pirads          = s2.pirads ? parseInt(s2.pirads, 10) : undefined;
    record.prostate_volume = s2.prostateVolume
      ? parseFloat(String(s2.prostateVolume))
      : undefined;
  }

  // Drop undefined / null / empty fields — REDCap import is happier without them
  const clean = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  return clean;
}

// ─── CSV download (browser-only) ───────────────────────────────────────────

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildSinaiCsv(record) {
  const keys = Object.keys(record);
  const header = keys.join(',');
  const row = keys.map((k) => escapeCsvCell(record[k])).join(',');
  return `${header}\n${row}\n`;
}

export function downloadSinaiCsv(record, clinicCode) {
  const csv = buildSinaiCsv(record);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const datePart = new Date().toISOString().slice(0, 10);
  // Filename uses the display form of the code (with dashes) for human readability
  const codeForFilename = clinicCode.replace(/-/g, '').toUpperCase();
  const filename = `ePSA_sinai_${codeForFilename}_${datePart}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
