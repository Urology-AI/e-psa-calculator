/**
 * Clinical Workspace — cohort file parsing.
 *
 * Turns uploaded CSV / JSON files (several at once) into normalised patient
 * records that the scoring pipeline can run. Pure functions, no I/O and no
 * storage: everything here operates on text the caller already read in memory.
 *
 * Accepted shapes
 *  - CSV with a header row: one patient per row. Header names are matched
 *    loosely (case, spaces, underscores ignored) against FIELD_ALIASES, so the
 *    app's own CSV export, a REDCap export, or a hand-built sheet all work.
 *    The PHI notice line the app prepends to its CSV exports is skipped.
 *  - JSON: an array of patients, `{ patients: [...] }`, or a single app export
 *    (`{ formData, part2Data }` / `{ part1Data, ... }`).
 */

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// canonical key -> accepted header spellings (already normalised by `norm`).
const FIELD_ALIASES = {
  patientId: ['patientid', 'id', 'recordid', 'mrn', 'subjectid', 'studyid', 'patient', 'name', 'label'],
  age: ['age', 'ageyears'],
  race: ['race'],
  ethnicity: ['ethnicity'],
  bmi: ['bmi', 'bmikgm2'],
  heightCm: ['heightcm', 'height'],
  weightKg: ['weightkg', 'weight'],
  ipss: ['ipss'],
  ipssTotal: ['ipsstotal', 'ipssscore'],
  shim: ['shim'],
  shimTotal: ['shimtotal', 'shimscore'],
  familyHistory: ['familyhistory', 'fh', 'fhprostate'],
  exercise: ['exercise'],
  comorbidityScore: ['comorbidityscore', 'comorbidities'],
  hypertension: ['hypertension'],
  hyperlipidemia: ['hyperlipidemia'],
  coronaryArteryDisease: ['coronaryarterydisease', 'cad'],
  diabetes: ['diabetes'],
  smoking: ['smoking'],
  dietPattern: ['dietpattern', 'diet'],
  brcaStatus: ['brcastatus', 'brca', 'geneticrisk'],
  inflammationHistory: ['inflammationhistory', 'prostatitis'],
  chemicalExposure: ['chemicalexposure'],
  psa: ['psa', 'psang', 'psangml'],
  prostateVolume: ['prostatevolume', 'volume', 'prostatevolumecc'],
  pirads: ['pirads', 'piradsscore'],
  onHormonalTherapy: ['onhormonaltherapy', 'hormonaltherapy'],
  // Ground truth from biopsy pathology, for comparing against the model.
  actualGG: ['actualgg', 'actualggmax', 'ggmax', 'gradegroup', 'biopsygg', 'pathology', 'pathologygg', 'actualoutcome'],
  actualGG2: ['actualgg2', 'actualgg2pos', 'gg2positive', 'gg2plus', 'csPCa', 'cspca'].map(norm),
  cribriform: ['cribriform', 'actualcribriform'],
};
for (let i = 1; i <= 7; i += 1) FIELD_ALIASES[`ipss${i}`] = [`ipss${i}`, `ipssq${i}`];
for (let i = 1; i <= 5; i += 1) FIELD_ALIASES[`shim${i}`] = [`shim${i}`, `shimq${i}`];

const ALIAS_LOOKUP = (() => {
  const m = new Map();
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const a of aliases) if (!m.has(a)) m.set(a, key);
  }
  return m;
})();

/** Column names the CSV template (and docs) advertise. */
export const TEMPLATE_COLUMNS = [
  'patientId', 'age', 'race', 'bmi', 'ipssTotal', 'shimTotal', 'familyHistory',
  'exercise', 'comorbidityScore', 'smoking', 'dietPattern', 'brcaStatus',
  'inflammationHistory', 'chemicalExposure', 'psa', 'prostateVolume', 'pirads',
  'onHormonalTherapy', 'actualGG',
];

