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
exports.deleteUserData = exports.exportUserData = exports.updateAdminLastLogin = exports.npiProxy = exports.optimizeDatabase = exports.cleanupOldAuditLogs = exports.cleanupInactiveAdmins = exports.exportSessionsCSV = exports.exportUsersCSV = exports.getDecryptedPhone = exports.storeEncryptedPhone = exports.adminLogin = exports.getSectionLocks = exports.unlockSection = exports.lockSection = exports.getUsersWithConsent = exports.getSessionStatsForAdmin = exports.listSessionsForAdmin = exports.cleanupAbandonedSessions = exports.cleanupOldSessions = exports.getSession = exports.getUserPhone = exports.checkCollections = exports.loginAnonymousBySessionId = exports.getUser = exports.getUserSessions = exports.deleteSession = exports.updateSession = exports.createSession = exports.upsertConsent = exports.adminLinkPublicSessionToSinai = exports.adminResyncPublicSession = exports.adminGetPublicSession = exports.adminListPublicConsentedSessions = exports.adminListClinicCodeAuditLog = exports.adminRevokeClinicCode = exports.adminGenerateClinicCodes = exports.adminToggleSinaiRedcapEnabled = exports.adminDeleteSinaiSession = exports.adminSubmitSinaiSession = exports.adminGetSinaiSession = exports.adminListSinaiSessions = exports.markCodeImported = exports.submitSinaiSession = exports.validateClinicCode = exports.submitToRedcap = exports.syncToRedcap = void 0;
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
// Sinai clinic cohort — IRB STUDY-14-00050.
// Clinical responses are stored in sinaiSessions/{sessionId} (auto-deleted
// after 30 days via Firestore TTL) and optionally pushed to Sinai REDCap.
// All Sinai data is keyed only by clinic code — never tied to PII.
var sinaiCohort_1 = require("./sinaiCohort");
Object.defineProperty(exports, "validateClinicCode", { enumerable: true, get: function () { return sinaiCohort_1.validateClinicCode; } });
Object.defineProperty(exports, "submitSinaiSession", { enumerable: true, get: function () { return sinaiCohort_1.submitSinaiSession; } });
Object.defineProperty(exports, "markCodeImported", { enumerable: true, get: function () { return sinaiCohort_1.markCodeImported; } });
// Admin-only callables for the dashboard (codes, sessions, flag, audit).
var sinaiAdmin_1 = require("./sinaiAdmin");
Object.defineProperty(exports, "adminListSinaiSessions", { enumerable: true, get: function () { return sinaiAdmin_1.adminListSinaiSessions; } });
Object.defineProperty(exports, "adminGetSinaiSession", { enumerable: true, get: function () { return sinaiAdmin_1.adminGetSinaiSession; } });
Object.defineProperty(exports, "adminSubmitSinaiSession", { enumerable: true, get: function () { return sinaiAdmin_1.adminSubmitSinaiSession; } });
Object.defineProperty(exports, "adminDeleteSinaiSession", { enumerable: true, get: function () { return sinaiAdmin_1.adminDeleteSinaiSession; } });
Object.defineProperty(exports, "adminToggleSinaiRedcapEnabled", { enumerable: true, get: function () { return sinaiAdmin_1.adminToggleSinaiRedcapEnabled; } });
Object.defineProperty(exports, "adminGenerateClinicCodes", { enumerable: true, get: function () { return sinaiAdmin_1.adminGenerateClinicCodes; } });
Object.defineProperty(exports, "adminRevokeClinicCode", { enumerable: true, get: function () { return sinaiAdmin_1.adminRevokeClinicCode; } });
Object.defineProperty(exports, "adminListClinicCodeAuditLog", { enumerable: true, get: function () { return sinaiAdmin_1.adminListClinicCodeAuditLog; } });
// Public-cohort viewers (sessions/* + users/{uid}, gated on researchConsent)
Object.defineProperty(exports, "adminListPublicConsentedSessions", { enumerable: true, get: function () { return sinaiAdmin_1.adminListPublicConsentedSessions; } });
Object.defineProperty(exports, "adminGetPublicSession", { enumerable: true, get: function () { return sinaiAdmin_1.adminGetPublicSession; } });
Object.defineProperty(exports, "adminResyncPublicSession", { enumerable: true, get: function () { return sinaiAdmin_1.adminResyncPublicSession; } });
// Admin-attested linking of a public session into the Sinai cohort
Object.defineProperty(exports, "adminLinkPublicSessionToSinai", { enumerable: true, get: function () { return sinaiAdmin_1.adminLinkPublicSessionToSinai; } });
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
    race: zod_1.z.enum(['black', 'white', 'asian', 'hispanic', 'other', 'prefer-not-to-say']),
    heightFt: zod_1.z.union([zod_1.z.number().int().min(1).max(9), zod_1.z.string(), zod_1.z.null()]).optional(),
    heightIn: zod_1.z.union([zod_1.z.number().int().min(0).max(11), zod_1.z.string(), zod_1.z.null()]).optional(),
    heightCm: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.string(), zod_1.z.null()]).optional(),
    weight: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
    bmi: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
    heightUnit: zod_1.z.enum(['ft', 'cm', 'imperial', 'metric']).optional().transform(val => val === 'imperial' ? 'ft' : val === 'metric' ? 'cm' : val),
    weightUnit: zod_1.z.enum(['lbs', 'kg']).optional(),
    weightKg: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.string(), zod_1.z.null()]).optional(),
    familyHistory: zod_1.z.union([zod_1.z.number().int().min(0).max(3), zod_1.z.null()]).transform(val => val === null ? 0 : val),
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
    // Create session document with 30-day expiry
    const sessionRef = db.collection('sessions').doc();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sessionData = {
        userId,
        status: 'STEP1_COMPLETE',
        pathwayMode: data.pathwayMode || null,
        step1: stripUndefined(step1Data),
        result: data.result || null,
        expiresAt: admin.firestore.Timestamp.fromDate(thirtyDaysFromNow),
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
    const userId = (data === null || data === void 0 ? void 0 : data.userId) || context.auth.uid;
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
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (lastActivity.toDate() < thirtyDaysAgo) {
                throw new functions.https.HttpsError('deadline-exceeded', 'Session has expired. Anonymous sessions last 30 days. Please start a new session.');
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
            migrateBatch.set(matchedDoc.ref, {
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
// CLOUD FUNCTION: Check Collections (HIPAA Safe)
// ============================================
exports.checkCollections = functions.https.onCall(async (_data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    try {
        console.log('Checking collection structure (HIPAA compliant)...');
        // Get all collections in the database (this only returns collection names, no data)
        const collections = await db.listCollections();
        const result = {
            timestamp: new Date().toISOString(),
            totalCollections: collections.length,
            collections: collections.map(c => ({
                name: c.id,
                path: c.path
            })),
            note: 'This is HIPAA compliant - only collection names and paths are shown, no user data is accessed'
        };
        console.log('Collection check complete:', result);
        return result;
    }
    catch (error) {
        console.error('Error checking collections:', error);
        throw new functions.https.HttpsError('internal', 'Failed to check collections');
    }
});
// ============================================
// CLOUD FUNCTION: Get User Phone Info (Admin Only)
// ============================================
exports.getUserPhone = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId required');
    }
    try {
        console.log('Looking for phone data for user:', userId);
        // First, check if phone data is stored directly in the users collection
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
                console.log('User document fields:', Object.keys(userData));
                // Check for phone fields in user document
                const phoneFields = Object.keys(userData).filter(key => key.toLowerCase().includes('phone') ||
                    key.toLowerCase().includes('mobile') ||
                    key.toLowerCase().includes('contact'));
                if (phoneFields.length > 0) {
                    console.log('Found phone fields in user document:', phoneFields);
                    // Return phone data from user document
                    const phoneField = phoneFields[0]; // Take first phone field
                    return {
                        phoneNumber: userData[phoneField],
                        phoneHash: userData.phoneHash || userData.hash || null,
                        storedAt: userData.createdAt || userData.timestamp || null,
                        encryptionMethod: 'Stored in user document',
                        foundLocation: 'users collection',
                        fieldName: phoneField
                    };
                }
            }
        }
        // Try multiple possible collection names for phone data
        const possibleCollections = ['securePhoneData', 'phoneData', 'encryptedPhones', 'userPhones', 'phoneNumbers'];
        let phoneData = null;
        let foundCollection = '';
        for (const collectionName of possibleCollections) {
            const doc = await db.collection(collectionName).doc(userId).get();
            if (doc.exists) {
                phoneData = doc.data();
                foundCollection = collectionName;
                console.log(`Found phone data in collection: ${collectionName}`);
                break;
            }
        }
        if (!phoneData) {
            console.log('No phone data found in any collection for user:', userId);
            console.log('Checked collections:', possibleCollections);
            return null;
        }
        console.log('Phone data fields:', Object.keys(phoneData || {}));
        console.log('Phone data sample:', phoneData);
        if (!phoneData) {
            console.log('Phone data is null/undefined');
            return null;
        }
        // Check for different possible field names
        const encryptedPhone = phoneData.encryptedPhone || phoneData.phoneNumber || phoneData.phone || phoneData.encryptedNumber || phoneData.number;
        const encryptionKey = phoneData.encryptionKey || phoneData.key || phoneData.encryptionKey || phoneData.secretKey;
        if (!encryptedPhone || !encryptionKey) {
            console.log('Missing encryption fields - encryptedPhone:', !!encryptedPhone, 'encryptionKey:', !!encryptionKey);
            console.log('Available fields:', Object.keys(phoneData));
            // If we can't decrypt, at least return what we have
            return {
                phoneNumber: encryptedPhone || phoneData.phoneNumber || phoneData.phone || phoneData.number || null,
                phoneHash: phoneData.phoneHash || phoneData.hash || phoneData.phoneNumberHash || null,
                storedAt: phoneData.storedAt || phoneData.createdAt || phoneData.timestamp || null,
                encryptionMethod: 'AES-256',
                note: 'Encryption data not found - showing raw data if available',
                foundCollection: foundCollection,
                availableFields: Object.keys(phoneData)
            };
        }
        // Decrypt the phone number
        const CryptoJS = require('crypto-js');
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedPhone, encryptionKey);
        const decryptedPhone = decryptedBytes.toString(CryptoJS.enc.Utf8);
        console.log('Decrypted phone:', decryptedPhone);
        // Return the decrypted phone number and metadata
        return {
            phoneNumber: decryptedPhone,
            phoneHash: phoneData.phoneHash || phoneData.hash || phoneData.phoneNumberHash || null,
            storedAt: phoneData.storedAt || phoneData.createdAt || phoneData.timestamp || null,
            encryptionMethod: 'AES-256',
            foundCollection: foundCollection
        };
    }
    catch (error) {
        console.error('Error getting user phone info:', error);
        throw new functions.https.HttpsError('internal', 'Failed to retrieve phone information');
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
            throw new functions.https.HttpsError('deadline-exceeded', 'Session has expired. Anonymous sessions last 30 days.');
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
    // 1. Delete sessions that have passed their explicit expiresAt timestamp (30-day anonymous sessions)
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
// ADMIN AUTHENTICATION & MANAGEMENT
// ============================================
// Check if user is admin based on Firestore database
async function isAdminUser(userId) {
    try {
        console.log('Checking admin document for userId:', userId);
        const adminDoc = await db.collection('admins').doc(userId).get();
        console.log('Admin document exists:', adminDoc.exists);
        if (!adminDoc.exists) {
            console.log('Admin document not found for userId:', userId);
            return false;
        }
        const adminData = adminDoc.data();
        console.log('Admin document data:', { userId, isActive: adminData === null || adminData === void 0 ? void 0 : adminData.isActive, data: adminData });
        const isActive = (adminData === null || adminData === void 0 ? void 0 : adminData.isActive) === true;
        console.log('Admin isActive result:', { userId, isActive });
        return isActive;
    }
    catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}
// ============================================
// CLOUD FUNCTION: List Sessions for Admin (HIPAA-safe: no PHI)
// ============================================
exports.listSessionsForAdmin = functions.https.onCall(async (data, context) => {
    var _a;
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    try {
        const limitNum = Math.min((_a = data === null || data === void 0 ? void 0 : data.limit) !== null && _a !== void 0 ? _a : 100, 500);
        const usersQuery = await db.collection('users')
            .orderBy('lastLoginAt', 'desc')
            .limit(limitNum)
            .get();
        const sessions = usersQuery.docs.map(doc => {
            const d = doc.data();
            const toMs = (v) => {
                if (v == null)
                    return null;
                if (typeof v === 'object' && v !== null && typeof v.toMillis === 'function') {
                    return v.toMillis();
                }
                if (typeof v === 'number')
                    return v;
                const t = new Date(v).getTime();
                return Number.isNaN(t) ? null : t;
            };
            const created = toMs(d.createdAt);
            const lastLogin = toMs(d.lastLoginAt);
            return {
                id: doc.id,
                sessionId: d.sessionId || doc.id,
                createdAt: created != null ? new Date(created).toISOString() : null,
                lastLoginAt: lastLogin != null ? new Date(lastLogin).toISOString() : null,
            };
        });
        await logAudit('DATA_ACCESS_SESSIONS_LIST', context.auth.uid, 'admin', 'system', {
            recordCount: sessions.length,
            timestamp: new Date().toISOString(),
            note: 'HIPAA-safe: only session IDs and timestamps returned, no PHI',
        });
        return { success: true, sessions };
    }
    catch (error) {
        functions.logger.error('listSessionsForAdmin failed', error);
        throw new functions.https.HttpsError('internal', 'Failed to list sessions');
    }
});
// ============================================
// CLOUD FUNCTION: Get Session Stats for Admin (HIPAA-safe: aggregates only)
// ============================================
exports.getSessionStatsForAdmin = functions.https.onCall(async (_data, context) => {
    enforceRateLimit(context);
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    try {
        const snapshot = await db.collection('users').orderBy('lastLoginAt', 'desc').limit(1000).get();
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        let recentSessions = 0;
        snapshot.docs.forEach(doc => {
            const d = doc.data();
            const raw = d.lastLoginAt;
            let t = 0;
            if (raw != null) {
                if (typeof raw.toMillis === 'function') {
                    t = raw.toMillis();
                }
                else {
                    t = new Date(raw).getTime();
                }
            }
            if (t >= weekAgo)
                recentSessions++;
        });
        await logAudit('DATA_ACCESS_SESSION_STATS', context.auth.uid, 'admin', 'system', {
            totalSessions: snapshot.size,
            recentSessions,
            timestamp: new Date().toISOString(),
            note: 'HIPAA-safe: aggregate counts only, no PHI',
        });
        return {
            success: true,
            totalSessions: snapshot.size,
            recentSessions,
        };
    }
    catch (error) {
        functions.logger.error('getSessionStatsForAdmin failed', error);
        throw new functions.https.HttpsError('internal', 'Failed to get session stats');
    }
});
// ============================================
// CLOUD FUNCTION: Get Users with Consent (Admin Only)
// ============================================
exports.getUsersWithConsent = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    try {
        const limit = (data === null || data === void 0 ? void 0 : data.limit) || 100;
        // 3. Get users with consent (simplified query to avoid index requirement)
        const usersQuery = await db.collection('users')
            .where('consentToContact', '==', true)
            .limit(limit)
            .get();
        const users = usersQuery.docs.map(doc => (Object.assign({ userId: doc.id }, doc.data())));
        // Sort by createdAt on the client side instead of server side
        users.sort((a, b) => {
            var _a, _b;
            const dateA = ((_a = a.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const dateB = ((_b = b.createdAt) === null || _b === void 0 ? void 0 : _b.toMillis) ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return dateB - dateA; // descending order
        });
        // 4. Log access
        await logAudit('DATA_ACCESS_USERS', context.auth.uid, 'admin', 'system', {
            recordCount: users.length,
            timestamp: new Date().toISOString()
        });
        return {
            success: true,
            users,
            count: users.length
        };
    }
    catch (error) {
        console.error('Error getting users with consent:', error);
        throw new functions.https.HttpsError('internal', 'Failed to retrieve users data');
    }
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
    // 2. Users can only lock their own sections, admins can lock any
    if (context.auth.uid !== userId) {
        const isAdmin = await isAdminUser(context.auth.uid);
        if (!isAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Can only lock own sections or admin access required');
        }
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
// Unlock a section (admin only)
exports.unlockSection = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required to unlock sections');
    }
    const { userId, section, adminReason } = data;
    try {
        const lockRef = db.collection('users').doc(userId).collection('sectionLocks').doc(section);
        await lockRef.update({
            locked: false,
            unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
            unlockedBy: context.auth.uid,
            adminReason,
            previousLock: admin.firestore.FieldValue.delete()
        });
        // Log the unlock action
        await logAudit('SECTION_UNLOCK', context.auth.uid, 'admin', userId, {
            section,
            adminReason,
            timestamp: new Date().toISOString()
        });
        return {
            success: true,
            section,
            locked: false,
            message: `Section ${section} unlocked by admin`
        };
    }
    catch (error) {
        console.error('Error unlocking section:', error);
        throw new functions.https.HttpsError('internal', 'Failed to unlock section');
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
    // 2. Users can only check their own locks, admins can check any
    if (context.auth.uid !== userId) {
        const isAdmin = await isAdminUser(context.auth.uid);
        if (!isAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Can only check own locks or admin access required');
        }
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
// CLOUD FUNCTION: Admin Login Verification
// ============================================
exports.adminLogin = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        console.error('Admin login failed: No authentication context');
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { email } = data;
    const userEmail = context.auth.token.email;
    const userId = context.auth.uid;
    console.log('Admin login attempt:', { userId, userEmail, requestedEmail: email });
    // 2. Verify email matches authenticated user
    if (!userEmail || userEmail.toLowerCase() !== email.toLowerCase()) {
        console.error('Admin login failed: Email mismatch', { userEmail, requestedEmail: email });
        throw new functions.https.HttpsError('permission-denied', 'Email does not match authenticated user');
    }
    // 3. Check if user is admin in Firestore database
    console.log('Checking admin status for user:', userId);
    const isAdmin = await isAdminUser(userId);
    console.log('Admin status result:', { userId, isAdmin });
    if (!isAdmin) {
        console.error('Admin login failed: User not in admins collection or not active', { userId });
        throw new functions.https.HttpsError('permission-denied', 'Not authorized as admin. Admin access must be granted in Firestore database.');
    }
    // 4. Update last login and log admin access
    await Promise.all([
        db.collection('admins').doc(userId).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }),
        logAudit('ADMIN_LOGIN', context.auth.uid, 'admin', 'system', {
            email: userEmail,
            timestamp: new Date().toISOString()
        })
    ]);
    console.log('Admin login successful:', { userId, userEmail });
    return {
        success: true,
        email: userEmail,
        isAdmin: true,
        message: 'Admin access granted'
    };
});
// ============================================
// CLOUD FUNCTION: Store Encrypted Phone Number
// ============================================
exports.storeEncryptedPhone = functions.https.onCall(async (data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    const { userId, encryptedPhone, encryptionKey } = data;
    // 3. Validate input
    if (!userId || !encryptedPhone || !encryptionKey) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    // 4. Store in secure collection (separate from main user data)
    const securePhoneRef = db.collection('securePhoneData').doc(userId);
    await securePhoneRef.set({
        encryptedPhone,
        encryptionKey: crypto_js_1.default.SHA256(encryptionKey).toString(), // Hash the key for security
        storedBy: context.auth.uid,
        storedAt: admin.firestore.FieldValue.serverTimestamp(),
        accessLog: admin.firestore.FieldValue.arrayUnion({
            accessedBy: context.auth.uid,
            timestamp: new Date().toISOString(),
            action: 'store_encrypted_phone'
        })
    }, { merge: true });
    // 5. Log this sensitive operation
    await logAudit('PHONE_ENCRYPT_STORE', context.auth.uid, 'user', userId, {
        action: 'store_encrypted_phone',
        hasEncryptedPhone: true
    });
    return {
        success: true,
        message: 'Encrypted phone number stored securely'
    };
});
// ============================================
// CLOUD FUNCTION: Get Decrypted Phone Number
// ============================================
exports.getDecryptedPhone = functions.https.onCall(async (data, context) => {
    // Rate limiting (stricter for phone access)
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    const { userId, decryptionKey } = data;
    // 3. Get encrypted phone data
    const securePhoneDoc = await db.collection('securePhoneData').doc(userId).get();
    if (!securePhoneDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Encrypted phone data not found');
    }
    const phoneData = securePhoneDoc.data();
    if (!phoneData) {
        throw new functions.https.HttpsError('not-found', 'Phone data is empty');
    }
    // 4. Verify decryption key
    const keyHash = crypto_js_1.default.SHA256(decryptionKey).toString();
    if (phoneData.encryptionKey !== keyHash) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid decryption key');
    }
    // 5. Log this sensitive access
    await logAudit('PHONE_DECRYPT_ACCESS', context.auth.uid, 'user', userId, {
        action: 'decrypt_phone_access',
        reason: 'admin_lookup'
    });
    // 6. Return encrypted data (decryption happens client-side)
    return {
        userId,
        encryptedPhone: phoneData.encryptedPhone,
        storedAt: phoneData.storedAt,
        warning: 'Handle this data with extreme care. All access is logged.'
    };
});
// ============================================
// CLOUD FUNCTION: Export Users Data as CSV (Admin Only)
// ============================================
exports.exportUsersCSV = functions.https.onCall(async (_data, context) => {
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    try {
        // 3. Get all users with consent
        const usersQuery = await db.collection('users')
            .where('consentToContact', '==', true)
            .limit(1000)
            .get();
        // 4. Generate CSV headers
        const headers = [
            'User ID',
            'Email',
            'Consent to Contact',
            'Consent Timestamp',
            'Research Consent',
            'Research Timestamp',
            'Created At',
            'Updated At',
            'Phone Hash'
        ];
        // 5. Generate CSV rows
        const rows = usersQuery.docs.map(doc => {
            const data = doc.data();
            return [
                doc.id,
                data.email || 'N/A',
                data.consentToContact ? 'Yes' : 'No',
                data.consentTimestamp || 'N/A',
                data.researchConsent ? 'Yes' : 'No',
                data.researchTimestamp || 'N/A',
                data.createdAt || 'N/A',
                data.updatedAt || 'N/A',
                data.phoneHash || 'N/A'
            ].map(field => `"${String(field).replace(/"/g, '""')}"`); // Escape quotes
        });
        // 6. Combine headers and rows
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        // 7. Log export action
        await logAudit('DATA_EXPORT_USERS_CSV', context.auth.uid, 'admin', 'system', {
            exportType: 'users_csv',
            recordCount: usersQuery.docs.length,
            timestamp: new Date().toISOString()
        });
        return {
            success: true,
            csvContent,
            filename: `users_export_${new Date().toISOString().split('T')[0]}.csv`,
            recordCount: usersQuery.docs.length
        };
    }
    catch (error) {
        console.error('Error exporting users CSV:', error);
        throw new functions.https.HttpsError('internal', 'Failed to export users data');
    }
});
// ============================================
// CLOUD FUNCTION: Export Sessions Data as CSV (Admin Only)
// ============================================
exports.exportSessionsCSV = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Rate limiting
    enforceRateLimit(context);
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // 2. Admin authorization check (Firestore database)
    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required. Admin privileges must be granted in Firestore database.');
    }
    try {
        // 3. Build query
        let sessionsQuery = db.collection('sessions').limit(1000);
        if (((_a = data === null || data === void 0 ? void 0 : data.dateRange) === null || _a === void 0 ? void 0 : _a.start) && ((_b = data === null || data === void 0 ? void 0 : data.dateRange) === null || _b === void 0 ? void 0 : _b.end)) {
            const startDate = new Date(data.dateRange.start);
            const endDate = new Date(data.dateRange.end);
            sessionsQuery = sessionsQuery
                .where('createdAt', '>=', startDate)
                .where('createdAt', '<=', endDate);
        }
        const sessionsSnapshot = await sessionsQuery.get();
        // 4. Generate CSV headers
        const headers = [
            'Session ID',
            'User ID',
            'Status',
            'Created At',
            'Updated At',
            'Step1 - Age',
            'Step1 - Race',
            'Step1 - BMI',
            'Step1 - Family History',
            'Step1 - IPSS Total',
            'Step1 - SHIM Total',
            'Step2 - PSA',
            'Step2 - Know PSA',
            'Step2 - PIRADS',
            'Step2 - Know PIRADS',
            'Result - Risk Category',
            'Result - Risk Score'
        ];
        // 5. Generate CSV rows
        const rows = sessionsSnapshot.docs.map(doc => {
            const session = doc.data();
            const step1 = session.step1 || {};
            const step2 = session.step2 || {};
            const result = session.result || {};
            const ipssTotal = Array.isArray(step1.ipss) ? step1.ipss.reduce((a, b) => a + b, 0) : 0;
            const shimTotal = Array.isArray(step1.shim) ? step1.shim.reduce((a, b) => a + b, 0) : 0;
            return [
                doc.id,
                session.userId || 'N/A',
                session.status || 'N/A',
                session.createdAt || 'N/A',
                session.updatedAt || 'N/A',
                step1.age || 'N/A',
                step1.race || 'N/A',
                step1.bmi || 'N/A',
                step1.familyHistory || 'N/A',
                ipssTotal,
                shimTotal,
                step2.psa || 'N/A',
                step2.knowPsa ? 'Yes' : 'No',
                step2.pirads || 'N/A',
                step2.knowPirads ? 'Yes' : 'No',
                result.risk || 'N/A',
                result.score || 'N/A'
            ].map(field => `"${String(field).replace(/"/g, '""')}"`); // Escape quotes
        });
        // 6. Combine headers and rows
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        // 7. Log export action
        await logAudit('DATA_EXPORT_SESSIONS_CSV', context.auth.uid, 'admin', 'system', {
            exportType: 'sessions_csv',
            recordCount: sessionsSnapshot.docs.length,
            dateRange: (data === null || data === void 0 ? void 0 : data.dateRange) || 'all',
            timestamp: new Date().toISOString()
        });
        return {
            success: true,
            csvContent,
            filename: `sessions_export_${new Date().toISOString().split('T')[0]}.csv`,
            recordCount: sessionsSnapshot.docs.length
        };
    }
    catch (error) {
        console.error('Error exporting sessions CSV:', error);
        throw new functions.https.HttpsError('internal', 'Failed to export sessions data');
    }
});
// ============================================
// COST OPTIMIZATION & CLEANUP FUNCTIONS
// ============================================
// Clean up inactive admin users (remove admin access for inactive accounts)
exports.cleanupInactiveAdmins = functions.pubsub.schedule('0 4 * * 0') // 4 AM every Sunday
    .timeZone('America/New_York')
    .onRun(async (_context) => {
    const INACTIVE_DAYS = 90; // Remove admin access after 90 days of inactivity
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - INACTIVE_DAYS);
    try {
        // Get all admin users
        const adminsSnapshot = await db.collection('admins').get();
        let deactivatedCount = 0;
        for (const adminDoc of adminsSnapshot.docs) {
            const adminData = adminDoc.data();
            const lastLogin = adminData.lastLogin ? adminData.lastLogin.toDate() : adminData.createdAt.toDate();
            // Check if admin is inactive
            if (lastLogin < cutoffDate && adminData.isActive) {
                await adminDoc.ref.update({
                    isActive: false,
                    deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    deactivationReason: 'automatic_cleanup_inactive'
                });
                deactivatedCount++;
                console.log(`Deactivated inactive admin: ${adminDoc.id}`);
            }
        }
        console.log(`Cleanup completed: Deactivated ${deactivatedCount} inactive admins`);
        return { deactivatedCount };
    }
    catch (error) {
        console.error('Error cleaning up inactive admins:', error);
        throw error;
    }
});
// Clean up old audit logs (keep only 1 year for compliance)
exports.cleanupOldAuditLogs = functions.pubsub.schedule('0 5 * * 0') // 5 AM every Sunday
    .timeZone('America/New_York')
    .onRun(async (_context) => {
    const RETENTION_DAYS = 365; // Keep audit logs for 1 year
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
            // Remove users with no sessions and older than 30 days
            if (userSessions.empty && userDoc.data().createdAt) {
                const createdAt = userDoc.data().createdAt.toDate();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                if (createdAt < thirtyDaysAgo) {
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
// Update admin last login timestamp
exports.updateAdminLastLogin = functions.https.onCall(async (_data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const adminRef = db.collection('admins').doc(context.auth.uid);
        const adminDoc = await adminRef.get();
        if (adminDoc.exists && ((_a = adminDoc.data()) === null || _a === void 0 ? void 0 : _a.isActive)) {
            await adminRef.update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error updating admin last login:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update last login');
    }
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
//# sourceMappingURL=index.js.map