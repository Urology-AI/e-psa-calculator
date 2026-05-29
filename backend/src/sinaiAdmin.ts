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
 *   adminCreateSinaiSession         — manual enrollment: admin creates session
 *                                     on behalf of a patient (paper/verbal intake)
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

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC-COHORT VIEWERS (sessions/* + users/{uid}, gated on researchConsent)
//
// Public-cohort sessions are persisted by the existing public flow (PR #54)
// at sessions/{sessionId}, with the patient's research consent flag on
// users/{uid}. We expose them here so admins can see ALL research data in
// one dashboard, clearly badged by cohort.
//
// Read-only for now. Linking a public session to a Mount Sinai clinic code
// (admin-attested) is the next PR.
// ─────────────────────────────────────────────────────────────────────────────

interface ListPublicInput {
  limit?: number;
  startAfterMillis?: number;
  syncStatus?: 'all' | 'synced' | 'unsynced' | 'error';
}

interface PublicSessionSummary {
  sessionId: string;
  userId: string;
  userIdPrefix: string;       // first 8 chars — used in cohort labels
  createdAtMillis: number;
  status: string;              // STEP1_COMPLETE, STEP2_COMPLETE, etc.
  pathwayMode: string;
  researchConsent: boolean;
  researchTimestampMillis: number | null;
  redcapSynced: boolean;
  redcapSyncedAtMillis: number | null;
  redcapSyncError: string | null;
  finalCategory: string | null;
  finalScore: number | null;
  linkedToSinai: { clinicCode: string; linkedAtMillis: number } | null;
}

export const adminListPublicConsentedSessions = functions.https.onCall(
  async (data: ListPublicInput, context): Promise<{
    sessions: PublicSessionSummary[];
    nextStartAfterMillis: number | null;
  }> => {
    const auth = await requireAdmin(context);
    const limit = Math.max(1, Math.min(200, data?.limit ?? 50));

    let q: admin.firestore.Query = admin.firestore()
      .collection('sessions')
      .orderBy('createdAt', 'desc');

    if (typeof data?.startAfterMillis === 'number') {
      q = q.startAfter(admin.firestore.Timestamp.fromMillis(data.startAfterMillis));
    }

    // Sync-status filter is applied client-side after we join with user docs,
    // because researchConsent lives on users/{uid} not on sessions/*. The
    // limit here is paged but we may need to skip rows that aren't consented.
    q = q.limit(limit * 2); // over-fetch to compensate for filtering

    const snap = await q.get();

    // Resolve unique user IDs and fetch their consent flags in one batch
    const userIds = [...new Set(snap.docs.map((d) => (d.data() as { userId?: string }).userId).filter(Boolean) as string[])];
    const userDocs = await Promise.all(
      userIds.map((uid) =>
        admin.firestore().collection('users').doc(uid).get().then((s) => ({
          uid,
          data: s.exists ? (s.data() as Record<string, unknown>) : null,
        }))
      )
    );
    const userById = new Map(userDocs.map((u) => [u.uid, u.data]));

    const sessions: PublicSessionSummary[] = [];
    for (const d of snap.docs) {
      if (sessions.length >= limit) break;
      const doc = d.data() as Record<string, unknown>;
      const userId = String(doc.userId ?? '');
      if (!userId) continue;
      const userDoc = userById.get(userId);
      if (!userDoc || userDoc.researchConsent !== true) continue; // gate

      const summary: PublicSessionSummary = {
        sessionId: d.id,
        userId,
        userIdPrefix: userId.slice(0, 8),
        createdAtMillis: (doc.createdAt as admin.firestore.Timestamp | undefined)?.toMillis() ?? 0,
        status: String(doc.status ?? ''),
        pathwayMode: String(doc.pathwayMode ?? ''),
        researchConsent: true,
        researchTimestampMillis:
          (userDoc.researchTimestamp as admin.firestore.Timestamp | undefined)?.toMillis() ??
          ((typeof userDoc.researchTimestamp === 'string')
            ? new Date(userDoc.researchTimestamp).getTime()
            : null),
        redcapSynced: doc.redcapSynced === true,
        redcapSyncedAtMillis:
          (doc.redcapSyncedAt as admin.firestore.Timestamp | undefined)?.toMillis() ?? null,
        redcapSyncError: (doc.redcapSyncError as string | undefined) ?? null,
        finalCategory: (doc.finalCategory as string | undefined) ?? null,
        finalScore: (doc.finalScore as number | undefined) ?? null,
        linkedToSinai:
          doc.linkedToSinai && typeof doc.linkedToSinai === 'object'
            ? {
                clinicCode: String((doc.linkedToSinai as { clinicCode?: string }).clinicCode ?? ''),
                linkedAtMillis:
                  ((doc.linkedToSinai as { linkedAt?: admin.firestore.Timestamp }).linkedAt)?.toMillis() ?? 0,
              }
            : null,
      };

      // Apply syncStatus filter
      const f = data?.syncStatus ?? 'all';
      if (f === 'synced' && !summary.redcapSynced) continue;
      if (f === 'unsynced' && (summary.redcapSynced || summary.redcapSyncError)) continue;
      if (f === 'error' && !summary.redcapSyncError) continue;

      sessions.push(summary);
    }

    const nextStartAfterMillis =
      sessions.length === limit ? sessions[sessions.length - 1].createdAtMillis : null;

    await logAdminAccess(auth.uid, auth.email, 'list_public_sessions', 'sessions', 'list', {
      count: sessions.length,
      syncStatus: data?.syncStatus ?? 'all',
    });

    return { sessions, nextStartAfterMillis };
  }
);

interface GetPublicSessionInput { sessionId?: unknown; }

export const adminGetPublicSession = functions.https.onCall(
  async (data: GetPublicSessionInput, context) => {
    const auth = await requireAdmin(context);
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : null;
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
    }

    const sessionRef = admin.firestore().collection('sessions').doc(sessionId);
    const snap = await sessionRef.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found.');
    }

    const sessionDoc = snap.data() as Record<string, unknown>;
    const userId = String(sessionDoc.userId ?? '');
    if (!userId) {
      throw new functions.https.HttpsError('failed-precondition', 'Session has no associated user.');
    }

    const userSnap = await admin.firestore().collection('users').doc(userId).get();
    const userDoc = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
    if (userDoc.researchConsent !== true) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'This session is not in the research cohort (user has not granted research consent).'
      );
    }

    await logAdminAccess(auth.uid, auth.email, 'view_public_session', 'sessions', sessionId);

    // Convert Timestamps to millis recursively for the client
    const tsToMillis = (v: unknown): unknown => {
      if (v instanceof admin.firestore.Timestamp) return v.toMillis();
      if (Array.isArray(v)) return v.map(tsToMillis);
      if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = tsToMillis(val);
        return out;
      }
      return v;
    };

    return {
      _id: sessionId,
      cohort: 'public_consented' as const,
      userId,
      userIdPrefix: userId.slice(0, 8),
      researchConsent: true,
      researchTimestampMillis:
        (userDoc.researchTimestamp instanceof admin.firestore.Timestamp)
          ? userDoc.researchTimestamp.toMillis()
          : (typeof userDoc.researchTimestamp === 'string')
            ? new Date(userDoc.researchTimestamp).getTime()
            : null,
      consentBasis: userDoc.consentBasis ?? null,
      session: tsToMillis(sessionDoc),
    };
  }
);

interface ResyncPublicInput { sessionId?: unknown; }

export const adminResyncPublicSession = functions.https.onCall(
  async (data: ResyncPublicInput, context) => {
    const auth = await requireAdmin(context);
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : null;
    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
    }

    // Touch the doc with a bump field — this re-fires the existing
    // syncToRedcap onWrite trigger, which already enforces researchConsent.
    const ref = admin.firestore().collection('sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found.');
    }

    await ref.update({
      adminResyncRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminResyncBy: auth.email ?? auth.uid,
    });

    await logAdminAccess(auth.uid, auth.email, 'resync_public_session', 'sessions', sessionId);
    return { ok: true as const };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// adminLinkPublicSessionToSinai
//
// Admin-attested promotion of a public-consented session into the Mount Sinai
// cohort. Two gates must both pass:
//   1. ENROLLMENT — a valid, unused, non-revoked, unexpired clinic code
//   2. CONSENT    — admin documents the consent method, attestor, timestamp,
//                   and free-text notes (≥10 chars enforced server-side)
//
// On success, atomically:
//   - claim the clinic code (marking it used + linked + which sessionId)
//   - copy the public session's clinical data into a new sinaiSessions/{id}
//     doc with full consent provenance baked in
//   - stamp the original public session with a linkedToSinai marker
//
// The original public session is NOT deleted — the audit trail (who linked
// when, with what attestation) is the point. The new sinaiSessions row is
// the canonical Sinai-cohort copy from this point forward.
// ─────────────────────────────────────────────────────────────────────────────

const CONSENT_METHODS = ['verbal', 'written', 'paper', 'electronic'] as const;
type ConsentMethod = typeof CONSENT_METHODS[number];

interface LinkInput {
  sessionId?: unknown;
  clinicCode?: unknown;
  consentMethod?: unknown;
  consentTimestampMillis?: unknown;
  consentAttestor?: unknown;     // who confirmed (defaults to admin email)
  consentNotes?: unknown;        // required, ≥10 chars
  consentAttachmentRef?: unknown; // optional Firebase Storage path
  adminAttestation?: unknown;    // must be true — "I attest..." checkbox
}

interface LinkResult {
  ok: true;
  sinaiSessionId: string;
  publicSessionId: string;
  clinicCode: string;
}

export const adminLinkPublicSessionToSinai = functions.https.onCall(
  async (data: LinkInput, context): Promise<LinkResult> => {
    const auth = await requireAdmin(context);

    // ── 1. Validate inputs upfront ───────────────────────────────────────
    const publicSessionId =
      typeof data?.sessionId === 'string' && data.sessionId.length > 0 ? data.sessionId : null;
    if (!publicSessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required.');
    }

    const normalized = normalizeCode(data?.clinicCode);
    if (!normalized) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Clinic code is invalid or wrong format.'
      );
    }

    const consentMethod =
      typeof data?.consentMethod === 'string' &&
      (CONSENT_METHODS as readonly string[]).includes(data.consentMethod)
        ? (data.consentMethod as ConsentMethod)
        : null;
    if (!consentMethod) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Consent method is required (one of: ${CONSENT_METHODS.join(', ')}).`
      );
    }

    const consentTimestampMillis =
      typeof data?.consentTimestampMillis === 'number' && data.consentTimestampMillis > 0
        ? data.consentTimestampMillis
        : null;
    if (!consentTimestampMillis) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Consent timestamp is required (must be a positive number of milliseconds).'
      );
    }
    if (consentTimestampMillis > Date.now() + 60 * 1000) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Consent timestamp cannot be in the future.'
      );
    }

    const consentAttestor =
      typeof data?.consentAttestor === 'string' && data.consentAttestor.length > 0 && data.consentAttestor.length <= 200
        ? data.consentAttestor
        : (auth.email ?? auth.uid);

    const consentNotes =
      typeof data?.consentNotes === 'string' ? data.consentNotes.trim() : '';
    if (consentNotes.length < 10) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Consent notes are required (at least 10 characters) — please describe how consent was obtained.'
      );
    }
    if (consentNotes.length > 1000) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Consent notes are too long (max 1000 characters).'
      );
    }

    const consentAttachmentRef =
      typeof data?.consentAttachmentRef === 'string' && data.consentAttachmentRef.length > 0 && data.consentAttachmentRef.length <= 500
        ? data.consentAttachmentRef
        : null;

    if (data?.adminAttestation !== true) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Admin attestation checkbox must be checked.'
      );
    }

    // ── 2. Load and validate the public session + user consent ───────────
    const db = admin.firestore();
    const publicSessionRef = db.collection('sessions').doc(publicSessionId);
    const publicSessionSnap = await publicSessionRef.get();
    if (!publicSessionSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Public session not found.');
    }
    const publicSession = publicSessionSnap.data() as Record<string, unknown>;
    const userId = String(publicSession.userId ?? '');
    if (!userId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Public session has no associated user.'
      );
    }

    if (publicSession.linkedToSinai) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This public session has already been linked to a Mount Sinai clinic code.'
      );
    }

    const userSnap = await db.collection('users').doc(userId).get();
    const userDoc = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
    if (userDoc.researchConsent !== true) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This user has not given research consent — cannot link to Mount Sinai cohort.'
      );
    }

    // ── 3. Atomically claim the code + create sinaiSessions + link back ──
    const sinaiSessionId = `sinai-link-${crypto.randomUUID()}`;
    const codeRef = db.collection(CLINIC_CODES_COLLECTION).doc(normalized);
    const sinaiSessionRef = db.collection(SINAI_SESSIONS_COLLECTION).doc(sinaiSessionId);
    const now = admin.firestore.Timestamp.now();
    const ttlMs = SINAI_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + ttlMs);
    const consentTimestamp = admin.firestore.Timestamp.fromMillis(consentTimestampMillis);

    try {
      await db.runTransaction(async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Clinic code not recognized.');
        }
        const codeDoc = codeSnap.data() as Record<string, unknown>;
        if (codeDoc.revoked === true) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has been revoked.');
        }
        if (codeDoc.used === true) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has already been used.');
        }
        const codeExpiresAt = codeDoc.expiresAt as admin.firestore.Timestamp | null | undefined;
        if (codeExpiresAt && codeExpiresAt.toMillis() < Date.now()) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code has expired.');
        }

        // Copy clinical data from public session, plus consent provenance
        const sinaiDoc = {
          clinicCode: normalized,
          status: 'pending' as const,
          createdAt: now,
          expiresAt,
          pathwayMode: publicSession.pathwayMode ?? 'unknown',
          step1: publicSession.step1 ?? {},
          ...(publicSession.step2 ? { step2: publicSession.step2 } : {}),
          result: publicSession.result ?? {},
          ...(publicSession.finalCategory ? { finalCategory: publicSession.finalCategory } : {}),
          ...(publicSession.finalScore !== undefined ? { finalScore: publicSession.finalScore } : {}),

          // Linkage provenance — for both audit and REDCap stratification
          linkedFromPublic: true,
          linkedFromPublicSessionId: publicSessionId,
          linkedAt: now,
          linkedBy: auth.email ?? auth.uid,

          // Consent provenance — admin-attested, not patient-self-attested
          consentSource: 'admin_attested' as const,
          consentMethod,
          consentTimestamp,
          consentAttestor,
          consentNotes,
          ...(consentAttachmentRef ? { consentAttachmentRef } : {}),
        };

        tx.set(sinaiSessionRef, sinaiDoc);

        // Claim the clinic code
        tx.update(codeRef, {
          used: true,
          usedAt: now,
          sessionId: sinaiSessionId,
          linkedFromPublicSessionId: publicSessionId,
          consentSource: 'admin_attested',
          consentMethod,
          consentAttestor,
        });

        // Mark the original public session as linked (for visibility, not deletion)
        tx.update(publicSessionRef, {
          linkedToSinai: {
            clinicCode: normalized,
            sinaiSessionId,
            linkedAt: now,
            linkedBy: auth.email ?? auth.uid,
            consentMethod,
          },
        });
      });
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      functions.logger.error('adminLinkPublicSessionToSinai: transaction failed', err);
      throw new functions.https.HttpsError('internal', 'Could not link session. Please try again.');
    }

    // ── 4. Audit trail (both logs) ────────────────────────────────────────
    await logAdminAccess(auth.uid, auth.email, 'link_public_to_sinai', 'sessions', publicSessionId, {
      sinaiSessionId,
      clinicCode: normalized,
      consentMethod,
      consentAttestor,
    });
    await logCodeAudit('link_public_to_sinai', 'linked', {
      normalizedCode: normalized,
      callerKey: `uid:${auth.uid}`,
      sessionId: sinaiSessionId,
      metadata: {
        publicSessionId,
        consentMethod,
        consentAttestor,
      },
    });

    return {
      ok: true,
      sinaiSessionId,
      publicSessionId,
      clinicCode: normalized,
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT ROSTER — sinaiPatients collection
//
// One document per enrolled study participant.  Identified only by the
// study-assigned participantId (never by name or MRN).
//
//   sinaiPatients/{participantId} {
//     participantId   string   — de-identified study ID
//     clinicCode      string   — normalized code auto-assigned at enrollment
//     enrolledAt      Timestamp
//     enrolledBy      string   — admin email
//     notes           string | null
//     status          'enrolled' | 'completed' | 'submitted_redcap'
//                              | 'imported_manually' | 'redcap_error'
//     sessionId       string | null  — null until ePSA completed
//     redcapRecordId  string | null
//   }
// ─────────────────────────────────────────────────────────────────────────────

const SINAI_PATIENTS_COLLECTION = 'sinaiPatients';

// Allowed characters in a participant ID: alphanumeric, hyphens, underscores.
const PARTICIPANT_ID_RE = /^[A-Za-z0-9_\-]{2,64}$/;

// CODE_CHARSET used when minting a single code at enrollment time.
const ENROLL_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function mintSingleCode(): string {
  const len = 12;
  let code = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    code += ENROLL_CODE_CHARSET[bytes[i] % ENROLL_CODE_CHARSET.length];
  }
  return code;
}

// ── adminEnrollPatient ────────────────────────────────────────────────────────
// Creates a sinaiPatient record and auto-assigns a fresh clinic code.
// Returns: { participantId, clinicCode (display format) }
// ─────────────────────────────────────────────────────────────────────────────

export const adminEnrollPatient = functions.https.onCall(
  async (data: { participantId: string; notes?: string }, context) => {
    const auth = requireAdmin(context);

    const rawId: unknown = data?.participantId;
    if (typeof rawId !== 'string' || !PARTICIPANT_ID_RE.test(rawId)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'participantId must be 2–64 alphanumeric characters (hyphens and underscores allowed).'
      );
    }
    const participantId = rawId.trim();
    const notes = typeof data?.notes === 'string' ? data.notes.trim().slice(0, 500) : null;

    const db = admin.firestore();
    const patientRef = db.collection(SINAI_PATIENTS_COLLECTION).doc(participantId);
    const now = admin.firestore.Timestamp.now();

    // Mint a collision-free code (retry up to 5 times).
    let code: string | null = null;
    let codeRef: admin.firestore.DocumentReference | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = mintSingleCode();
      const ref = db.collection(CLINIC_CODES_COLLECTION).doc(candidate);
      const snap = await ref.get();
      if (!snap.exists) {
        code = candidate;
        codeRef = ref;
        break;
      }
    }
    if (!code || !codeRef) {
      throw new functions.https.HttpsError('internal', 'Could not generate a unique clinic code. Please try again.');
    }

    // Atomically create the patient doc + the clinic code doc.
    await db.runTransaction(async (tx) => {
      const patientSnap = await tx.get(patientRef);
      if (patientSnap.exists) {
        throw new functions.https.HttpsError(
          'already-exists',
          `A patient with participantId "${participantId}" is already enrolled.`
        );
      }

      tx.set(codeRef!, {
        code,
        issuedBy: auth.email ?? auth.uid,
        issuedAt: now,
        expiresAt: null,          // patient codes never expire by default
        used: false,
        revoked: false,
        reservedFor: participantId,  // informational — not enforced by app flow
      });

      tx.set(patientRef, {
        participantId,
        clinicCode: code,
        enrolledAt: now,
        enrolledBy: auth.email ?? auth.uid,
        notes,
        status: 'enrolled',
        sessionId: null,
        redcapRecordId: null,
      });
    });

    await logAdminAccess(auth.uid, auth.email, 'enroll_patient', 'sinaiPatients', participantId, {
      clinicCode: code,
    });
    await logCodeAudit('enroll_patient', 'minted', {
      normalizedCode: code,
      callerKey: `uid:${auth.uid}`,
      metadata: { participantId },
    });

    // Return display-formatted code (XXXX-XXXX-XXXX)
    const display = [code.slice(0, 4), code.slice(4, 8), code.slice(8, 12)].join('-');
    return { ok: true, participantId, clinicCode: display };
  }
);

// ── adminListPatients ─────────────────────────────────────────────────────────
// Returns the patient roster ordered by enrolledAt desc.
// ─────────────────────────────────────────────────────────────────────────────

export const adminListPatients = functions.https.onCall(
  async (data: { status?: string; limit?: number; startAfterParticipantId?: string }, context) => {
    requireAdmin(context);

    const pageSize = Math.min(Number(data?.limit) || 100, 200);
    const statusFilter = typeof data?.status === 'string' ? data.status : 'all';

    const db = admin.firestore();
    let q = db
      .collection(SINAI_PATIENTS_COLLECTION)
      .orderBy('enrolledAt', 'desc')
      .limit(pageSize);

    if (statusFilter !== 'all') {
      q = (db
        .collection(SINAI_PATIENTS_COLLECTION)
        .where('status', '==', statusFilter)
        .orderBy('enrolledAt', 'desc')
        .limit(pageSize)) as any;
    }

    if (data?.startAfterParticipantId) {
      const cursorSnap = await db
        .collection(SINAI_PATIENTS_COLLECTION)
        .doc(data.startAfterParticipantId)
        .get();
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap) as any;
      }
    }

    const snap = await q.get();
    const patients = snap.docs.map((d) => {
      const doc = d.data();
      return {
        participantId: d.id,
        clinicCode: doc.clinicCode ?? null,
        enrolledAt: doc.enrolledAt?.toMillis?.() ?? null,
        enrolledBy: doc.enrolledBy ?? null,
        notes: doc.notes ?? null,
        status: doc.status ?? 'enrolled',
        sessionId: doc.sessionId ?? null,
        redcapRecordId: doc.redcapRecordId ?? null,
      };
    });

    const lastId = patients.length === pageSize ? patients[patients.length - 1].participantId : null;
    return { patients, nextStartAfterId: lastId };
  }
);

// ── adminCreateSinaiSessionForPatient ─────────────────────────────────────────
// Manual data-entry path: admin submits ePSA results on behalf of a patient
// (e.g. from paper intake or bedside tablet session).
//
// Mirrors the logic of submitSinaiSession in sinaiCohort.ts but:
//   • requires admin auth
//   • looks up the patient by participantId to get their assigned code
//   • marks the patient doc with sessionId + status on success
// ─────────────────────────────────────────────────────────────────────────────

interface AdminSessionPayload {
  participantId: string;
  step1: Record<string, unknown>;
  result: Record<string, unknown>;
  step2?: Record<string, unknown>;
  finalCategory?: string;
  finalScore?: number;
  pathwayMode?: string;
  enrollmentNotes?: string;
}

export const adminCreateSinaiSessionForPatient = functions.https.onCall(
  async (data: AdminSessionPayload, context) => {
    const auth = requireAdmin(context);

    if (!data?.participantId || typeof data.participantId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'participantId is required.');
    }
    if (!data?.step1 || typeof data.step1 !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'step1 data is required.');
    }
    if (!data?.result || typeof data.result !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'result data is required.');
    }

    const db = admin.firestore();
    const patientRef = db.collection(SINAI_PATIENTS_COLLECTION).doc(data.participantId);
    const patientSnap = await patientRef.get();
    if (!patientSnap.exists) {
      throw new functions.https.HttpsError('not-found', `Patient "${data.participantId}" not found.`);
    }
    const patientDoc = patientSnap.data()!;

    if (patientDoc.sessionId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This patient already has a completed ePSA session. Delete the existing session before re-enrolling.'
      );
    }

    const normalized = patientDoc.clinicCode as string;
    const codeRef = db.collection(CLINIC_CODES_COLLECTION).doc(normalized);

    const sessionId = crypto.randomUUID();
    const sessionRef = db.collection(SINAI_SESSIONS_COLLECTION).doc(sessionId);
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + _internal.TTL_MS);

    // Determine pathway mode
    const pathwayMode =
      data.pathwayMode ??
      (data.step2 && Object.keys(data.step2).length > 0 ? 'step1_and_step2' : 'step1_only');

    // Atomically claim the code, write the session, and update the patient.
    try {
      await db.runTransaction(async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Assigned clinic code not found — re-enroll patient.');
        }
        const codeData = codeSnap.data()!;
        if (codeData.revoked) {
          throw new functions.https.HttpsError('failed-precondition', 'Assigned clinic code has been revoked.');
        }
        if (codeData.used) {
          throw new functions.https.HttpsError('failed-precondition', 'Clinic code already used — patient may have self-completed.');
        }

        const sessionDoc = {
          clinicCode: normalized,
          status: 'pending',
          createdAt: now,
          expiresAt,
          pathwayMode,
          step1: data.step1,
          result: data.result,
          enrolledManually: true,
          enrolledBy: auth.email ?? auth.uid,
          ...(data.enrollmentNotes ? { enrollmentNotes: data.enrollmentNotes } : {}),
          ...(data.step2 && Object.keys(data.step2).length > 0 ? { step2: data.step2 } : {}),
          ...(data.finalCategory ? { finalCategory: data.finalCategory } : {}),
          ...(data.finalScore !== undefined ? { finalScore: data.finalScore } : {}),
        };

        tx.set(sessionRef, sessionDoc);
        tx.update(codeRef, { used: true, usedAt: now, sessionId });
        tx.update(patientRef, {
          sessionId,
          status: 'completed',
          completedAt: now,
          completedBy: auth.email ?? auth.uid,
        });
      });
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      functions.logger.error('adminCreateSinaiSessionForPatient: transaction failed', err);
      throw new functions.https.HttpsError('internal', 'Could not save session. Please try again.');
    }

    // Optionally push to REDCap if enabled.
    let redcapSubmitted = false;
    let redcapRecordId: string | undefined;
    try {
      const redcapConfig = getSinaiRedcapConfig();
      const payload = { clinicCode: normalized, step1: data.step1, result: data.result, step2: data.step2, finalCategory: data.finalCategory, finalScore: data.finalScore, pathwayMode };
      const redcapRecord = mapPayloadToRedcap(sessionId, payload as any);
      const result = await postToRedcap(redcapConfig, redcapRecord);
      redcapRecordId = result.recordId;
      await sessionRef.update({
        status: 'submitted_redcap',
        redcapRecordId,
        redcapSubmittedAt: admin.firestore.Timestamp.now(),
      });
      await patientRef.update({ status: 'submitted_redcap', redcapRecordId });
      redcapSubmitted = true;
    } catch (_) {
      // REDCap submission is best-effort; session stays 'pending' for manual retry.
    }

    await logAdminAccess(
      auth.uid, auth.email,
      'create_session_for_patient', 'sinaiSessions', sessionId,
      { participantId: data.participantId, clinicCode: normalized, redcapSubmitted }
    );
    await logCodeAudit('manual_session_created', redcapSubmitted ? 'submitted_redcap' : 'submitted_pending', {
      normalizedCode: normalized,
      callerKey: `uid:${auth.uid}`,
      sessionId,
      metadata: { participantId: data.participantId },
    });

    return { ok: true, sessionId, redcapSubmitted, redcapRecordId, ttlDays: SINAI_SESSION_TTL_DAYS };
  }
);

// ── syncSinaiSessionStatusToPatient ──────────────────────────────────────────
// Firestore trigger: when a sinaiSession is written (created or updated),
// find the matching patient (by clinicCode) and sync the status + sessionId.
// This handles the self-completion path where the patient uses the app.
// ─────────────────────────────────────────────────────────────────────────────

export const syncSinaiSessionStatusToPatient = functions.firestore
  .document(`${SINAI_SESSIONS_COLLECTION}/{sessionId}`)
  .onWrite(async (change, context) => {
    const after = change.after.exists ? (change.after.data() as any) : null;
    if (!after) return; // document deleted — nothing to sync

    const clinicCode: string | undefined = after.clinicCode;
    if (!clinicCode) return;

    const db = admin.firestore();
    const patientQuery = await db
      .collection(SINAI_PATIENTS_COLLECTION)
      .where('clinicCode', '==', clinicCode)
      .limit(1)
      .get();

    if (patientQuery.empty) return; // no patient record for this code (pre-roster codes)

    const patientRef = patientQuery.docs[0].ref;
    const sessionId = context.params.sessionId;
    const sessionStatus: string = after.status ?? 'pending';

    // Map session status to patient status
    const patientStatus =
      sessionStatus === 'submitted_redcap'  ? 'submitted_redcap'  :
      sessionStatus === 'imported_manually' ? 'imported_manually' :
      sessionStatus === 'redcap_error'      ? 'redcap_error'      :
      'completed';

    await patientRef.update({
      sessionId,
      status: patientStatus,
      ...(after.redcapRecordId ? { redcapRecordId: after.redcapRecordId } : {}),
    });
  });