export const buildTemplateCsv = () => [
  TEMPLATE_COLUMNS.join(','),
  'P-001,62,white,27,6,20,0,0,0,0,western,no,0,no,4.8,45,3,no,1',
  'P-002,58,black,31,14,12,1,1,1,1,western,unknown,0,no,7.2,60,4,no,3',
  'P-003,49,asian,23,3,24,0,0,0,0,mediterranean,no,0,no,,,,no,',
].join('\n') + '\n';

/** RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF/LF, embedded newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text ?? '').replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

/** CSV text -> array of plain objects keyed by the file's own headers. */
export function csvToObjects(text) {
  let rows = parseCsv(text);
  // The app's CSV export prepends a one-cell PHI notice line before the header.
  if (rows.length > 0 && rows[0].length === 1 && /^notice:/i.test(rows[0][0].trim())) rows = rows.slice(1);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => { if (h) o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

/** Extract the list of raw patient objects from parsed JSON of any accepted shape. */
export function jsonToObjects(data) {
  if (Array.isArray(data)) return data.flatMap(jsonToObjects);
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.patients)) return data.patients.flatMap(jsonToObjects);
  const part1 = data.formData ?? data.part1Data ?? data.data;
  if (part1 && typeof part1 === 'object' && !Array.isArray(part1)) {
    const part2 = data.part2Data ?? data.postData ?? {};
    return [{ ...part1, ...part2, ...(data.patientId ? { patientId: data.patientId } : {}) }];
  }
  return [data];
}

