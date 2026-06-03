/**
 * sinaiCohort.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * REDCap submission path for the Mount Sinai clinic cohort
 * (IRB Protocol STUDY-14-00050).
 *
 * Data model
 * ──────────
 *   clinicCodes/{normalizedCode}    — lifecycle audit row (admin-managed
 *                                     code roster; no clinical data)
 *   clinicCodeAuditLog/{id}         — append-only events (no PHI)
 *   sinaiSessions/{sessionId}       — clinical responses for this cohort,
 *                                     identified ONLY by clinic code. No
 *                                     names, MRNs, or other PII. Auto-
 *                                     deleted after SINAI_SESSION_TTL_DAYS
 *                                     via the Firestore TTL policy on the
 *                                     `expiresAt` field.
 *
 * Required Firebase config
 * ────────────────────────
 *   firebase functions:config:set \
 *     redcap.sinai_api_url="https://redcap.mssm.edu/api/" \
 *     redcap.sinai_api_token="<sinai-project-token>"
 *
 * Required GCP setup (one-time)
 * ─────────────────────────────
 *   gcloud firestore fields ttls update expiresAt \
 *     --collection-group=sinaiSessions --enable-ttl
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
const SINAI_SESSIONS_COLLECTION = 'sinaiSessions';
const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_SINAI_DOC = 'sinai';

// How long Sinai session data is retained for processing. Firestore TTL
// policy on `sinaiSessions.expiresAt` does the actual deletion.
export const SINAI_SESSION_TTL_DAYS = 30;
const TTL_MS = SINAI_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

// Codes are stored under their normalized (uppercase, no separators) form.
// Display form is XXXX-XXXX-XXXX; we accept either on input.
const CODE_NORMALIZED_LENGTH = 12;
const CODE_CHARSET_RE = /^[A-Z0-9]+$/;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Data {
  age?: number;
  race?: string;
  ethnicity?: string;
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
  submittedToRedcap?: boolean;
  submittedOffline?: boolean;
  redcapSubmittedAt?: admin.firestore.Timestamp;
  redcapManuallyImportedAt?: admin.firestore.Timestamp | null;
  redcapImportedBy?: string;
  redcapImportNotes?: string | null;
  lastSubmitError?: string;
  lastSubmitErrorAt?: admin.firestore.Timestamp;
}

type SinaiSessionStatus =
  | 'pending'                  // captured locally; awaiting REDCap submission
  | 'submitted_redcap'         // POST to Sinai REDCap succeeded
  | 'imported_manually'        // admin marked as imported after manual upload
  | 'redcap_error';            // last REDCap POST failed; ready for retry

interface SinaiSessionDoc {
  clinicCode: string;
  status: SinaiSessionStatus;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp; // Firestore TTL target
  pathwayMode: string;
  step1: Step1Data;
  result: Part1Result;
  step2?: Step2Data;
  finalCategory?: string;
  finalScore?: number;
  redcapRecordId?: string;
  redcapSubmittedAt?: admin.firestore.Timestamp;
  redcapError?: string;
  redcapErrorAt?: admin.firestore.Timestamp;
  importedAt?: admin.firestore.Timestamp;
  importedBy?: string;
  importNotes?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: CODE NORMALIZATION + VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.replace(/[\s\-_]/g, '').toUpperCase();
  if (normalized.length !== CODE_NORMALIZED_LENGTH) return null;
  if (!CODE_CHARSET_RE.test(normalized)) return null;
  return normalized;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

type CodeStatus =
  | 'valid'
  | 'not_found'
  | 'already_used'
  | 'expired'
  | 'revoked'
  | 'malformed';

async function lookupCode(rawCode: unknown): Promise<{
  status: CodeStatus;
  doc?: ClinicCodeDoc;
  ref?: admin.firestore.DocumentReference;
}> {
  const normalized = normalizeCode(rawCode);
  if (!normalized) return { status: 'malformed' };

  const ref = admin.firestore().collection(CLINIC_CODES_COLLECTION).doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'not_found' };

  const doc = snap.data() as ClinicCodeDoc;
  if (!constantTimeEqual(doc.code, normalized)) return { status: 'not_found' };
  if (doc.revoked) return { status: 'revoked', doc, ref };
  if (doc.used) return { status: 'already_used', doc, ref };
  if (doc.expiresAt && doc.expiresAt.toMillis() < Date.now()) {
    return { status: 'expired', doc, ref };
  }
  return { status: 'valid', doc, ref };
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING (per-instance, best-effort)
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
// AUDIT LOG (no PHI — only lifecycle events)
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'validate'
  | 'submit'
  | 'submit_failed'
  | 'redcap_retry'
  | 'mark_imported'
  | 'delete_session'
  | 'admin_view'
  | 'admin_mint_codes'
  | 'admin_revoke_code'
  | 'admin_toggle_flag'
  | 'link_public_to_sinai';

export type AuditOutcome =
  | CodeStatus
  | 'submitted_redcap'
  | 'submitted_pending'
  | 'redcap_error'
  | 'marked_imported'
  | 'deleted'
  | 'minted'
  | 'revoked'
  | 'toggled'
  | 'unauthorized'
  | 'linked'
  | 'ok';

async function logCodeAudit(
  action: AuditAction,
  outcome: AuditOutcome,
  details: {
    normalizedCode?: string;
    callerKey: string;
    sessionId?: string;
    redcapRecordId?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await admin.firestore().collection(CODE_AUDIT_COLLECTION).add({
      action,
      outcome,
      codeHashPrefix: details.normalizedCode
        ? crypto.createHash('sha256').update(details.normalizedCode).digest('hex').slice(0, 12)
        : null,
      callerKey: details.callerKey,
      sessionId: details.sessionId ?? null,
      redcapRecordId: details.redcapRecordId ?? null,
      errorMessage: details.errorMessage ?? null,
      metadata: details.metadata ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    functions.logger.warn('Failed to write clinic code audit log', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN AUTHORIZATION (mirrors firestore.rules isAuthorizedAdmin())
// ─────────────────────────────────────────────────────────────────────────────

interface AdminAuth {
  allowed: boolean;
  uid: string | null;
  email: string | null;
}

export interface AuthorizedAdmin {
  allowed: true;
  uid: string;
  email: string | null;
}

export async function requireAdmin(
  context: functions.https.CallableContext
): Promise<AuthorizedAdmin> {
  const auth = await checkAdmin(context);
  if (!auth.allowed || !auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'This action requires study team access.'
    );
  }
  return { allowed: true, uid: auth.uid, email: auth.email };
}

async function checkAdmin(context: functions.https.CallableContext): Promise<AdminAuth> {
  if (!context.auth) return { allowed: false, uid: null, email: null };
  const uid = context.auth.uid;
  const email = (context.auth.token.email as string | undefined) ?? null;

  if (email) {
    const lower = email.toLowerCase();
    if (lower.endsWith('@mountsinai.org') || lower.endsWith('@mssm.edu')) {
      return { allowed: true, uid, email };
    }
    if (lower === 'aditya.dixit@mssm.edu' || lower === 'adixit@nyu.edu') {
      return { allowed: true, uid, email };
    }
  }

  try {
    const snap = await admin.firestore().collection('admins').doc(uid).get();
    const data = snap.data() as { isActive?: boolean } | undefined;
    if (data?.isActive === true) return { allowed: true, uid, email };
  } catch (e) {
    functions.logger.warn('checkAdmin: admins/ lookup failed', e);
  }
  return { allowed: false, uid, email };
}

// ─────────────────────────────────────────────────────────────────────────────
// REDCAP FIELD MAPPER + HTTP POST
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

function mapPayloadToRedcap(
  recordId: string,
  payload: {
    step1?: Step1Data;
    step2?: Step2Data;
    result?: Part1Result;
    finalCategory?: string;
    finalScore?: number;
    pathwayMode?: string;
  }
): RedcapRecord {
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
      s1.weightUnit === 'kg' ? s1.weight : s1.weightKg !== null ? s1.weightKg : undefined,
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

  return Object.fromEntries(
    Object.entries(record).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  ) as RedcapRecord;
}

interface RedcapApiResponse { count?: number; error?: string; }

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

function getSinaiRedcapConfig(): { apiUrl: string; apiToken: string } | null {
  const cfg = functions.config() as {
    redcap?: { sinai_api_url?: string; sinai_api_token?: string };
  };
  const apiUrl = cfg.redcap?.sinai_api_url;
  const apiToken = cfg.redcap?.sinai_api_token;
  if (!apiUrl || !apiToken) return null;
  return { apiUrl, apiToken };
}

async function readRedcapEnabledFlag(): Promise<boolean> {
  try {
    const snap = await admin.firestore()
      .collection(APP_CONFIG_COLLECTION)
      .doc(APP_CONFIG_SINAI_DOC)
      .get();
    if (!snap.exists) return false;
    const data = snap.data() as { redcapEnabled?: boolean } | undefined;
    return data?.redcapEnabled === true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE  —  validateClinicCode
// Generic invalid/valid response to prevent code enumeration.
// ─────────────────────────────────────────────────────────────────────────────

interface ValidateInput { code?: unknown; }
interface ValidateResult { valid: boolean; reason?: 'malformed' | 'invalid'; }

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
// CALLABLE  —  submitSinaiSession  (UNIFIED entry point)
//
// 1. Atomically claims the clinic code.
// 2. Writes the full session payload to sinaiSessions/{sessionId}.
// 3. If appConfig.sinai.redcapEnabled, POSTs to Sinai REDCap and updates
//    status='submitted_redcap'. Otherwise status stays 'pending' and admin
//    can submit later from the dashboard.
//
// Returns: { sessionId, redcapSubmitted, redcapRecordId?, ttlDays }
// ─────────────────────────────────────────────────────────────────────────────

export interface SinaiSubmitPayload {
  clinicCode: string;
  sessionId?: string;
  step1: Step1Data;
  result: Part1Result;
  step2?: Step2Data;
  finalCategory?: string;
  finalScore?: number;
  pathwayMode?: string;
}

export interface SinaiSubmitResult {
  ok: true;
  sessionId: string;
  redcapSubmitted: boolean;
  redcapRecordId?: string;
  ttlDays: number;
}

export const submitSinaiSession = functions.https.onCall(
  async (data: SinaiSubmitPayload, context): Promise<SinaiSubmitResult> => {
    const key = callerKey(context);
    if (!rateLimit(submitRateMap, key, SUBMIT_WINDOW_MS, SUBMIT_MAX_PER_WINDOW)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many submission attempts. Please wait a minute and try again.'
      );
    }

    if (!data || typeof data !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing payload');
    }
    if (!data.step1 || typeof data.step1 !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing step1 data');
    }

    const normalized = normalizeCode(data.clinicCode);
    if (!normalized) {
      await logCodeAudit('submit_failed', 'malformed', { callerKey: key });
      throw new functions.https.HttpsError('invalid-argument', 'Invalid clinic code format.');
    }

    const db = admin.firestore();
    const codeRef = db.collection(CLINIC_CODES_COLLECTION).doc(normalized);
    const sessionId = data.sessionId || crypto.randomUUID();
    const sessionRef = db.collection(SINAI_SESSIONS_COLLECTION).doc(sessionId);

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + TTL_MS);

    // 1. Atomically claim the code AND write the session in the same transaction
    try {
      await db.runTransaction(async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
        }
        const codeDoc = codeSnap.data() as ClinicCodeDoc;
        if (codeDoc.revoked) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has been revoked.');
        }
        if (codeDoc.used) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has already been used.');
        }
        if (codeDoc.expiresAt && codeDoc.expiresAt.toMillis() < Date.now()) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has expired.');
        }
        if (!constantTimeEqual(codeDoc.code, normalized)) {
          throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
        }

        const pathwayMode = inferPathwayMode(data.pathwayMode, data.step2);

        const sessionDoc: SinaiSessionDoc = {
          clinicCode: normalized,
          status: 'pending',
          createdAt: now,
          expiresAt,
          pathwayMode,
          step1: data.step1,
          result: data.result,
          ...(data.step2 ? { step2: data.step2 } : {}),
          ...(data.finalCategory ? { finalCategory: data.finalCategory } : {}),
          ...(data.finalScore !== undefined ? { finalScore: data.finalScore } : {}),
        };

        tx.set(sessionRef, sessionDoc);
        tx.update(codeRef, {
          used: true,
          usedAt: now,
          sessionId,
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
      functions.logger.error('submitSinaiSession: claim transaction failed', err);
      throw new functions.https.HttpsError('internal', 'Could not claim clinic code. Please try again.');
    }

    // 2. Decide whether to attempt live REDCap submission
    const redcapEnabled = await readRedcapEnabledFlag();
    const redcapConfig = redcapEnabled ? getSinaiRedcapConfig() : null;

    if (!redcapEnabled || !redcapConfig) {
      await logCodeAudit('submit', 'submitted_pending', {
        normalizedCode: normalized,
        callerKey: key,
        sessionId,
      });
      return { ok: true, sessionId, redcapSubmitted: false, ttlDays: SINAI_SESSION_TTL_DAYS };
    }

    // 3. Attempt live REDCap POST. On failure, leave session in 'pending' so
    //    an admin can retry from the dashboard. The code claim is NOT rolled
    //    back here — the session data persists in Firestore for retry.
    try {
      const record = mapPayloadToRedcap(sessionId, data);
      functions.logger.info(`Sinai submission: record_id=${sessionId} pathway=${record.pathway_mode}`);
      await postToRedcap(redcapConfig.apiUrl, redcapConfig.apiToken, [record]);

      const submittedAt = admin.firestore.Timestamp.now();
      await sessionRef.update({
        status: 'submitted_redcap' satisfies SinaiSessionStatus,
        redcapRecordId: sessionId,
        redcapSubmittedAt: submittedAt,
      });
      await codeRef.update({
        submittedToRedcap: true,
        redcapRecordId: sessionId,
        redcapSubmittedAt: submittedAt,
      });

      await logCodeAudit('submit', 'submitted_redcap', {
        normalizedCode: normalized,
        callerKey: key,
        sessionId,
        redcapRecordId: sessionId,
      });

      return {
        ok: true,
        sessionId,
        redcapSubmitted: true,
        redcapRecordId: sessionId,
        ttlDays: SINAI_SESSION_TTL_DAYS,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      functions.logger.error(`Sinai REDCap POST failed (session ${sessionId}): ${errMsg}`);

      await sessionRef.update({
        status: 'redcap_error' satisfies SinaiSessionStatus,
        redcapError: errMsg,
        redcapErrorAt: admin.firestore.Timestamp.now(),
      });
      await codeRef.update({
        lastSubmitError: errMsg,
        lastSubmitErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await logCodeAudit('submit_failed', 'redcap_error', {
        normalizedCode: normalized,
        callerKey: key,
        sessionId,
        errorMessage: errMsg,
      });

      // Don't fail the patient submission — data is captured locally, admin
      // can retry from the dashboard.
      return {
        ok: true,
        sessionId,
        redcapSubmitted: false,
        ttlDays: SINAI_SESSION_TTL_DAYS,
      };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE  —  markCodeImported  (admin)
// Records that an admin manually imported a session's data into REDCap.
// Also updates the sinaiSessions doc status if it still exists.
// ─────────────────────────────────────────────────────────────────────────────

interface MarkImportedInput {
  code?: unknown;
  redcapRecordId?: unknown;
  notes?: unknown;
}
interface MarkImportedResult {
  ok: true;
  redcapRecordId: string;
}

export const markCodeImported = functions.https.onCall(
  async (data: MarkImportedInput, context): Promise<MarkImportedResult> => {
    const auth = await checkAdmin(context);
    if (!auth.allowed) {
      await logCodeAudit('mark_imported', 'unauthorized', {
        callerKey: auth.uid ? `uid:${auth.uid}` : 'ip:unknown',
      });
      throw new functions.https.HttpsError('permission-denied', 'Only the study team may mark sessions as imported.');
    }

    const normalized = normalizeCode(data?.code);
    if (!normalized) throw new functions.https.HttpsError('invalid-argument', 'Invalid clinic code format.');

    const redcapRecordId =
      typeof data?.redcapRecordId === 'string' && data.redcapRecordId.length > 0
        ? data.redcapRecordId
        : null;
    if (!redcapRecordId) {
      throw new functions.https.HttpsError('invalid-argument', 'REDCap record ID is required.');
    }

    const notes =
      typeof data?.notes === 'string' && data.notes.length > 0 && data.notes.length <= 500
        ? data.notes
        : null;

    const db = admin.firestore();
    const codeRef = db.collection(CLINIC_CODES_COLLECTION).doc(normalized);
    const importedAt = admin.firestore.Timestamp.now();

    let sessionId: string | undefined;
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        if (!snap.exists) {
          throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
        }
        const doc = snap.data() as ClinicCodeDoc;
        if (doc.redcapManuallyImportedAt) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'This session has already been marked as imported.'
          );
        }
        sessionId = doc.sessionId;
        tx.update(codeRef, {
          redcapRecordId,
          redcapManuallyImportedAt: importedAt,
          redcapImportedBy: auth.email ?? auth.uid,
          redcapImportNotes: notes,
        });
      });

      // Also update the sinaiSessions doc if it still exists
      if (sessionId) {
        await db.collection(SINAI_SESSIONS_COLLECTION).doc(sessionId).update({
          status: 'imported_manually' satisfies SinaiSessionStatus,
          redcapRecordId,
          importedAt,
          importedBy: auth.email ?? auth.uid,
          importNotes: notes,
        }).catch((e: Error) =>
          functions.logger.warn(`markCodeImported: session ${sessionId} not updated`, e)
        );
      }

      await logCodeAudit('mark_imported', 'marked_imported', {
        normalizedCode: normalized,
        callerKey: auth.uid ? `uid:${auth.uid}` : 'admin',
        sessionId,
        redcapRecordId,
      });

      return { ok: true, redcapRecordId };
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      functions.logger.error('markCodeImported: transaction failed', err);
      throw new functions.https.HttpsError('internal', 'Could not mark session as imported.');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED INTERNAL UTILITIES (used by sinaiAdmin.ts)
// ─────────────────────────────────────────────────────────────────────────────

export const _internal = {
  SINAI_SESSIONS_COLLECTION,
  CLINIC_CODES_COLLECTION,
  APP_CONFIG_COLLECTION,
  APP_CONFIG_SINAI_DOC,
  normalizeCode,
  checkAdmin,
  logCodeAudit,
  mapPayloadToRedcap,
  postToRedcap,
  getSinaiRedcapConfig,
  TTL_MS,
};
