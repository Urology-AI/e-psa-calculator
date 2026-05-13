/**
 * sinaiCohort.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * STATELESS REDCap submission path for the Mount Sinai clinic cohort.
 *
 * Differences from the public cohort path (redcapSync.ts):
 *   - No Firestore session document is created.
 *   - No `users/{uid}` document is written.
 *   - Form data exists only in function memory during the request, then is
 *     discarded. The only persistent state is the `clinicCodes/{code}` audit
 *     row, which contains NO clinical data — only:
 *       { used, usedAt, sessionId, redcapRecordId }
 *
 * IRB STUDY-14-00050: this path supports the Sinai-recruited cohort.
 *
 * Required Firebase config:
 *   firebase functions:config:set \
 *     redcap.sinai_api_url="https://redcap.mssm.edu/api/" \
 *     redcap.sinai_api_token="<sinai-project-token>"
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as https from 'https';
import * as querystring from 'querystring';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CLINIC_CODES_COLLECTION = 'clinicCodes';
const CODE_AUDIT_COLLECTION = 'clinicCodeAuditLog';

// Codes are stored under their normalized (uppercase, no separators) form.
// Display form is XXXX-XXXX-XXXX; we accept either on input.
const CODE_NORMALIZED_LENGTH = 12;
const CODE_CHARSET_RE = /^[A-Z0-9]+$/;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES (mirror what the public path uses; keep field shapes identical
// so the same REDCap data dictionary works for both cohorts)
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
  familyHistory?: number;
  inflammationHistory?: number;
  brcaStatus?: string;
  ipss?: number[];
  shim?: number[];
  exercise?: number;
  smoking?: number;
  chemicalExposure?: number;
  dietPattern?: string;
  hypertension?: number;
  hyperlipidemia?: number;
  coronaryArteryDisease?: number;
  diabetes?: number;
  comorbidityScore?: number;
}

interface Step2Data {
  psa?: string;
  knowPsa?: boolean;
  onHormonalTherapy?: boolean;
  hormonalTherapyType?: string;
  knowPirads?: boolean;
  pirads?: string;
  prostateVolume?: string | number | null;
}

interface Part1Result {
  score?: number;
  risk?: string;
  scoreRange?: string;
  modelVersion?: string;
}

type RedcapValue = string | number;
interface RedcapRecord {
  record_id: string;
  [key: string]: RedcapValue | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE NORMALIZATION + VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize an input code for lookup:
 *   - Uppercase
 *   - Strip whitespace, dashes, underscores
 * Returns null if the result is not a well-formed code.
 */
function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.replace(/[\s\-_]/g, '').toUpperCase();
  if (normalized.length !== CODE_NORMALIZED_LENGTH) return null;
  if (!CODE_CHARSET_RE.test(normalized)) return null;
  return normalized;
}