const isBlank = (v) => v === '' || v === null || v === undefined;
const toNum = (v) => {
  if (isBlank(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const yes = (v) => v === true || v === 1 || ['yes', 'y', 'true', '1', 'positive'].includes(String(v ?? '').trim().toLowerCase());
const no = (v) => v === false || v === 0 || ['no', 'n', 'false', '0', 'negative'].includes(String(v ?? '').trim().toLowerCase());

/**
 * Biopsy outcome -> Grade Group 0 (benign) … 5, or null when unknown.
 * Accepts 0–5, "GG3", "Grade Group 2", "benign"/"negative".
 */
export function parseActualGG(v) {
  if (isBlank(v)) return null;
  const s = String(v).trim().toLowerCase();
  if (/^(benign|negative|no cancer|nil)$/.test(s)) return 0;
  const m = s.match(/([0-5])\s*$/) || s.match(/(?:gg|grade\s*group)\s*([1-5])/);
  return m ? Number(m[1]) : null;
}

/** Collapse a raw row (any header spelling) to canonical keys. */
function canonicalise(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const key = ALIAS_LOOKUP.get(norm(k));
    if (key && (out[key] === undefined || isBlank(out[key]))) out[key] = v;
  }
  return out;
}

/** Spread a total across n items of at most `max` each (same approach as QuickEntry). */
export function distributeTotal(total, length, max) {
  if (total === null) return Array(length).fill(null);
  const arr = Array(length).fill(0);
  let remaining = Math.max(0, total);
  for (let i = 0; i < length && remaining > 0; i += 1) {
    arr[i] = Math.min(max, remaining);
    remaining -= arr[i];
  }
  return arr;
}

const asItemArray = (c, key, length) => {
  const v = c[key];
  if (Array.isArray(v)) return v.map(toNum);
  if (typeof v === 'string' && /[,;|]/.test(v)) return v.split(/[,;|]/).map((s) => toNum(s.trim()));
  const items = [];
  for (let i = 1; i <= length; i += 1) items.push(toNum(c[`${key}${i}`]));
  return items.some((x) => x !== null) ? items : null;
};

// Defaults for *optional* lifestyle inputs, matching QuickEntry. Anything filled
// from here is reported per patient as `assumed` — never applied silently.
const OPTIONAL_DEFAULTS = {
  exercise: 0,
  comorbidityScore: 0,
  smoking: 0,
  dietPattern: 'western',
  brcaStatus: 'unknown',
  inflammationHistory: 0,
  chemicalExposure: 'no',
  familyHistory: 0,
};

/**
 * Normalise one raw record into { id, issues, assumed, part1, part2 }.
 * part1 is the engine's form shape; part2 is null when no PSA was supplied.
 * `issues` are blocking (record cannot be scored); `assumed` are filled defaults.
 */
export function normalisePatient(raw, index, source = '') {
  const c = canonicalise(raw);
  const issues = [];
  const assumed = [];

  const id = !isBlank(c.patientId) ? String(c.patientId) : `Row ${index + 1}`;

  const age = toNum(c.age);
  if (age === null) issues.push('Age is missing');
  else if (age < 18 || age > 120) issues.push(`Age ${age} is outside 18–120`);

  let bmi = toNum(c.bmi);
  if (bmi === null) {
    const h = toNum(c.heightCm);
    const w = toNum(c.weightKg);
    if (h && w) bmi = Math.round((w / ((h / 100) ** 2)) * 10) / 10;
  }
  if (bmi === null) issues.push('BMI is missing (or height + weight)');
  else if (bmi < 10 || bmi > 80) issues.push(`BMI ${bmi} looks implausible`);

  let ipss = asItemArray(c, 'ipss', 7);
  if (!ipss) {
    const total = toNum(c.ipssTotal);
    if (total === null) issues.push('IPSS is missing');
    else if (total < 0 || total > 35) issues.push(`IPSS total ${total} is outside 0–35`);
    else ipss = distributeTotal(total, 7, 5);
  }
  let shim = asItemArray(c, 'shim', 5);
  if (!shim) {
    const total = toNum(c.shimTotal);
    if (total === null) issues.push('SHIM is missing');
    else if (total < 0 || total > 25) issues.push(`SHIM total ${total} is outside 0–25`);
    else shim = distributeTotal(total, 5, 5);
  }

  const optional = (key, parse) => {
    if (isBlank(c[key])) { assumed.push(key); return OPTIONAL_DEFAULTS[key]; }
    return parse(c[key]);
  };

  const familyHistory = optional('familyHistory', (v) => (String(v).toLowerCase() === 'unknown' ? 'unknown' : toNum(v) ?? OPTIONAL_DEFAULTS.familyHistory));
  const exercise = optional('exercise', (v) => toNum(v) ?? OPTIONAL_DEFAULTS.exercise);
  const smoking = optional('smoking', (v) => toNum(v) ?? OPTIONAL_DEFAULTS.smoking);
  const dietPattern = optional('dietPattern', (v) => String(v));
  const inflammationHistory = optional('inflammationHistory', (v) => (yes(v) ? 1 : 0));
  const chemicalExposure = optional('chemicalExposure', (v) => (yes(v) ? 'yes' : String(v).toLowerCase() === 'unknown' ? 'unknown' : 'no'));
  const brcaStatus = optional('brcaStatus', (v) => (yes(v) ? 'yes' : no(v) ? 'no' : String(v).toLowerCase() === 'unknown' ? 'unknown' : String(v)));

  let comorbidityScore = toNum(c.comorbidityScore);
  if (comorbidityScore === null) {
    const flags = ['hypertension', 'hyperlipidemia', 'coronaryArteryDisease', 'diabetes'];
    if (flags.some((f) => !isBlank(c[f]))) comorbidityScore = Math.min(2, flags.filter((f) => yes(c[f])).length);
    else { comorbidityScore = OPTIONAL_DEFAULTS.comorbidityScore; assumed.push('comorbidityScore'); }
  }
  comorbidityScore = Math.min(2, Math.max(0, comorbidityScore));

  const psa = toNum(c.psa);
  const volume = toNum(c.prostateVolume);
  const pirads = toNum(c.pirads);
  if (psa !== null && psa < 0) issues.push('PSA cannot be negative');
  if (pirads !== null && (pirads < 1 || pirads > 5)) issues.push(`PI-RADS ${pirads} is outside 1–5`);
  const hasMri = psa !== null && pirads !== null && pirads >= 1;
  const pathwayMode = hasMri ? 'post_mri' : psa !== null ? 'post_psa' : 'pre_psa';

  const part1 = {
    age,
    race: isBlank(c.race) ? null : String(c.race).toLowerCase(),
    ethnicity: isBlank(c.ethnicity) ? null : String(c.ethnicity).toLowerCase(),
    bmi,
    ipss,
    shim,
    exercise,
    familyHistory,
    smoking,
    chemicalExposure,
    dietPattern,
    brcaStatus,
    inflammationHistory,
    comorbidityScore,
    hypertension: null,
    hyperlipidemia: null,
    coronaryArteryDisease: null,
    diabetes: null,
    pathwayMode,
  };

  const part2 = psa === null ? null : {
    psa: String(psa),
    knowPsa: true,
    onHormonalTherapy: yes(c.onHormonalTherapy),
    hormonalTherapyType: '',
    knowPirads: hasMri,
    pirads: hasMri ? String(pirads) : '0',
    prostateVolume: volume === null ? '' : String(volume),
    pathwayMode,
  };

  let actualGG = parseActualGG(c.actualGG);
  const actual = {
    gg: actualGG,
    // A yes/no GG≥2 column is kept as-is rather than invented into a specific grade.
    gg2: actualGG !== null ? actualGG >= 2 : isBlank(c.actualGG2) ? null : yes(c.actualGG2),
    cribriform: isBlank(c.cribriform) ? null : yes(c.cribriform),
  };

  return { id, source, index, issues, assumed, part1, part2, actual };
}

/**
 * Add or edit PSA / prostate volume / PI-RADS on an already-normalised patient
 * (the table's inline cells). Returns the updated part1/part2/issues; callers
 * clear any stale results.
 */
export function withPsaMri(patient, { psa, prostateVolume, pirads }) {
  const p = toNum(psa);
  const v = toNum(prostateVolume);
  const r = toNum(pirads);
  const issues = patient.issues.filter((i) => !/^PSA |^PI-RADS /.test(i));
  if (p !== null && p < 0) issues.push('PSA cannot be negative');
  if (r !== null && (r < 1 || r > 5)) issues.push(`PI-RADS ${r} is outside 1–5`);
  const hasMri = p !== null && r !== null && r >= 1 && r <= 5;
  const pathwayMode = hasMri ? 'post_mri' : p !== null ? 'post_psa' : 'pre_psa';
  const onHormonalTherapy = patient.part2?.onHormonalTherapy ?? false;
  return {
    issues,
    part1: { ...patient.part1, pathwayMode },
    part2: p === null ? null : {
      psa: String(p), knowPsa: true, onHormonalTherapy, hormonalTherapyType: '',
      knowPirads: hasMri, pirads: hasMri ? String(r) : '0',
      prostateVolume: v === null ? '' : String(v), pathwayMode,
    },
  };
}

/** Read one File into patient records. Never throws: failures come back as `error`. */
export async function parseCohortFile(file) {
  const name = file?.name || 'file';
  try {
    const text = await file.text();
    const lower = name.toLowerCase();
    let raws;
    if (lower.endsWith('.json') || file.type === 'application/json') raws = jsonToObjects(JSON.parse(text));
    else if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt') || file.type === 'text/csv') raws = csvToObjects(text);
    else return { name, patients: [], error: 'Unsupported file type — upload .csv or .json' };
    if (raws.length === 0) return { name, patients: [], error: 'No patient rows found' };
    return { name, patients: raws.map((r, i) => normalisePatient(r, i, name)) };
  } catch (err) {
    return { name, patients: [], error: err?.message || 'Could not read file' };
  }
}
