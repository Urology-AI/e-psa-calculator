/**
 * redcapSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firestore trigger that automatically pushes ePSA session data to REDCap
 * whenever a session reaches STEP1_COMPLETE or STEP2_COMPLETE.
 *
 * Configuration (set via Firebase Functions environment config):
 *   firebase functions:config:set redcap.api_url="https://redcap.yourinstitution.edu/api/"
 *   firebase functions:config:set redcap.api_token="YOUR_REDCAP_API_TOKEN"
 *
 * Or for local emulator, create backend/.runtimeconfig.json:
 *   { "redcap": { "api_url": "...", "api_token": "..." } }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';
import * as querystring from 'querystring';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Data {
  age?: number;
  race?: string;
  heightFt?: number | null;
  heightIn?: number | null;
  heightCm?: number | null;
  weight?: number;
  bmi?: number;
  heightUnit?: string;
  weightUnit?: string;
  weightKg?: number | null;
  familyHistory?: number;        // 0-3 (degree of family history)
  inflammationHistory?: number;  // 0|1
  brcaStatus?: string;           // 'none'|'brca1'|'brca2'|'both'|'unknown'
  ipss?: number[];               // 7 items, 0-5
  shim?: number[];               // 5 items, 1-5 (q1) or 0-5 (q2-5)
  exercise?: number;             // 0-2
  smoking?: number;              // 0-2
  chemicalExposure?: number;     // 0|1
  dietPattern?: string;
  hypertension?: number;         // 0|1
  hyperlipidemia?: number;       // 0|1
  coronaryArteryDisease?: number; // 0|1
  diabetes?: number;             // 0|1
  comorbidityScore?: number;     // 0-2
}

interface Step2Data {
  psa?: string;
  knowPsa?: boolean;
  onHormonalTherapy?: boolean;
  hormonalTherapyType?: string;  // ''|'finasteride'|'dutasteride'|'other'
  knowPirads?: boolean;
  pirads?: string;               // '0'-'5'
  prostateVolume?: string | number | null;
}

interface Part1Result {
  score?: number;
  risk?: string;
  scoreRange?: string;
  modelVersion?: string;
}

interface SessionDocument {
  userId?: string;
  status?: string;
  pathwayMode?: string;
  step1?: Step1Data;
  step2?: Step2Data;
  result?: Part1Result;
  finalCategory?: string;  // Part 2 risk category
  finalScore?: number;     // Part 2 total points
  createdAt?: admin.firestore.Timestamp;
}

// REDCap record — all values must be string or number for the API
type RedcapValue = string | number;
interface RedcapRecord {
  record_id: string;
  [key: string]: RedcapValue | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD MAPPING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Map Firestore brcaStatus → REDCap brca_status (yes/no/unknown) */
function mapBrcaStatus(val: string | undefined): string | undefined {
  if (!val) return undefined;
  if (val === 'unknown') return 'unknown';
  if (val === 'none') return 'no';
  return 'yes'; // brca1, brca2, both
}

/** Map dietPattern to REDCap-safe value (replace hyphens with underscores) */
function mapDietPattern(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.replace(/-/g, '_');
}

/**
 * Infer pathwayMode from stored value or from data shape.
 * Falls back gracefully if pathwayMode was not stored on the session.
 */
