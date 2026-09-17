"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRedcap = exports.deleteUserData = exports.exportUserData = exports.npiProxy = exports.optimizeDatabase = exports.cleanupOldAuditLogs = exports.getSectionLocks = exports.lockSection = exports.cleanupAbandonedSessions = exports.cleanupOldSessions = exports.getSession = exports.loginAnonymousBySessionId = exports.getUser = exports.getUserSessions = exports.deleteSession = exports.updateSession = exports.createSession = exports.upsertConsent = exports.submitSinaiSession = exports.validateClinicCode = exports.predictBiopsyRisk = exports.calculatePsaRecommendation = exports.submitToRedcap = exports.syncToRedcap = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const https = __importStar(require("https"));
const zod_1 = require("zod");
const crypto_js_1 = __importDefault(require("crypto-js"));
// REDCap sync trigger (Firestore onWrite → REDCap API)
// submitToRedcap: callable function for local-storage users to push directly
var redcapSync_1 = require("./redcapSync");
Object.defineProperty(exports, "syncToRedcap", { enumerable: true, get: function () { return redcapSync_1.syncToRedcap; } });
Object.defineProperty(exports, "submitToRedcap", { enumerable: true, get: function () { return redcapSync_1.submitToRedcap; } });
// Single source of truth for the pre-PSA and post-PSA/MRI recommendations,
// shared by web, epsa-screening-tool (via @urology-ai/epsa-engine), and the iOS app
// (via this callable).
var psaEngine_1 = require("./psaEngine");
Object.defineProperty(exports, "calculatePsaRecommendation", { enumerable: true, get: function () { return psaEngine_1.calculatePsaRecommendation; } });
// GG≥2 biopsy-risk model (ePSA v4), ported from Urology-AI/biopsy-prediction's
// model/model.py so Part 3 doesn't depend on the separate Render-hosted
// FastAPI service (whose free-tier cold starts caused "temporarily
// unavailable" errors). Closed-form logistic regression — see biopsyPrediction.ts
// for the full provenance and sync-with-Python-repo caveat.
var biopsyPrediction_1 = require("./biopsyPrediction");
Object.defineProperty(exports, "predictBiopsyRisk", { enumerable: true, get: function () { return biopsyPrediction_1.predictBiopsyRisk; } });
// Sinai clinic cohort — IRB STUDY-14-00050.
// Clinical responses are stored in sinaiSessions/{sessionId} (auto-deleted
// after 90 days of inactivity via Firestore TTL) and optionally pushed to Sinai REDCap.
// All Sinai data is keyed only by clinic code — never tied to PII.
var sinaiCohort_1 = require("./sinaiCohort");
Object.defineProperty(exports, "validateClinicCode", { enumerable: true, get: function () { return sinaiCohort_1.validateClinicCode; } });
Object.defineProperty(exports, "submitSinaiSession", { enumerable: true, get: function () { return sinaiCohort_1.submitSinaiSession; } });
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Schema Definitions for Validation
const ConsentSchema = zod_1.z.object({
    consentToContact: zod_1.z.boolean(),
    consentTimestamp: zod_1.z.string().datetime(),
    researchConsent: zod_1.z.boolean().optional(),
    researchTimestamp: zod_1.z.string().datetime().optional(),
});
const PreDataSchema = zod_1.z.object({
    age: zod_1.z.union([zod_1.z.number().int().min(18).max(120), zod_1.z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
    race: zod_1.z.enum(['black', 'white', 'asian', 'hispanic', 'other', 'prefer-not-to-say', 'african-american', 'american-indian', 'native-hawaiian', 'unknown']),
    ethnicity: zod_1.z.enum(['hispanic-latino', 'not-hispanic-latino', 'unknown']).optional(),
    heightFt: zod_1.z.union([zod_1.z.number().int().min(1).max(9), zod_1.z.string(), zod_1.z.null()]).optional(),
    heightIn: zod_1.z.union([zod_1.z.number().int().min(0).max(11), zod_1.z.string(), zod_1.z.null()]).optional(),
    heightCm: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.string(), zod_1.z.null()]).optional(),
    weight: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
    bmi: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
    heightUnit: zod_1.z.enum(['ft', 'cm', 'imperial', 'metric']).optional().transform(val => val === 'imperial' ? 'ft' : val === 'metric' ? 'cm' : val),
    weightUnit: zod_1.z.enum(['lbs', 'kg']).optional(),
    weightKg: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.string(), zod_1.z.null()]).optional(),
    familyHistory: zod_1.z.union([zod_1.z.number().int().min(0).max(3), zod_1.z.literal('unknown'), zod_1.z.null()]).transform(val => val === null ? 0 : val),
    brcaStatus: zod_1.z.enum(['none', 'brca1', 'brca2', 'both', 'unknown']).optional().transform(val => val || 'unknown'),
    ipss: zod_1.z.array(zod_1.z.union([zod_1.z.number().int().min(0).max(5), zod_1.z.null()])).transform(arr => arr.map(val => val === null ? 0 : val)),
    shim: zod_1.z.array(zod_1.z.union([zod_1.z.number().int().min(1).max(5), zod_1.z.null()])).transform(arr => arr.map(val => val === null ? 1 : val)),
    exercise: zod_1.z.union([zod_1.z.number().int().min(0).max(2), zod_1.z.null()]).transform(val => val === null ? 0 : val),
    smoking: zod_1.z.union([zod_1.z.number().int().min(0).max(2), zod_1.z.null()]).optional(),
    chemicalExposure: zod_1.z.union([zod_1.z.number().int().min(0).max(1), zod_1.z.null()]).optional(),
    dietPattern: zod_1.z.enum(['western', 'mediterranean', 'dash', 'plant-based', 'pescatarian', 'low-carb-keto', 'other']).optional().transform(val => val || ''),
});
const PostDataSchema = zod_1.z.object({
    psa: zod_1.z.string().regex(/^\d*\.?\d*$/),
    knowPsa: zod_1.z.boolean(),
    onHormonalTherapy: zod_1.z.boolean().optional(),
    hormonalTherapyType: zod_1.z.enum(['', 'finasteride', 'dutasteride', 'other']).optional(),
    knowPirads: zod_1.z.boolean(),
    pirads: zod_1.z.enum(['0', '1', '2', '3', '4', '5']),
});
// Utility: Hash phone number
function hashPhone(phone) {
    return crypto_js_1.default.SHA256(phone).toString();
}
// Utility: Remove undefined values from objects so Firestore Admin SDK doesn't throw.
// Zod optional() fields produce undefined when the key is absent; Firestore rejects undefined.
function stripUndefined(obj) {
    return JSON.parse(JSON.stringify(obj));
}
// ============================================
// RATE LIMITING UTILITY
// ============================================
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user
const rateLimitCache = new Map();
function checkRateLimit(userId) {
    const now = Date.now();
    const entry = rateLimitCache.get(userId);
    if (!entry || now > entry.resetTime) {
        // New window
        rateLimitCache.set(userId, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW_MS
        });
        return true;
    }
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }
    entry.count++;
    return true;
}
function enforceRateLimit(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    if (!checkRateLimit(userId)) {
        throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again later.');
    }
}
// Utility: Audit logging
async function logAudit(action, userId, resourceType, resourceId, details) {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
        action,
        userId,
        resourceType,
        resourceId,
        details: details || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: 'client-side', // Will be enriched by Cloud Functions
    });
}
// ============================================
// CLOUD FUNCTION: Upsert Consent
// ============================================
exports.upsertConsent = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const phoneNumber = context.auth.token.phone_number;
    if (!phoneNumber) {
        throw new functions.https.HttpsError('failed-precondition', 'Phone number required');
    }
    // 2. Validate input
    let consentData;
    try {
        consentData = ConsentSchema.parse(data);
    }
    catch (error) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid consent data', error);
    }
    // 3. Hash phone number (don't store raw)
    const phoneHash = hashPhone(phoneNumber);
    // 4. Write to Firestore with minimal fields
    const userRef = db.collection('users').doc(userId);
    await userRef.set(Object.assign(Object.assign({ phoneHash }, consentData), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
    // 5. Audit log
    await logAudit('CONSENT_UPSERT', userId, 'user', userId, {
        hasContactConsent: consentData.consentToContact,
        hasResearchConsent: consentData.researchConsent,
    });
    return { success: true, userId };
});
// ============================================
// CLOUD FUNCTION: Create Session
// ============================================
exports.createSession = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Rate limiting
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    // Validate step1 data
    let step1Data;
    try {
        step1Data = PreDataSchema.parse(data.step1);
    }
    catch (error) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid step1 data', error);
    }
    // Validate calculated result
    if (data.result) {
        const result = data.result;
        const ResultSchema = zod_1.z.object({
            score: zod_1.z.number().int().min(0).max(100),
            risk: zod_1.z.enum(['LOWER', 'MODERATE', 'HIGHER', 'PSA_RECOMMENDED', 'PSA_NOT_RECOMMENDED']),
        });
        try {
            ResultSchema.parse(result);
        }
        catch (error) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid result data', error);
        }
    }
    // Consent (research use, contact) is upserted onto the user doc immediately
    // before this call in the client's save-to-cloud flow — pull it in here so
    // the session itself carries a snapshot of what the user had agreed to at
    // the moment it was created, rather than only living on the user doc.
    let researchConsent = null;
    let consentToContact = null;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        researchConsent = (_a = userData === null || userData === void 0 ? void 0 : userData.researchConsent) !== null && _a !== void 0 ? _a : null;
        consentToContact = (_b = userData === null || userData === void 0 ? void 0 : userData.consentToContact) !== null && _b !== void 0 ? _b : null;
    }
    catch (_error) {
        // Non-fatal: session is still created, consent snapshot just stays null
    }
    // Create session document with 90-day expiry (rolling — reset on each update)
    const sessionRef = db.collection('sessions').doc();
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const sessionData = {
        userId,
        status: 'STEP1_COMPLETE',
        pathwayMode: data.pathwayMode || null,
        step1: stripUndefined(step1Data),
        result: data.result || null,
        researchConsent,
        consentToContact,
        expiresAt: admin.firestore.Timestamp.fromDate(ninetyDaysFromNow),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
        await sessionRef.set(sessionData);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to write session document', error);
    }
    // Update user's current session (use set+merge so it works even if user doc doesn't exist)
    try {
        await db.collection('users').doc(userId).set({
            currentSessionId: sessionRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (_error) {
        // Non-fatal: session was created, just user doc update failed
    }
    // Audit log (non-fatal)
    const resultData = data.result;
    try {
        await logAudit('SESSION_CREATE', userId, 'session', sessionRef.id, {
            status: 'STEP1_COMPLETE',
            score: resultData === null || resultData === void 0 ? void 0 : resultData.score,
        });
    }
    catch (_error) {
        // Audit log failure should not block session creation
    }
    return { success: true, sessionId: sessionRef.id };
});
// ============================================
// CLOUD FUNCTION: Update Session (Step 2)
// ============================================
exports.updateSession = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const { sessionId, step2, result } = data;
    if (!sessionId) {
        throw new functions.https.HttpsError('invalid-argument', 'sessionId required');
    }
    // Validate step2 data
    let step2Data;
    try {
        step2Data = PostDataSchema.parse(step2);
    }
    catch (error) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid step2 data', error);
    }
    // Verify session ownership
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
    }
    const sessionData = sessionDoc.data();
    if ((sessionData === null || sessionData === void 0 ? void 0 : sessionData.userId) !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Session does not belong to user');
    }
    // Update session
    const updateData = {
        status: 'STEP2_COMPLETE',
        step2: stripUndefined(step2Data),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (result) {
        updateData.finalCategory = result.riskCat;
        updateData.finalScore = result.score;
    }
    if (data.pathwayMode) {
        updateData.pathwayMode = data.pathwayMode;
    }
    try {
        await sessionRef.update(updateData);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to update session document', error);
    }
    // Audit log (non-fatal)
    try {
        await logAudit('SESSION_UPDATE', userId, 'session', sessionId, {
            status: 'STEP2_COMPLETE',
            finalCategory: result === null || result === void 0 ? void 0 : result.riskCat,
        });
    }
    catch (_error) {
        // Audit log failure should not block session update
    }
    return { success: true, sessionId };
});
// ============================================
// CLOUD FUNCTION: Delete Session
// ============================================
exports.deleteSession = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const { sessionId } = data;
    if (!sessionId) {
        throw new functions.https.HttpsError('invalid-argument', 'sessionId required');
    }
    // Verify ownership
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
    }
    const sessionData = sessionDoc.data();
    if ((sessionData === null || sessionData === void 0 ? void 0 : sessionData.userId) !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Session does not belong to user');
    }
    // Delete session
    await sessionRef.delete();
    // Clear user's current session reference
    await db.collection('users').doc(userId).update({
        currentSessionId: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Audit log
    await logAudit('SESSION_DELETE', userId, 'session', sessionId);
    return { success: true };
});
// ============================================
// CLOUD FUNCTION: Get User Sessions
// ============================================
exports.getUserSessions = functions.https.onCall(async (_data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    // Query sessions
    const sessionsQuery = await db.collection('sessions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    const sessions = sessionsQuery.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    // Audit log
    await logAudit('SESSIONS_LIST', userId, 'sessions', 'list', { count: sessions.length });
    return { sessions };
});
// ============================================
// CLOUD FUNCTION: Get User Data
// ============================================
exports.getUser = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    // Rate limiting
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const requestedId = data === null || data === void 0 ? void 0 : data.userId;
    const callerId = context.auth.uid;
    // Callers may only fetch their own data. Admin reads go through the
    // Entra-gated admin dashboard (service account), not client callables.
    if (requestedId && requestedId !== callerId) {
        throw new functions.https.HttpsError('permission-denied', 'You may only access your own data');
    }
    const userId = requestedId || callerId;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    const userData = userDoc.data();
    // Audit log
    await logAudit('USER_READ', context.auth.uid, 'admin', userId);
    // Return user data (more fields for admin use)
    return {
        userId,
        isAnonymous: (_a = userData === null || userData === void 0 ? void 0 : userData.isAnonymous) !== null && _a !== void 0 ? _a : false,
        sessionId: (_b = userData === null || userData === void 0 ? void 0 : userData.sessionId) !== null && _b !== void 0 ? _b : null,
        authMethod: (_c = userData === null || userData === void 0 ? void 0 : userData.authMethod) !== null && _c !== void 0 ? _c : null,
        displayName: (_d = userData === null || userData === void 0 ? void 0 : userData.displayName) !== null && _d !== void 0 ? _d : null,
        consentToContact: userData === null || userData === void 0 ? void 0 : userData.consentToContact,
        consentTimestamp: userData === null || userData === void 0 ? void 0 : userData.consentTimestamp,
        researchConsent: userData === null || userData === void 0 ? void 0 : userData.researchConsent,
        researchTimestamp: userData === null || userData === void 0 ? void 0 : userData.researchTimestamp,
        currentSessionId: userData === null || userData === void 0 ? void 0 : userData.currentSessionId,
        createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
        updatedAt: userData === null || userData === void 0 ? void 0 : userData.updatedAt,
        expiresAt: (_e = userData === null || userData === void 0 ? void 0 : userData.expiresAt) !== null && _e !== void 0 ? _e : null,
    };
});
// ============================================
// CLOUD FUNCTION: Restore Anonymous Session by Session ID
// ============================================
exports.loginAnonymousBySessionId = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    try {
        // Rate limiting
        enforceRateLimit(context);
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const parsed = zod_1.z.object({
            sessionId: zod_1.z.string().regex(/^[A-Z0-9]{8}$/, 'Session ID must be 8 uppercase alphanumeric characters')
        }).safeParse({
            sessionId: ((data === null || data === void 0 ? void 0 : data.sessionId) || '').toUpperCase().trim()
        });
        if (!parsed.success) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid session ID format');
        }
        const sessionId = parsed.data.sessionId;
        const currentUserId = context.auth.uid;
        // Locate the original anonymous user by human-readable session ID
        const matchedUsers = await db.collection('users')
            .where('sessionId', '==', sessionId)
            .limit(1)
            .get();
        if (matchedUsers.empty) {
            throw new functions.https.HttpsError('not-found', 'Session ID not found');
        }
        const matchedDoc = matchedUsers.docs[0];
        const matchedUserId = matchedDoc.id;
        const matchedData = matchedDoc.data();
        if ((matchedData === null || matchedData === void 0 ? void 0 : matchedData.isAnonymous) !== true) {
            throw new functions.https.HttpsError('failed-precondition', 'Session ID is not linked to an anonymous account');
        }
        // Check if the user account has expired (no activity for 30+ days)
        const userUpdatedAt = matchedData === null || matchedData === void 0 ? void 0 : matchedData.updatedAt;
        const userCreatedAt = matchedData === null || matchedData === void 0 ? void 0 : matchedData.createdAt;
        const lastActivity = userUpdatedAt || userCreatedAt;
        if (lastActivity) {
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            if (lastActivity.toDate() < ninetyDaysAgo) {
                throw new functions.https.HttpsError('deadline-exceeded', 'Session has expired. Anonymous sessions last 90 days of inactivity. Please start a new session.');
            }
        }
        const nowIso = new Date().toISOString();
        const nowTs = admin.firestore.Timestamp.now();
        // If this login is from a different anonymous UID, migrate ownership to current UID
        if (matchedUserId !== currentUserId) {
            const currentUserRef = db.collection('users').doc(currentUserId);
            const migrateBatch = db.batch();
            migrateBatch.set(currentUserRef, {
                uid: currentUserId,
                sessionId,
                isAnonymous: true,
                authMethod: 'anonymous',
                email: null,
                phone: null,
                consentToContact: (_a = matchedData.consentToContact) !== null && _a !== void 0 ? _a : null,
                consentTimestamp: (_b = matchedData.consentTimestamp) !== null && _b !== void 0 ? _b : null,
                currentSessionId: (_c = matchedData.currentSessionId) !== null && _c !== void 0 ? _c : null,
                lastLoginAt: nowIso,
                updatedAt: nowTs,
                migratedFromUid: matchedUserId
            }, { merge: true });
            // Hand the key over: leaving it on the old doc too made the
            // `.limit(1)` lookup above pick the stale copy on the next restore.
            migrateBatch.set(matchedDoc.ref, {
                sessionId: admin.firestore.FieldValue.delete(),
                currentSessionId: admin.firestore.FieldValue.delete(),
                migratedToUid: currentUserId,
                migratedAt: nowTs,
                lastLoginAt: nowIso
            }, { merge: true });
            await migrateBatch.commit();
            // Move all existing sessions to the current authenticated user.
            while (true) {
                const sessionsSnapshot = await db.collection('sessions')
                    .where('userId', '==', matchedUserId)
                    .limit(200)
                    .get();
                if (sessionsSnapshot.empty) {
                    break;
                }
                const sessionBatch = db.batch();
                sessionsSnapshot.docs.forEach((sessionDoc) => {
                    sessionBatch.set(sessionDoc.ref, {
                        userId: currentUserId,
                        updatedAt: nowTs
                    }, { merge: true });
                });
                await sessionBatch.commit();
                if (sessionsSnapshot.size < 200) {
                    break;
                }
            }
        }
        else {
            await db.collection('users').doc(currentUserId).set({
                sessionId,
                isAnonymous: true,
                authMethod: 'anonymous',
                lastLoginAt: nowIso,
                updatedAt: nowTs
            }, { merge: true });
        }
        const finalUserDoc = await db.collection('users').doc(currentUserId).get();
        const finalUserData = finalUserDoc.data() || {};
        // Audit log
        await logAudit('ANON_SESSION_RESTORE', currentUserId, 'user', currentUserId, {
            sessionId,
            matchedUserId
        });
        return {
            success: true,
            userId: currentUserId,
            sessionId,
            currentSessionId: finalUserData.currentSessionId || null,
            consentToContact: (_d = finalUserData.consentToContact) !== null && _d !== void 0 ? _d : null,
            consentTimestamp: finalUserData.consentTimestamp || null
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error('loginAnonymousBySessionId failed', {
            message: error === null || error === void 0 ? void 0 : error.message,
            code: error === null || error === void 0 ? void 0 : error.code,
            stack: error === null || error === void 0 ? void 0 : error.stack
        });
        throw new functions.https.HttpsError('internal', `Session restore failed: ${(error === null || error === void 0 ? void 0 : error.message) || 'unknown error'}`);
    }
});
// ============================================
// CLOUD FUNCTION: Get Session by ID
// ============================================
exports.getSession = functions.https.onCall(async (data, context) => {
    // Rate limiting (more lenient for reads)
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const { sessionId } = data;
    if (!sessionId) {
        throw new functions.https.HttpsError('invalid-argument', 'sessionId required');
    }
    // Get session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
        return null;
    }
    const sessionData = sessionDoc.data();
    // Verify ownership
    if ((sessionData === null || sessionData === void 0 ? void 0 : sessionData.userId) !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Session does not belong to user');
    }
    // Check if session has expired
    if (sessionData === null || sessionData === void 0 ? void 0 : sessionData.expiresAt) {
        const expiresAt = sessionData.expiresAt;
        if (expiresAt.toDate() < new Date()) {
            throw new functions.https.HttpsError('deadline-exceeded', 'Session has expired. Anonymous sessions last 90 days of inactivity.');
        }
    }
    // Audit log
    await logAudit('SESSION_READ', userId, 'session', sessionId);
    return Object.assign({ id: sessionDoc.id }, sessionData);
});
// ============================================
// SCHEDULED FUNCTION: Cleanup Old Sessions (Data Lifecycle)
// Runs daily to delete sessions older than retention period
// ============================================
exports.cleanupOldSessions = functions.pubsub.schedule('0 2 * * *') // 2 AM daily
    .timeZone('America/New_York')
    .onRun(async (_context) => {
    const now = admin.firestore.Timestamp.now();
    let deletedCount = 0;
    const batchOps = [];
    // 1. Delete sessions that have passed their explicit expiresAt timestamp (90-day inactivity TTL)
    const expiredQuery = await db.collection('sessions')
        .where('expiresAt', '<', now)
        .limit(500)
        .get();
    if (!expiredQuery.empty) {
        const batch = db.batch();
        for (const doc of expiredQuery.docs) {
            batch.delete(doc.ref);
            deletedCount++;
            const sessionData = doc.data();
            const auditRef = db.collection('auditLogs').doc();
            batch.set(auditRef, {
                action: 'SESSION_AUTO_DELETE',
                userId: sessionData.userId,
                resourceType: 'session',
                resourceId: doc.id,
                details: { reason: 'session_expired', expiresAt: sessionData.expiresAt },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                ip: 'system-cron',
            });
        }
        batchOps.push(batch);
    }
    // 2. Also clean up legacy sessions (no expiresAt) older than 90 days as fallback
    const RETENTION_DAYS = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const oldSessionsQuery = await db.collection('sessions')
        .where('updatedAt', '<', cutoffDate)
        .limit(500)
        .get();
    if (!oldSessionsQuery.empty) {
        const batch = db.batch();
        for (const doc of oldSessionsQuery.docs) {
            // Skip if already handled by expiresAt query
            if (expiredQuery.docs.some(d => d.id === doc.id))
                continue;
            batch.delete(doc.ref);
            deletedCount++;
            const sessionData = doc.data();
            const auditRef = db.collection('auditLogs').doc();
            batch.set(auditRef, {
                action: 'SESSION_AUTO_DELETE',
                userId: sessionData.userId,
                resourceType: 'session',
                resourceId: doc.id,
                details: { reason: 'retention_policy', retentionDays: RETENTION_DAYS },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                ip: 'system-cron',
            });
        }
        batchOps.push(batch);
    }
    if (deletedCount === 0) {
        console.log('No old sessions to cleanup');
        return { deleted: 0 };
    }
    for (const batch of batchOps) {
        await batch.commit();
    }
    console.log(`Cleaned up ${deletedCount} old sessions`);
    return { deleted: deletedCount };
});
// ============================================
// SCHEDULED FUNCTION: Cleanup Orphaned Sessions
// Sessions without recent updates (abandoned)
// ============================================
exports.cleanupAbandonedSessions = functions.pubsub.schedule('0 3 * * *') // 3 AM daily
    .timeZone('America/New_York')
    .onRun(async (_context) => {
    const ABANDONED_DAYS = 7; // 7 days without update
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ABANDONED_DAYS);
    // Query abandoned sessions (created but never completed step 1)
    const abandonedQuery = await db.collection('sessions')
        .where('status', '==', 'STEP1_COMPLETE')
        .where('updatedAt', '<', cutoffDate)
        .where('step2', '==', null) // No step 2 data
        .limit(500)
        .get();
    if (abandonedQuery.empty) {
        console.log('No abandoned sessions to cleanup');
        return { deleted: 0 };
    }
    const batch = db.batch();
    let deletedCount = 0;
    for (const doc of abandonedQuery.docs) {
        batch.delete(doc.ref);
        deletedCount++;
    }
    await batch.commit();
    console.log(`Cleaned up ${deletedCount} abandoned sessions`);
    return { deleted: deletedCount };
});
// ============================================
// SECTION LOCK FUNCTIONS (Clinical Data Integrity)
// ============================================
// Lock a section to prevent further edits
exports.lockSection = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userId, section, locked, reason } = data;
    // 2. Users can only lock their own sections
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Can only lock own sections');
    }
    try {
        const lockRef = db.collection('users').doc(userId).collection('sectionLocks').doc(section);
        const lockData = Object.assign({ locked,
            section, lockedAt: admin.firestore.FieldValue.serverTimestamp(), lockedBy: context.auth.uid, reason: reason || (locked ? 'Section completed and locked' : 'Section unlocked') }, (locked && { originalLocker: context.auth.uid }));
        await lockRef.set(lockData, { merge: true });
        // Log the lock action
        await logAudit('SECTION_LOCK', context.auth.uid, 'user', userId, {
            section,
            locked,
            reason: lockData.reason,
            timestamp: new Date().toISOString()
        });
        return {
            success: true,
            section,
            locked,
            message: `Section ${section} ${locked ? 'locked' : 'unlocked'} successfully`
        };
    }
    catch (error) {
        console.error('Error locking section:', error);
        throw new functions.https.HttpsError('internal', 'Failed to lock section');
    }
});
// Get lock status for user sections
exports.getSectionLocks = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userId } = data;
    // 2. Users can only check their own locks
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Can only check own locks');
    }
    try {
        const locksSnapshot = await db.collection('users').doc(userId).collection('sectionLocks').get();
        const locks = {};
        locksSnapshot.forEach(doc => {
            locks[doc.id] = doc.data();
        });
        return {
            success: true,
            locks,
            userId
        };
    }
    catch (error) {
        console.error('Error getting section locks:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get section locks');
    }
});
// ============================================
// COST OPTIMIZATION & CLEANUP FUNCTIONS
// ============================================
// Clean up old audit logs (keep only 1 year for compliance)
exports.cleanupOldAuditLogs = functions.pubsub.schedule('0 5 * * 0') // 5 AM every Sunday
    .timeZone('America/New_York')
    .onRun(async (_context) => {
    const RETENTION_DAYS = 2190; // Keep audit logs for 6 years (HIPAA 45 CFR §164.530(j))
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    try {
        const oldLogsQuery = await db.collection('auditLogs')
            .where('timestamp', '<', cutoffDate)
            .limit(500)
            .get();
        if (oldLogsQuery.empty) {
            console.log('No old audit logs to cleanup');
            return { deleted: 0 };
        }
        const batch = db.batch();
        oldLogsQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${oldLogsQuery.docs.length} old audit logs`);
        return { deleted: oldLogsQuery.docs.length };
    }
    catch (error) {
        console.error('Error cleaning up old audit logs:', error);
        throw error;
    }
});
// Optimize database by removing empty documents and consolidating data
exports.optimizeDatabase = functions.pubsub.schedule('0 6 * * 0') // 6 AM every Sunday
    .timeZone('America/New_York')
    .onRun(async (_context) => {
    try {
        let optimizedCount = 0;
        // Clean up users without any sessions (abandoned registrations)
        const usersQuery = await db.collection('users')
            .limit(100)
            .get();
        for (const userDoc of usersQuery.docs) {
            const userSessions = await db.collection('sessions')
                .where('userId', '==', userDoc.id)
                .limit(1)
                .get();
            // Remove users with no sessions and older than 90 days
            if (userSessions.empty && userDoc.data().createdAt) {
                const createdAt = userDoc.data().createdAt.toDate();
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                if (createdAt < ninetyDaysAgo) {
                    await userDoc.ref.delete();
                    optimizedCount++;
                    console.log(`Removed abandoned user: ${userDoc.id}`);
                }
            }
        }
        console.log(`Database optimization completed: Removed ${optimizedCount} abandoned records`);
        return { optimizedCount };
    }
    catch (error) {
        console.error('Error optimizing database:', error);
        throw error;
    }
});
// ============================================
// HTTP FUNCTION: NPI Registry proxy
// The CMS NPI Registry API does not send CORS headers, so the browser
// cannot call it directly. This function proxies requests server-side.
// Firebase Hosting rewrites /api/npi/** to this function.
// ============================================
exports.npiProxy = functions.https.onRequest((req, res) => {
    const suffix = req.url.replace(/^\/api\/npi/, '/api');
    const npiUrl = `https://npiregistry.cms.hhs.gov${suffix}`;
    const upstream = https.get(npiUrl, (proxyRes) => {
        let body = '';
        proxyRes.on('data', (chunk) => { body += chunk.toString(); });
        proxyRes.on('end', () => {
            try {
                res.json(JSON.parse(body));
            }
            catch (_a) {
                res.status(502).json({ error: 'Invalid NPI response' });
            }
        });
        proxyRes.on('error', () => {
            res.status(502).json({ error: 'NPI upstream read error' });
        });
    });
    upstream.on('error', () => {
        res.status(502).json({ error: 'NPI upstream connection error' });
    });
});
// ============================================
// HTTP FUNCTION: User Data Export (GDPR/CCPA compliance)
// Allows users to export their own data
// ============================================
exports.exportUserData = functions.https.onCall(async (_data, context) => {
    // Rate limiting (stricter for exports)
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    // Get user data (non-sensitive only)
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    // Get all sessions
    const sessionsQuery = await db.collection('sessions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    const sessions = sessionsQuery.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    // Get audit logs for user's actions
    const auditQuery = await db.collection('auditLogs')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();
    const auditLogs = auditQuery.docs.map(doc => doc.data());
    // Audit the export
    await logAudit('DATA_EXPORT', userId, 'user', userId, {
        sessionCount: sessions.length,
        auditLogCount: auditLogs.length,
    });
    return {
        user: userData,
        sessions,
        auditLogs,
        exportedAt: new Date().toISOString(),
    };
});
// ============================================
// HTTP FUNCTION: User Data Deletion (GDPR/CCPA compliance)
// Allows users to delete all their data
// ============================================
exports.deleteUserData = functions.https.onCall(async (_data, context) => {
    // Rate limiting (stricter for deletion)
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    // Delete all sessions
    const sessionsQuery = await db.collection('sessions')
        .where('userId', '==', userId)
        .get();
    const batch = db.batch();
    let deletedSessions = 0;
    for (const doc of sessionsQuery.docs) {
        batch.delete(doc.ref);
        deletedSessions++;
    }
    // Delete user document
    batch.delete(db.collection('users').doc(userId));
    // Log final audit before deleting (can't log after user deleted)
    const auditRef = db.collection('auditLogs').doc();
    batch.set(auditRef, {
        action: 'USER_DELETE',
        userId: userId,
        resourceType: 'user',
        resourceId: userId,
        details: { deletedSessions, reason: 'user_request' },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: 'user-request',
    });
    await batch.commit();
    return {
        success: true,
        deletedSessions,
        userDeleted: true,
    };
});
// ============================================
// CLOUD FUNCTION: Submit to REDCap
// ============================================
// The REDCap API token is stored as a Firebase Functions secret.
// Deploy with: firebase functions:secrets:set REDCAP_TOKEN
// Then set REDCAP_API_URL in environment config.
//
// To deploy the secret: firebase functions:secrets:set REDCAP_TOKEN
// To set the URL: firebase functions:config:set redcap.url="https://redcap.mountsinai.org/api/"
exports.submitRedcap = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const record = data === null || data === void 0 ? void 0 : data.record;
    if (!record || typeof record !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing record payload');
    }
    // Token and URL come from Firebase Functions secrets / environment config — never from client
    const token = process.env.REDCAP_TOKEN;
    const url = process.env.REDCAP_API_URL;
    if (!token || !url) {
        console.warn('REDCap not configured — REDCAP_TOKEN or REDCAP_API_URL missing');
        throw new functions.https.HttpsError('failed-precondition', 'REDCap not configured on server');
    }
    const body = new URLSearchParams({
        token,
        content: 'record',
        format: 'json',
        type: 'flat',
        data: JSON.stringify([record]),
        returnContent: 'ids',
    });
    const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
    const res = await fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) {
        const text = await res.text();
        console.error('REDCap error:', res.status, text);
        throw new functions.https.HttpsError('internal', `REDCap returned HTTP ${res.status}`);
    }
    await logAudit('REDCAP_SUBMIT', context.auth.uid, 'research', String((_a = record.record_id) !== null && _a !== void 0 ? _a : 'unknown'));
    return { success: true };
});
//# sourceMappingURL=index.js.map