/**
 * Constant-time string comparison to avoid timing leaks on code lookups.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return crypto.timingSafeEqual(ab, bb);
}

interface ClinicCodeDoc {
  code: string;
  issuedBy: string;
  issuedAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp | null;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
  sessionId?: string;
  redcapRecordId?: string;
  revoked?: boolean;
  revokedAt?: admin.firestore.Timestamp;
  revokedReason?: string;
}

type CodeStatus =
  | 'valid'
  | 'not_found'
  | 'already_used'
  | 'expired'
  | 'revoked'
  | 'malformed';

interface CodeLookupResult {
  status: CodeStatus;
  doc?: ClinicCodeDoc;
  ref?: admin.firestore.DocumentReference;
}

async function lookupCode(rawCode: unknown): Promise<CodeLookupResult> {
  const normalized = normalizeCode(rawCode);
  if (!normalized) return { status: 'malformed' };

  const db = admin.firestore();
  const ref = db.collection(CLINIC_CODES_COLLECTION).doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'not_found' };

  const doc = snap.data() as ClinicCodeDoc;

  // Defense-in-depth: verify stored code matches the doc ID, in constant time
  if (!constantTimeEqual(doc.code, normalized)) {
    return { status: 'not_found' };
  }

  if (doc.revoked) return { status: 'revoked', doc, ref };
  if (doc.used) return { status: 'already_used', doc, ref };

  if (doc.expiresAt && doc.expiresAt.toMillis() < Date.now()) {
    return { status: 'expired', doc, ref };
  }

  return { status: 'valid', doc, ref };
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// In-memory per-instance rate limit. Keyed on a stable identifier (auth UID
// when present, otherwise hashed IP). This is best-effort — Cloud Functions
// instances are independent — but raises the cost of brute-force attempts.
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATE_WINDOW_MS = 60 * 1000;
const VALIDATE_MAX_PER_WINDOW = 10;
const SUBMIT_WINDOW_MS = 60 * 1000;
const SUBMIT_MAX_PER_WINDOW = 5;

interface RateEntry { count: number; resetAt: number; }
const validateRateMap = new Map<string, RateEntry>();
const submitRateMap = new Map<string, RateEntry>();

function rateLimit(
  map: Map<string, RateEntry>,
  key: string,
  windowMs: number,
  maxPerWindow: number
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxPerWindow) return false;
  entry.count++;
  return true;
}

function callerKey(context: functions.https.CallableContext): string {
  if (context.auth?.uid) return `uid:${context.auth.uid}`;
  const ip = context.rawRequest.ip || 'unknown';
  return `ip:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG (does not contain clinical data — only the action and outcome)
// ─────────────────────────────────────────────────────────────────────────────

async function logCodeAudit(
  action: 'validate' | 'submit' | 'submit_failed',
  outcome: CodeStatus | 'submitted' | 'redcap_error',
  details: {
    normalizedCode?: string;
    callerKey: string;
    sessionId?: string;
    redcapRecordId?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    await admin.firestore().collection(CODE_AUDIT_COLLECTION).add({
      action,
      outcome,
      // Store only a short hash prefix of the code — enough to correlate with
      // the clinicCodes doc but not enough to brute-force from the audit log.
      codeHashPrefix: details.normalizedCode
        ? crypto.createHash('sha256').update(details.normalizedCode).digest('hex').slice(0, 12)
        : null,
      callerKey: details.callerKey,
      sessionId: details.sessionId ?? null,
      redcapRecordId: details.redcapRecordId ?? null,
      errorMessage: details.errorMessage ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // Audit write failure must not break the user flow, but log it
    functions.logger.warn('Failed to write clinic code audit log', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REDCAP FIELD MAPPER (Sinai cohort)
// Identical shape to the public mapper; adds data_source='sinai_clinic'.
// ─────────────────────────────────────────────────────────────────────────────

function mapBrcaStatus(val: string | undefined): string | undefined {
  if (!val) return undefined;
  if (val === 'unknown') return 'unknown';
  if (val === 'none') return 'no';
  return 'yes';
}

function mapDietPattern(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.replace(/-/g, '_');
}

function inferPathwayMode(stored: string | undefined, s2: Step2Data | undefined): string {
  if (stored) return stored;
  if (!s2) return 'pre_psa';
  if (s2.knowPirads && s2.pirads && s2.pirads !== '0') return 'post_mri';
  if (s2.knowPsa && s2.psa) return 'post_psa';
  return 'pre_psa';
}

interface SinaiSubmissionPayload {
  clinicCode: string;
  step1: Step1Data;
  result: Part1Result;
  step2?: Step2Data;
  finalCategory?: string;
  finalScore?: number;
  pathwayMode?: string;
  sessionId?: string;
}

function mapPayloadToRedcap(
  recordId: string,
  data: SinaiSubmissionPayload
): RedcapRecord {
  const s1 = data.step1 || {};
  const s2 = data.step2 || {};
  const r1 = data.result || {};
  const ipss = s1.ipss || [];
  const shim = s1.shim || [];

  const pathwayMode = inferPathwayMode(data.pathwayMode, data.step2);

  const psaRaw = s2.psa ? parseFloat(s2.psa) : undefined;
  const isOn5ari =
    s2.onHormonalTherapy === true &&
    (s2.hormonalTherapyType === 'finasteride' || s2.hormonalTherapyType === 'dutasteride');
  const psaAdjusted = psaRaw !== undefined && isOn5ari ? psaRaw * 2 : psaRaw;

  const prostateVol = s2.prostateVolume
    ? parseFloat(String(s2.prostateVolume))
    : undefined;
  const effectivePsa = psaAdjusted ?? psaRaw;
  const psadValue =
    prostateVol !== undefined && effectivePsa !== undefined && prostateVol > 0
      ? parseFloat((effectivePsa / prostateVol).toFixed(3))
      : undefined;
  const psadFlag = psadValue !== undefined ? (psadValue > 0.177 ? 1 : 0) : undefined;

  const record: RedcapRecord = {
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

  if (data.step2) {
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
    record.part2_risk_cat = data.finalCategory;
    record.part2_total_pts = data.finalScore;
  }

  return Object.fromEntries(
    Object.entries(record).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  ) as RedcapRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// REDCAP HTTP POST (no extra deps)
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
    try { url = new URL(apiUrl); } catch {
      return reject(new Error(`Invalid Sinai REDCap URL: "${apiUrl}"`));
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
          if (json.error) return reject(new Error(`REDCap rejected: ${json.error}`));
          functions.logger.info(`Sinai REDCap: ${json.count ?? 0} record(s) written`);
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

function getSinaiConfig(): { apiUrl: string; apiToken: string } | null {
  const cfg = functions.config() as {
    redcap?: { sinai_api_url?: string; sinai_api_token?: string };
  };
  const apiUrl = cfg.redcap?.sinai_api_url;
  const apiToken = cfg.redcap?.sinai_api_token;
  if (!apiUrl || !apiToken) return null;
  return { apiUrl, apiToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE  —  validateClinicCode
// Returns whether a code is usable. Does NOT mark it used.
// Returns a generic "invalid" status for any non-valid case so the client
// can't distinguish "wrong code" from "expired" from "already used" — this
// prevents enumeration. Admins see the real status in the audit log.
// ─────────────────────────────────────────────────────────────────────────────

interface ValidateInput {
  code?: unknown;
}

interface ValidateResult {
  valid: boolean;
  reason?: 'malformed' | 'invalid';
}

export const validateClinicCode = functions.https.onCall(
  async (data: ValidateInput, context): Promise<ValidateResult> => {
    const key = callerKey(context);
    if (!rateLimit(validateRateMap, key, VALIDATE_WINDOW_MS, VALIDATE_MAX_PER_WINDOW)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many validation attempts. Please wait a minute and try again.'
      );
    }

    const normalized = normalizeCode(data?.code);
    if (!normalized) {
      await logCodeAudit('validate', 'malformed', { callerKey: key });
      return { valid: false, reason: 'malformed' };
    }

    const lookup = await lookupCode(normalized);
    await logCodeAudit('validate', lookup.status, {
      normalizedCode: normalized,
      callerKey: key,
    });

    return {
      valid: lookup.status === 'valid',
      reason: lookup.status === 'valid' ? undefined : 'invalid',
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE  —  submitSinaiCohort
// Validates the code, atomically claims it, pushes the record to Sinai REDCap,
// and records ONLY the audit row in Firestore. Form data is never persisted.
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitResult {
  success: true;
  redcapRecordId: string;
}

export const submitSinaiCohort = functions.https.onCall(
  async (data: SinaiSubmissionPayload, context): Promise<SubmitResult> => {
    const key = callerKey(context);
    if (!rateLimit(submitRateMap, key, SUBMIT_WINDOW_MS, SUBMIT_MAX_PER_WINDOW)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many submission attempts. Please wait a minute and try again.'
      );
    }

    // ── 1. Minimal input validation ────────────────────────────────────────
    if (!data || typeof data !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing payload');
    }
    if (!data.step1 || typeof data.step1 !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing step1 data');
    }

    const normalized = normalizeCode(data.clinicCode);
    if (!normalized) {
      await logCodeAudit('submit_failed', 'malformed', { callerKey: key });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid clinic code format.'
      );
    }

    const config = getSinaiConfig();
    if (!config) {
      functions.logger.error(
        'submitSinaiCohort: Sinai REDCap config missing. ' +
        'Run: firebase functions:config:set ' +
        'redcap.sinai_api_url="..." redcap.sinai_api_token="..."'
      );
      throw new functions.https.HttpsError(
        'unavailable',
        'Mount Sinai research submission is not configured on this server.'
      );
    }

    const db = admin.firestore();
    const codeRef = db.collection(CLINIC_CODES_COLLECTION).doc(normalized);
    const recordId = data.sessionId || crypto.randomUUID();

    // ── 2. Atomically claim the code (prevent double-use under concurrency)
    // The transaction marks the code used BEFORE the REDCap POST. If the POST
    // later fails, we roll back via a second transaction.
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        if (!snap.exists) {
          throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
        }
        const doc = snap.data() as ClinicCodeDoc;
        if (doc.revoked) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has been revoked.');
        }
        if (doc.used) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has already been used.');
        }
        if (doc.expiresAt && doc.expiresAt.toMillis() < Date.now()) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has expired.');
        }
        if (!constantTimeEqual(doc.code, normalized)) {
          throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
        }
        tx.update(codeRef, {
          used: true,
          usedAt: admin.firestore.FieldValue.serverTimestamp(),
          sessionId: recordId,
          submittedToRedcap: false, // flipped to true after a successful POST
        });
      });
    } catch (err) {
      if (err instanceof functions.https.HttpsError) {
        await logCodeAudit('submit_failed', 'not_found', {
          normalizedCode: normalized,
          callerKey: key,
          errorMessage: err.message,
        });
        throw err;
      }
      functions.logger.error('submitSinaiCohort: code claim transaction failed', err);
      throw new functions.https.HttpsError('internal', 'Could not validate clinic code. Please try again.');
    }

    // ── 3. Map + POST to REDCap. On failure, roll back the code claim. ────
    try {
      const record = mapPayloadToRedcap(recordId, data);
      // Diagnostic log — record_id only, no clinical fields
      functions.logger.info(`Sinai submission: record_id=${recordId} pathway=${record.pathway_mode}`);

      await postToRedcap(config.apiUrl, config.apiToken, [record]);

      // Mark the submission landed in REDCap
      await codeRef.update({
        submittedToRedcap: true,
        redcapRecordId: recordId,
        redcapSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await logCodeAudit('submit', 'submitted', {
        normalizedCode: normalized,
        callerKey: key,
        sessionId: recordId,
        redcapRecordId: recordId,
      });

      return { success: true, redcapRecordId: recordId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      functions.logger.error(`Sinai submission FAILED record_id=${recordId}: ${errMsg}`);

      // Roll back the code claim so the patient can retry
      await codeRef.update({
        used: false,
        usedAt: admin.firestore.FieldValue.delete(),
        sessionId: admin.firestore.FieldValue.delete(),
        lastSubmitError: errMsg,
        lastSubmitErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch((rollbackErr: Error) =>
        functions.logger.warn('Failed to roll back clinic code claim', rollbackErr)
      );

      await logCodeAudit('submit_failed', 'redcap_error', {
        normalizedCode: normalized,
        callerKey: key,
        sessionId: recordId,
        errorMessage: errMsg,
      });

      throw new functions.https.HttpsError(
        'internal',
        'Could not submit to Mount Sinai REDCap. Please try again, or contact the study team if the problem persists.'
      );
    }
  }
);