function inferPathwayMode(
  stored: string | undefined,
  s2: Step2Data | undefined
): string {
  if (stored) return stored;
  if (!s2) return 'pre_psa';
  if (s2.knowPirads && s2.pirads && s2.pirads !== '0') return 'post_mri';
  if (s2.knowPsa && s2.psa) return 'post_psa';
  return 'pre_psa';
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION → REDCAP FIELD MAPPER
// ─────────────────────────────────────────────────────────────────────────────

function mapSessionToRedcap(
  sessionId: string,
  session: SessionDocument
): RedcapRecord {
  const s1: Step1Data = session.step1 || {};
  const s2: Step2Data = session.step2 || {};
  const r1: Part1Result = session.result || {};

  const ipss = s1.ipss || [];
  const shim = s1.shim || [];

  const pathwayMode = inferPathwayMode(session.pathwayMode, session.step2);

  // ── PSA adjustment for 5-ARI (doubles PSA if on finasteride/dutasteride) ──
  const psaRaw = s2.psa ? parseFloat(s2.psa) : undefined;
  const isOn5ari =
    s2.onHormonalTherapy === true &&
    (s2.hormonalTherapyType === 'finasteride' || s2.hormonalTherapyType === 'dutasteride');
  const psaAdjusted = psaRaw !== undefined && isOn5ari ? psaRaw * 2 : psaRaw;

  // ── PSA density (only when prostate volume is available) ──
  const prostateVol = s2.prostateVolume
    ? parseFloat(String(s2.prostateVolume))
    : undefined;
  const effectivePsa = psaAdjusted ?? psaRaw;
  const psadValue =
    prostateVol !== undefined && effectivePsa !== undefined && prostateVol > 0
      ? parseFloat((effectivePsa / prostateVol).toFixed(3))
      : undefined;
  const psadFlag = psadValue !== undefined ? (psadValue > 0.177 ? 1 : 0) : undefined;

  // ── Build the record ──
  const record: RedcapRecord = {
    // ── Identifiers ──────────────────────────────────────────────────────────
    record_id: sessionId,
    pathway_mode: pathwayMode,

    // ── Demographics ─────────────────────────────────────────────────────────
    age: s1.age,
    race: s1.race,

    // ── Family & Genetic Risk ────────────────────────────────────────────────
    // familyHistory in Firestore is 0-3 (degree). Map to binary for REDCap
    // family_history field and pass raw degree as family_history_degree.
    family_history:
      s1.familyHistory !== undefined ? (s1.familyHistory > 0 ? 1 : 0) : undefined,
    family_history_degree: s1.familyHistory,
    inflammation_hx: s1.inflammationHistory,
    brca_status: mapBrcaStatus(s1.brcaStatus),

    // ── Body Metrics ─────────────────────────────────────────────────────────
    height_unit: s1.heightUnit,
    height_ft: s1.heightFt !== null ? s1.heightFt : undefined,
    height_in: s1.heightIn !== null ? s1.heightIn : undefined,
    height_cm: s1.heightCm !== null ? s1.heightCm : undefined,
    weight_unit: s1.weightUnit,
    weight_lbs: s1.weightUnit === 'lbs' ? s1.weight : undefined,
    weight_kg:
      s1.weightUnit === 'kg'
        ? s1.weight
        : s1.weightKg !== null
        ? s1.weightKg
        : undefined,
    bmi: s1.bmi,

    // ── Lifestyle ────────────────────────────────────────────────────────────
    exercise: s1.exercise,
    smoking: s1.smoking,
    chemical_exposure: s1.chemicalExposure,

    // ── Additional Information ───────────────────────────────────────────────
    diet_pattern: mapDietPattern(s1.dietPattern),
    hypertension: s1.hypertension,
    hyperlipidemia: s1.hyperlipidemia,
    cad: s1.coronaryArteryDisease,
    diabetes: s1.diabetes,
    comorbidity_score: s1.comorbidityScore,

    // ── IPSS (7 questions) ───────────────────────────────────────────────────
    ipss_1: ipss[0],
    ipss_2: ipss[1],
    ipss_3: ipss[2],
    ipss_4: ipss[3],
    ipss_5: ipss[4],
    ipss_6: ipss[5],
    ipss_7: ipss[6],
    ipss_total:
      ipss.length > 0 ? ipss.reduce((a, b) => a + b, 0) : undefined,

    // ── SHIM (5 questions) ───────────────────────────────────────────────────
    shim_1: shim[0],
    shim_2: shim[1],
    shim_3: shim[2],
    shim_4: shim[3],
    shim_5: shim[4],
    shim_total:
      shim.length > 0 ? shim.reduce((a, b) => a + b, 0) : undefined,

    // ── Part 1 Results ───────────────────────────────────────────────────────
    part1_score: r1.score,
    part1_risk: r1.risk,
    part1_score_range: r1.scoreRange,
    recommend_psa:
      r1.risk !== undefined
        ? r1.risk === 'PSA_RECOMMENDED'
          ? 1
          : 0
        : undefined,
    part1_model_ver: r1.modelVersion,
  };

  // ── Part 2 fields (only when Step 2 data exists) ─────────────────────────
  if (session.step2) {
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

    // Part 2 results
    record.part2_risk_cat = session.finalCategory;
    record.part2_total_pts = session.finalScore;
  }

  // Strip undefined / null / empty-string values — REDCap rejects them
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  ) as RedcapRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// REDCAP API CALL (Node https module — no extra dependencies needed)
// ─────────────────────────────────────────────────────────────────────────────

interface RedcapApiResponse {
  count?: number;
  error?: string;
}

function postToRedcap(
  apiUrl: string,
  apiToken: string,
  records: RedcapRecord[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify({
      token: apiToken,
      content: 'record',
      format: 'json',
      type: 'flat',
      overwriteBehavior: 'overwrite',
      data: JSON.stringify(records),
      returnContent: 'count',
      returnFormat: 'json',
    });

    let url: URL;
    try {
      url = new URL(apiUrl);
    } catch {
      return reject(new Error(`Invalid REDCAP_API_URL: "${apiUrl}"`));
    }

    const options = {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk: string) => { raw += chunk; });
      res.on('end', () => {
        const statusCode = res.statusCode ?? 0;
        if (statusCode >= 400) {
          return reject(new Error(`REDCap API HTTP ${statusCode}: ${raw}`));
        }
        try {
          const json = JSON.parse(raw) as RedcapApiResponse;
          if (json.error) {
            return reject(new Error(`REDCap rejected record: ${json.error}`));
          }
          functions.logger.info(`REDCap sync: ${json.count ?? 0} record(s) written`);
          resolve();
        } catch {
          reject(new Error(`Failed to parse REDCap response: ${raw}`));
        }
      });
    });

    req.on('error', (err: Error) => reject(err));
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE TRIGGER  —  sessions/{sessionId}  onWrite
// ─────────────────────────────────────────────────────────────────────────────

