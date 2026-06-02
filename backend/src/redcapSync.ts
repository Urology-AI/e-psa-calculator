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
  heightUnit?: string;
  heightFt?: number | null;
  heightIn?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  weight?: number;
  weightUnit?: string;
  bmi?: number;
  familyHistory?: number | string; // 0-3 or 'unknown'
  inflammationHistory?: number;  // 0|1
  brcaStatus?: string;           // 'none'|'brca1'|'brca2'|'both'|'unknown'
  ipss?: number[];               // 7 items (Q1–Q7), 0-5; Q8 (QoL) stored separately
  ipssQol?: number;              // Q8 quality of life, 0-6
  shim?: number[];               // 5 items, 0-5
  exercise?: number;             // 0-2
  smoking?: number;              // 0-2
  chemicalExposure?: string;
  dietPattern?: string;
  comorbidityScore?: number;     // 0-2
  // individual comorbidity fields (used to derive comorbidityScore if not set)
  hypertension?: number;
  hyperlipidemia?: number;
  coronaryArteryDisease?: number;
  diabetes?: number;
}

interface Step2Data {
  psa?: string;
  knowPsa?: boolean;
  onHormonalTherapy?: boolean;
  hormonalTherapyType?: string;  // ''|'finasteride'|'dutasteride'|'other'
  knowPirads?: boolean;
  pirads?: string;               // '0'-'5'
  prostateVolume?: string | number | null;
  pathwayMode?: string;
}

interface Part1Result {
  score?: number;
  risk?: string;
  scoreRange?: string;
  modelVersion?: string;
  [key: string]: unknown;
}

interface SessionDocument {
  userId?: string;
  status?: string;
  pathwayMode?: string;
  step1?: Step1Data;
  step2?: Step2Data;
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

/** Map Firestore brcaStatus → REDCap genetic_risk (yes/no/unknown) */
function mapGeneticRisk(val: string | undefined): string | undefined {
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

/** Derive comorbidity count (0-2) from individual flags if not already set */
function mapComorbidities(s1: Step1Data): number | undefined {
  if (s1.comorbidityScore !== undefined && s1.comorbidityScore !== null) {
    return Math.min(2, Math.max(0, s1.comorbidityScore));
  }
  const n = [s1.hypertension, s1.hyperlipidemia, s1.coronaryArteryDisease, s1.diabetes]
    .filter(v => v === 1).length;
  if (n === 0 && !s1.hypertension && !s1.hyperlipidemia && !s1.coronaryArteryDisease && !s1.diabetes) {
    return undefined; // none of the fields were answered
  }
  return Math.min(2, n);
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

  const ipss = s1.ipss || [];
  const shim = s1.shim || [];
  // pathwayMode used only to guard Part 2 field inclusion (not stored in REDCap)
  const pathwayMode = inferPathwayMode(session.pathwayMode, session.step2);
  void pathwayMode; // suppress unused-variable warning — kept for future conditional logic

  // Store exactly what the user entered — no unit conversion
  const weightLbs: number | undefined = s1.weightUnit === 'lbs' && s1.weight ? s1.weight : undefined;
  const weightKg: number | undefined =
    s1.weightUnit === 'kg' && s1.weight ? s1.weight :
    s1.weightKg != null ? s1.weightKg : undefined;

  // ── Build the record — raw patient inputs only ────────────────────────────
  const record: RedcapRecord = {
    record_id: sessionId,

    // Demographics
    age:  s1.age,
    race: s1.race,

    // Family & genetic risk — pass through as-is (0, 1, 2, or 'unknown')
    family_history:  s1.familyHistory !== undefined && s1.familyHistory !== null
      ? (s1.familyHistory === 'unknown' ? 'unknown' : Math.min(2, Number(s1.familyHistory)))
      : undefined,
    inflammation_hx: s1.inflammationHistory,
    genetic_risk:    mapGeneticRisk(s1.brcaStatus),

    // Body — store whichever unit the user entered; parse strings from form input
    height_ft:  s1.heightUnit === 'imperial' && s1.heightFt != null ? parseInt(String(s1.heightFt), 10) || undefined : undefined,
    height_in:  s1.heightUnit === 'imperial' && s1.heightIn != null ? parseInt(String(s1.heightIn), 10)  || undefined : undefined,
    height_cm:  s1.heightUnit === 'metric'   && s1.heightCm != null ? parseFloat(String(s1.heightCm))    || undefined : undefined,
    weight_lbs: weightLbs,
    weight_kg:  weightKg,

    // Lifestyle
    exercise:          s1.exercise,
    smoking:           s1.smoking,
    chemical_exposure: s1.chemicalExposure,
    diet_pattern:      mapDietPattern(s1.dietPattern),
    comorbidities:     mapComorbidities(s1),

    // IPSS Q1–Q7
    incomplete_emptying: ipss[0],
    frequency:           ipss[1],
    intermittency:       ipss[2],
    urgency:             ipss[3],
    weak_stream:         ipss[4],
    straining:           ipss[5],
    nocturia:            ipss[6],
    quality_of_life:     s1.ipssQol,

    // SHIM Q1–Q5
    erection_confidence:  shim[0],
    erection_penetration: shim[1],
    maintain_erection:    shim[2],
    complete_erection:    shim[3],
    satisfactory:         shim[4],

    // PSA & MRI
    psa:                   s2.psa ? parseFloat(s2.psa) : undefined,
    on_hormonal_therapy:   s2.onHormonalTherapy !== undefined ? (s2.onHormonalTherapy ? 1 : 0) : undefined,
    hormonal_therapy_type: s2.hormonalTherapyType || undefined,
    pirads:                s2.pirads ? parseInt(s2.pirads, 10) : undefined,
    prostate_volume:       s2.prostateVolume ? parseFloat(String(s2.prostateVolume)) : undefined,
  };

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
        { record_id: record.record_id }
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
  result?: Part1Result;
  step2?: Step2Data;
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
      step1:       data.step1,
      step2:       data.step2,
      pathwayMode: data.pathwayMode,
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
