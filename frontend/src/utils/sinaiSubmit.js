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

export async function submitLive(payload) {
  requireFunctions();
  const fn = httpsCallable(functions, 'submitSinaiCohort');
  const res = await fn(payload);
  return res.data; // { success: true, redcapRecordId: string }
}

export async function claimOffline(code, sessionId) {
  requireFunctions();
  const fn = httpsCallable(functions, 'claimCodeOffline');
  const res = await fn({ code, sessionId });
  return res.data; // { ok: true, sessionId: string }
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

function mapBrcaStatus(val) {
  if (!val) return undefined;
  if (val === 'unknown') return 'unknown';
  if (val === 'none') return 'no';
  return 'yes';
}

function mapDietPattern(val) {
  if (!val) return undefined;
  return val.replace(/-/g, '_');
}

function inferPathwayMode(stored, s2) {
  if (stored) return stored;
  if (!s2) return 'pre_psa';
  if (s2.knowPirads && s2.pirads && s2.pirads !== '0') return 'post_mri';
  if (s2.knowPsa && s2.psa) return 'post_psa';
  return 'pre_psa';
}

/**
 * Build a single REDCap record object from a Sinai submission payload.
 * The keys are the REDCap field names; values are the data dictionary
 * codings (numbers and short strings).
 */
export function buildRedcapRecord(recordId, payload) {
  const s1 = payload.step1 || {};
  const s2 = payload.step2 || {};
  const r1 = payload.result || {};
  const ipss = s1.ipss || [];
  const shim = s1.shim || [];

  const pathwayMode = inferPathwayMode(payload.pathwayMode, payload.step2);

  const psaRaw = s2.psa ? parseFloat(s2.psa) : undefined;
  const isOn5ari =
    s2.onHormonalTherapy === true &&
    (s2.hormonalTherapyType === 'finasteride' || s2.hormonalTherapyType === 'dutasteride');
  const psaAdjusted = psaRaw !== undefined && isOn5ari ? psaRaw * 2 : psaRaw;

  const prostateVol = s2.prostateVolume ? parseFloat(String(s2.prostateVolume)) : undefined;
  const effectivePsa = psaAdjusted ?? psaRaw;
  const psadValue =
    prostateVol !== undefined && effectivePsa !== undefined && prostateVol > 0
      ? parseFloat((effectivePsa / prostateVol).toFixed(3))
      : undefined;
  const psadFlag = psadValue !== undefined ? (psadValue > 0.177 ? 1 : 0) : undefined;

  const record = {
    record_id: recordId,
    pathway_mode: pathwayMode,
    data_source: 'sinai_clinic',

    age: s1.age,
    race: s1.race,

    family_history:
      s1.familyHistory !== undefined ? (s1.familyHistory > 0 ? 1 : 0) : undefined,
    family_history_degree: s1.familyHistory,
    inflammation_hx: s1.inflammationHistory,
    brca_status: mapBrcaStatus(s1.brcaStatus),

    height_unit: s1.heightUnit,
    height_ft: s1.heightFt ?? undefined,
    height_in: s1.heightIn ?? undefined,
    height_cm: s1.heightCm ?? undefined,
    weight_unit: s1.weightUnit,
    weight_lbs: s1.weightUnit === 'lbs' ? s1.weight : undefined,
    weight_kg:
      s1.weightUnit === 'kg'
        ? s1.weight
        : s1.weightKg ?? undefined,
    bmi: s1.bmi,

    exercise: s1.exercise,
    smoking: s1.smoking,
    chemical_exposure: s1.chemicalExposure,

    diet_pattern: mapDietPattern(s1.dietPattern),
    hypertension: s1.hypertension,
    hyperlipidemia: s1.hyperlipidemia,
    cad: s1.coronaryArteryDisease,
    diabetes: s1.diabetes,
    comorbidity_score: s1.comorbidityScore,

    ipss_1: ipss[0],
    ipss_2: ipss[1],
    ipss_3: ipss[2],
    ipss_4: ipss[3],
    ipss_5: ipss[4],
    ipss_6: ipss[5],
    ipss_7: ipss[6],
    ipss_total: ipss.length > 0 ? ipss.reduce((a, b) => a + b, 0) : undefined,

    shim_1: shim[0],
    shim_2: shim[1],
    shim_3: shim[2],
    shim_4: shim[3],
    shim_5: shim[4],
    shim_total: shim.length > 0 ? shim.reduce((a, b) => a + b, 0) : undefined,

    part1_score: r1.score,
    part1_risk: r1.risk,
    part1_score_range: r1.scoreRange,
    recommend_psa:
      r1.risk !== undefined ? (r1.risk === 'PSA_RECOMMENDED' ? 1 : 0) : undefined,
    part1_model_ver: r1.modelVersion,
  };

  if (payload.step2) {
    record.psa = psaRaw;
    record.on_hormonal_therapy = s2.onHormonalTherapy ? 1 : 0;
    record.hormonal_therapy_type =
      s2.hormonalTherapyType && s2.hormonalTherapyType !== ''
        ? s2.hormonalTherapyType
        : undefined;
    record.psa_adjusted = isOn5ari ? psaAdjusted : undefined;
    record.psa_adjusted_flag = isOn5ari ? 1 : 0;
    record.pirads = s2.pirads ? parseInt(s2.pirads, 10) : undefined;
    record.prostate_volume = prostateVol;
    record.psad_value = psadValue;
    record.psad_flag = psadFlag;
    record.part2_risk_cat = payload.finalCategory;
    record.part2_total_pts = payload.finalScore;
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