export const syncToRedcap = functions.firestore
  .document('sessions/{sessionId}')
  .onWrite(async (change, context) => {
    const sessionId = context.params['sessionId'] as string;
    const after = change.after.exists
      ? (change.after.data() as SessionDocument)
      : null;
    const before = change.before.exists
      ? (change.before.data() as SessionDocument)
      : null;

    // ── Guard: skip deletes and no-op status updates ──────────────────────
    if (!after) return null;
    const prevStatus = before?.status;
    const newStatus = after.status;
    if (newStatus === prevStatus) return null;
    if (newStatus !== 'STEP1_COMPLETE' && newStatus !== 'STEP2_COMPLETE') {
      return null;
    }

    // ── Check research consent on the user document ──────────────────────
    const userId = after.userId;
    if (!userId) {
      functions.logger.warn(`REDCap sync skipped: session ${sessionId} has no userId`);
      return null;
    }

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data() as { researchConsent?: boolean } | undefined;

    if (!userData?.researchConsent) {
      functions.logger.info(
        `REDCap sync skipped: user ${userId} has not given research consent (session=${sessionId})`
      );
      return null;  // Data stays in Firebase only — user did not consent
    }

    // ── Load REDCap config ────────────────────────────────────────────────
    const cfg = functions.config() as {
      redcap?: { api_url?: string; api_token?: string };
    };
    const apiUrl = cfg.redcap?.api_url;
    const apiToken = cfg.redcap?.api_token;

    if (!apiUrl || !apiToken) {
      functions.logger.warn(
        'REDCap config not set — skipping sync. ' +
        'Run: firebase functions:config:set ' +
        'redcap.api_url="https://..." redcap.api_token="..."'
      );
      return null;
    }

    // ── Map and push ──────────────────────────────────────────────────────
    try {
      const record = mapSessionToRedcap(sessionId, after);

      functions.logger.info(
        `REDCap sync starting: session=${sessionId} status=${newStatus}`,
        { record_id: record.record_id, pathway_mode: record.pathway_mode }
      );

      await postToRedcap(apiUrl, apiToken, [record]);

      // Mark session as synced (non-fatal if this fails)
      await change.after.ref
        .update({
          redcapSynced: true,
          redcapSyncStatus: newStatus,
          redcapSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          redcapSyncError: admin.firestore.FieldValue.delete(),
        })
        .catch((e: Error) =>
          functions.logger.warn('Failed to write redcapSynced flag', e)
        );

      functions.logger.info(`REDCap sync success: session=${sessionId}`);
    } catch (error) {
      functions.logger.error(`REDCap sync FAILED: session=${sessionId}`, error);

      // Record the error on the session document for monitoring/retry
      await change.after.ref
        .update({
          redcapSynced: false,
          redcapSyncError: String(error),
          redcapSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch((e: Error) =>
          functions.logger.warn('Failed to write redcapSyncError flag', e)
        );
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE FUNCTION  —  submitToRedcap
// For LOCAL storage users who give research consent.
// Accepts form data directly, maps it, and POSTs to REDCap without needing
// a Firestore session document.
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitPayload {
  researchConsent: boolean;
  step1: Step1Data;
  result: Part1Result;
  step2?: Step2Data;
  finalCategory?: string;
  finalScore?: number;
  pathwayMode?: string;
  sessionId?: string;  // optional client-supplied ID; UUID generated if absent
}

export const submitToRedcap = functions.https.onCall(
  async (data: SubmitPayload) => {
    // ── Validate research consent ─────────────────────────────────────────
    if (data.researchConsent !== true) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Research consent is required to submit data to REDCap.'
      );
    }

    // ── Load REDCap config ────────────────────────────────────────────────
    const cfg = functions.config() as {
      redcap?: { api_url?: string; api_token?: string };
    };
    const apiUrl  = cfg.redcap?.api_url;
    const apiToken = cfg.redcap?.api_token;

    if (!apiUrl || !apiToken) {
      throw new functions.https.HttpsError(
        'unavailable',
        'REDCap integration is not configured on this server.'
      );
    }

    // ── Build session document shape from payload ─────────────────────────
    const recordId: string =
      data.sessionId || crypto.randomUUID();

    const sessionDoc: SessionDocument = {
      step1:         data.step1,
      result:        data.result,
      step2:         data.step2,
      finalCategory: data.finalCategory,
      finalScore:    data.finalScore,
      pathwayMode:   data.pathwayMode,
    };

    // ── Map + push ────────────────────────────────────────────────────────
    try {
      const record = mapSessionToRedcap(recordId, sessionDoc);
      await postToRedcap(apiUrl, apiToken, [record]);

      functions.logger.info(
        `submitToRedcap: local-user record submitted (record_id=${recordId})`
      );

      return {
        success: true,
        recordId,
        message: 'Your data has been submitted to the ePSA research study. Thank you for contributing!',
      };
    } catch (error) {
      functions.logger.error('submitToRedcap failed:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to submit data to the research study. Please try again later.'
      );
    }
  }
);
