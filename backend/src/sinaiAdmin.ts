/**
 * sinaiAdmin.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only callables for managing the Mount Sinai clinic-cohort flow.
 *
 *   adminListSinaiSessions          — paginated session list with status
 *   adminGetSinaiSession            — full read of one session (also logs)
 *   adminSubmitSinaiSession         — retry REDCap submission for one session
 *   adminDeleteSinaiSession         — manual early purge before TTL
 *   adminToggleSinaiRedcapEnabled   — flip appConfig/sinai.redcapEnabled
 *   adminGenerateClinicCodes        — mint new codes (was a CLI script)
 *   adminRevokeClinicCode           — revoke a code
 *   adminListClinicCodeAuditLog     — paginated audit log read
 *
 * Every admin action that touches clinical data writes an entry to
 * `adminAccessLog/{id}` so IRB can see who looked at what, when.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { requireAdmin, SINAI_SESSION_TTL_DAYS, _internal } from './sinaiCohort';

const {
  SINAI_SESSIONS_COLLECTION,
  CLINIC_CODES_COLLECTION,
  APP_CONFIG_COLLECTION,
  APP_CONFIG_SINAI_DOC,
  normalizeCode,
  logCodeAudit,
  mapPayloadToRedcap,
  postToRedcap,
  getSinaiRedcapConfig,
} = _internal;

const ADMIN_ACCESS_LOG_COLLECTION = 'adminAccessLog';

// ─────────────────────────────────────────────────────────────────────────────
// Access log (per-admin action audit; no PHI — metadata only)
// ─────────────────────────────────────────────────────────────────────────────

async function logAdminAccess(
  adminUid: string,
  adminEmail: string | null,
  action: string,
  resource: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await admin.firestore().collection(ADMIN_ACCESS_LOG_COLLECTION).add({
      adminUid,
      adminEmail,
      action,
      resource,
      resourceId,
      metadata: metadata ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    functions.logger.warn('Failed to write admin access log', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// adminListSinaiSessions
// Paginated list of sinaiSessions documents joined with the clinic code's
// audit row. Supports filtering by status.
// ─────────────────────────────────────────────────────────────────────────────

interface ListSessionsInput {
  status?: 'all' | 'pending' | 'submitted_redcap' | 'imported_manually' | 'redcap_error';
  limit?: number;
  startAfterMillis?: number;
}

interface SessionSummary {
  sessionId: string;
  clinicCode: string;
  status: string;
  createdAtMillis: number;
  expiresAtMillis: number;
  pathwayMode: string;
  redcapRecordId?: string;
  redcapSubmittedAtMillis?: number;
  redcapError?: string;
  importedAtMillis?: number;
  importedBy?: string;
  finalCategory?: string;
  finalScore?: number;
  // Brief peek so the table can show a few fields without a full fetch
  age?: number;
  race?: string;
}

interface ListSessionsResult {
  sessions: SessionSummary[];
  nextStartAfterMillis: number | null;
}

export const adminListSinaiSessions = functions.https.onCall(
  async (data: ListSessionsInput, context): Promise<ListSessionsResult> => {
    const auth = await requireAdmin(context);
    const limit = Math.max(1, Math.min(200, data?.limit ?? 50));

    let q: admin.firestore.Query = admin.firestore()
      .collection(SINAI_SESSIONS_COLLECTION)
      .orderBy('createdAt', 'desc');

    if (data?.status && data.status !== 'all') {
      q = q.where('status', '==', data.status);
    }
    if (typeof data?.startAfterMillis === 'number') {
      q = q.startAfter(admin.firestore.Timestamp.fromMillis(data.startAfterMillis));
    }
    q = q.limit(limit);

    const snap = await q.get();
    const sessions: SessionSummary[] = snap.docs.map((d) => {
      const doc = d.data() as Record<string, unknown>;
      const step1 = (doc.step1 ?? {}) as { age?: number; race?: string };
      return {
        sessionId: d.id,
        clinicCode: String(doc.clinicCode ?? ''),
        status: String(doc.status ?? 'pending'),
        createdAtMillis: (doc.createdAt as admin.firestore.Timestamp)?.toMillis() ?? 0,
        expiresAtMillis: (doc.expiresAt as admin.firestore.Timestamp)?.toMillis() ?? 0,
        pathwayMode: String(doc.pathwayMode ?? ''),
        redcapRecordId: doc.redcapRecordId as string | undefined,
        redcapSubmittedAtMillis:
          (doc.redcapSubmittedAt as admin.firestore.Timestamp | undefined)?.toMillis(),
        redcapError: doc.redcapError as string | undefined,
        importedAtMillis: (doc.importedAt as admin.firestore.Timestamp | undefined)?.toMillis(),
        importedBy: doc.importedBy as string | undefined,
        finalCategory: doc.finalCategory as string | undefined,
        finalScore: doc.finalScore as number | undefined,
        age: step1.age,
        race: step1.race,
      };
    });

    const nextStartAfterMillis =
      sessions.length === limit ? sessions[sessions.length - 1].createdAtMillis : null;

    await logAdminAccess(auth.uid, auth.email, 'list_sessions', 'sinaiSessions', 'list', {
      status: data?.status ?? 'all',
      count: sessions.length,
    });

    return { sessions, nextStartAfterMillis };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminGetSinaiSession
// Full read of one session. Logs an access entry so IRB can see who viewed
// which session.
// ─────────────────────────────────────────────────────────────────────────────

interface GetSessionInput { sessionId?: unknown; }

export const adminGetSinaiSession = functions.https.onCall(
  async (data: GetSessionInput, context) => {
    const auth = await requireAdmin(context);
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : null;
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
    }

    const ref = admin.firestore().collection(SINAI_SESSIONS_COLLECTION).doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Session not found. It may have been deleted or expired (30-day TTL).'
      );
    }

    await logAdminAccess(auth.uid, auth.email, 'view_session', 'sinaiSessions', sessionId);

    const doc = snap.data() as Record<string, unknown>;
    // Convert Timestamps to millis for the client
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(doc)) {
      if (v instanceof admin.firestore.Timestamp) out[k] = v.toMillis();
      else out[k] = v;
    }
    out['_id'] = sessionId;
    return out;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminSubmitSinaiSession
// Retry REDCap submission for a session whose status is 'pending' or
// 'redcap_error'. Useful after enabling the live flag, fixing a token, or
// retrying a transient REDCap outage.
// ─────────────────────────────────────────────────────────────────────────────

interface AdminSubmitInput { sessionId?: unknown; }

export const adminSubmitSinaiSession = functions.https.onCall(
  async (data: AdminSubmitInput, context) => {
    const auth = await requireAdmin(context);
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : null;
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
    }

    const cfg = getSinaiRedcapConfig();
    if (!cfg) {
      throw new functions.https.HttpsError(
        'unavailable',
        'Sinai REDCap is not configured. Set redcap.sinai_api_url and redcap.sinai_api_token.'
      );
    }

    const db = admin.firestore();
    const sessionRef = db.collection(SINAI_SESSIONS_COLLECTION).doc(sessionId);
    const snap = await sessionRef.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found or expired.');
    }
    const doc = snap.data() as Record<string, unknown>;
    if (doc.status === 'submitted_redcap' || doc.status === 'imported_manually') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This session has already been recorded in REDCap.'
      );
    }

    try {
      const record = mapPayloadToRedcap(sessionId, {
        step1: doc.step1 as Record<string, unknown>,
        step2: doc.step2 as Record<string, unknown> | undefined,
        result: doc.result as Record<string, unknown>,
        finalCategory: doc.finalCategory as string | undefined,
        finalScore: doc.finalScore as number | undefined,
        pathwayMode: doc.pathwayMode as string | undefined,
      });
      await postToRedcap(cfg.apiUrl, cfg.apiToken, [record]);

      const submittedAt = admin.firestore.Timestamp.now();
      await sessionRef.update({
        status: 'submitted_redcap',
        redcapRecordId: sessionId,
        redcapSubmittedAt: submittedAt,
        redcapError: admin.firestore.FieldValue.delete(),
        redcapErrorAt: admin.firestore.FieldValue.delete(),
      });

      const clinicCode = String(doc.clinicCode ?? '');
      if (clinicCode) {
        await db.collection(CLINIC_CODES_COLLECTION).doc(clinicCode).update({
          submittedToRedcap: true,
          redcapRecordId: sessionId,
          redcapSubmittedAt: submittedAt,
          lastSubmitError: admin.firestore.FieldValue.delete(),
        }).catch((e: Error) => functions.logger.warn('clinicCodes update failed', e));
      }

      await logAdminAccess(auth.uid, auth.email, 'submit_session_redcap', 'sinaiSessions', sessionId, {
        outcome: 'success',
      });
      await logCodeAudit('redcap_retry', 'submitted_redcap', {
        normalizedCode: clinicCode,
        callerKey: `uid:${auth.uid}`,
        sessionId,
        redcapRecordId: sessionId,
      });

      return { ok: true as const, redcapRecordId: sessionId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await sessionRef.update({
        status: 'redcap_error',
        redcapError: errMsg,
        redcapErrorAt: admin.firestore.Timestamp.now(),
      });
      await logAdminAccess(auth.uid, auth.email, 'submit_session_redcap', 'sinaiSessions', sessionId, {
        outcome: 'error',
        errorMessage: errMsg,
      });
      throw new functions.https.HttpsError('internal', `REDCap submission failed: ${errMsg}`);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminDeleteSinaiSession
// Early manual purge of a session. The Firestore TTL would delete it
// automatically after 30 days; this lets admins clean up sooner.
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteSessionInput { sessionId?: unknown; reason?: unknown; }

export const adminDeleteSinaiSession = functions.https.onCall(
  async (data: DeleteSessionInput, context) => {
    const auth = await requireAdmin(context);
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : null;
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
    }
    const reason = typeof data?.reason === 'string' && data.reason.length <= 500 ? data.reason : null;

    const db = admin.firestore();
    const ref = db.collection(SINAI_SESSIONS_COLLECTION).doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found.');
    }
    const doc = snap.data() as Record<string, unknown>;
    const clinicCode = String(doc.clinicCode ?? '');

    await ref.delete();
    await logAdminAccess(auth.uid, auth.email, 'delete_session', 'sinaiSessions', sessionId, {
      reason,
      clinicCode,
    });
    await logCodeAudit('delete_session', 'deleted', {
      normalizedCode: clinicCode,
      callerKey: `uid:${auth.uid}`,
      sessionId,
      metadata: reason ? { reason } : undefined,
    });

    return { ok: true as const };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminToggleSinaiRedcapEnabled
// Flip appConfig/sinai.redcapEnabled. Frontend reads this flag to decide
// whether to attempt live REDCap submission or fall back to offline CSV.
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleFlagInput { enabled?: unknown; }

export const adminToggleSinaiRedcapEnabled = functions.https.onCall(
  async (data: ToggleFlagInput, context) => {
    const auth = await requireAdmin(context);
    const enabled = data?.enabled === true;

    await admin.firestore()
      .collection(APP_CONFIG_COLLECTION)
      .doc(APP_CONFIG_SINAI_DOC)
      .set(
        {
          redcapEnabled: enabled,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: auth.email ?? auth.uid,
        },
        { merge: true }
      );

    await logAdminAccess(auth.uid, auth.email, 'toggle_redcap_enabled', 'appConfig', APP_CONFIG_SINAI_DOC, {
      enabled,
    });
    await logCodeAudit('admin_toggle_flag', 'toggled', {
      callerKey: `uid:${auth.uid}`,
      metadata: { flag: 'redcapEnabled', value: enabled },
    });

    return { ok: true as const, redcapEnabled: enabled };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminGenerateClinicCodes
// Mints new clinic codes. Replaces the CLI script for use from the admin UI.
// ─────────────────────────────────────────────────────────────────────────────

interface GenerateCodesInput {
  count?: unknown;
  expiresInDays?: unknown;
}

interface GeneratedCode {
  code: string;
  display: string;
}

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const NORMALIZED_LENGTH = 12;

function randomCode(): string {
  const bytes = crypto.randomBytes(NORMALIZED_LENGTH);
  let out = '';
  for (let i = 0; i < NORMALIZED_LENGTH; i++) {
    out += CHARSET[bytes[i] % CHARSET.length];
  }
  return out;
}

function toDisplay(normalized: string): string {
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += 4) {
    groups.push(normalized.slice(i, i + 4));
  }
  return groups.join('-');
}

export const adminGenerateClinicCodes = functions.https.onCall(
  async (data: GenerateCodesInput, context) => {
    const auth = await requireAdmin(context);
    const count = typeof data?.count === 'number' ? Math.floor(data.count) : NaN;
    if (!Number.isFinite(count) || count < 1 || count > 100) {
      throw new functions.https.HttpsError('invalid-argument', 'count must be 1–100');
    }
    const expiresInDays =
      data?.expiresInDays === null || data?.expiresInDays === undefined
        ? null
        : typeof data.expiresInDays === 'number' && data.expiresInDays >= 1 && data.expiresInDays <= 730
        ? Math.floor(data.expiresInDays)
        : null;

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const expiresAt =
      expiresInDays !== null
        ? admin.firestore.Timestamp.fromMillis(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const generated: GeneratedCode[] = [];
    const batch = db.batch();

    for (let i = 0; i < count; i++) {
      let code = randomCode();
      let exists = (await db.collection(CLINIC_CODES_COLLECTION).doc(code).get()).exists;
      while (exists) {
        code = randomCode();
        exists = (await db.collection(CLINIC_CODES_COLLECTION).doc(code).get()).exists;
      }
      batch.set(db.collection(CLINIC_CODES_COLLECTION).doc(code), {
        code,
        issuedBy: auth.email ?? auth.uid,
        issuedAt: now,
        expiresAt,
        used: false,
        revoked: false,
      });
      generated.push({ code, display: toDisplay(code) });
    }

    await batch.commit();

    await logAdminAccess(auth.uid, auth.email, 'generate_codes', 'clinicCodes', 'batch', {
      count,
      expiresInDays,
    });
    await logCodeAudit('admin_mint_codes', 'minted', {
      callerKey: `uid:${auth.uid}`,
      metadata: { count, expiresInDays },
    });

    return { ok: true as const, codes: generated, ttlDays: SINAI_SESSION_TTL_DAYS };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminRevokeClinicCode
// ─────────────────────────────────────────────────────────────────────────────

interface RevokeCodeInput { code?: unknown; reason?: unknown; }

export const adminRevokeClinicCode = functions.https.onCall(
  async (data: RevokeCodeInput, context) => {
    const auth = await requireAdmin(context);
    const normalized = normalizeCode(data?.code);
    if (!normalized) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid clinic code format.');
    }
    const reason = typeof data?.reason === 'string' && data.reason.length <= 500 ? data.reason : null;

    const ref = admin.firestore().collection(CLINIC_CODES_COLLECTION).doc(normalized);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
    }
    await ref.update({
      revoked: true,
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedReason: reason,
      revokedBy: auth.email ?? auth.uid,
    });

    await logAdminAccess(auth.uid, auth.email, 'revoke_code', 'clinicCodes', normalized, { reason });
    await logCodeAudit('admin_revoke_code', 'revoked', {
      normalizedCode: normalized,
      callerKey: `uid:${auth.uid}`,
      metadata: reason ? { reason } : undefined,
    });

    return { ok: true as const };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminListClinicCodeAuditLog
// Paginated read of clinicCodeAuditLog. Admin dashboard "Activity" tab.
// ─────────────────────────────────────────────────────────────────────────────

interface ListAuditInput {
  limit?: number;
  startAfterMillis?: number;
}

export const adminListClinicCodeAuditLog = functions.https.onCall(
  async (data: ListAuditInput, context) => {
    const auth = await requireAdmin(context);
    const limit = Math.max(1, Math.min(500, data?.limit ?? 100));

    let q: admin.firestore.Query = admin.firestore()
      .collection('clinicCodeAuditLog')
      .orderBy('timestamp', 'desc');

    if (typeof data?.startAfterMillis === 'number') {
      q = q.startAfter(admin.firestore.Timestamp.fromMillis(data.startAfterMillis));
    }
    q = q.limit(limit);

    const snap = await q.get();
    const entries = snap.docs.map((d) => {
      const doc = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        action: doc.action,
        outcome: doc.outcome,
        codeHashPrefix: doc.codeHashPrefix,
        sessionId: doc.sessionId,
        redcapRecordId: doc.redcapRecordId,
        callerKey: doc.callerKey,
        errorMessage: doc.errorMessage,
        metadata: doc.metadata,
        timestampMillis: (doc.timestamp as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0,
      };
    });

    await logAdminAccess(auth.uid, auth.email, 'list_audit', 'clinicCodeAuditLog', 'list', {
      count: entries.length,
    });

    return {
      entries,
      nextStartAfterMillis:
        entries.length === limit ? entries[entries.length - 1].timestampMillis : null,
    };
  }
);
