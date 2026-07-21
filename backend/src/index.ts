import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import * as https from 'https';
import { z } from 'zod';
import CryptoJS from 'crypto-js';
import * as nodemailer from 'nodemailer';

const OTP_GMAIL_USER = defineSecret('OTP_GMAIL_USER');
const OTP_GMAIL_PASS = defineSecret('OTP_GMAIL_PASS');

// REDCap sync trigger (Firestore onWrite → REDCap API)
// submitToRedcap: callable function for local-storage users to push directly
export { syncToRedcap, submitToRedcap } from './redcapSync';

// Single source of truth for the pre-PSA and post-PSA/MRI recommendations,
// shared by web, epsa-screening-tool (via @urology-ai/epsa-engine), and the iOS app
// (via this callable).
export { calculatePsaRecommendation } from './psaEngine';

// Sinai clinic cohort — IRB STUDY-14-00050.
// Clinical responses are stored in sinaiSessions/{sessionId} (auto-deleted
// after 90 days of inactivity via Firestore TTL) and optionally pushed to Sinai REDCap.
// All Sinai data is keyed only by clinic code — never tied to PII.
export {
  validateClinicCode,
  submitSinaiSession,
  markCodeImported,
} from './sinaiCohort';

// Admin-only callables for the dashboard (codes, sessions, flag, audit).
export {
  adminListSinaiSessions,
  adminGetSinaiSession,
  adminSubmitSinaiSession,
  adminDeleteSinaiSession,
  adminToggleSinaiRedcapEnabled,
  adminGenerateClinicCodes,
  adminRevokeClinicCode,
  adminListClinicCodeAuditLog,
  // Public-cohort viewers (sessions/* + users/{uid}, gated on researchConsent)
  adminListPublicConsentedSessions,
  adminGetPublicSession,
  adminResyncPublicSession,
  // Admin-attested linking of a public session into the Sinai cohort
  adminLinkPublicSessionToSinai,
} from './sinaiAdmin';

// Type definitions for better type safety
interface AdminLoginData {
  email: string;
}

interface StoreEncryptedPhoneData {
  userId: string;
  encryptedPhone: string;
  encryptionKey: string;
}

interface GetDecryptedPhoneData {
  userId: string;
  decryptionKey: string;
}

interface LockSectionData {
  userId: string;
  section: 'part1' | 'part2';
  locked: boolean;
  reason?: string;
}

interface UnlockSectionData {
  userId: string;
  section: 'part1' | 'part2';
  adminReason: string;
}

interface AnonymousSessionLoginData {
  sessionId: string;
}

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Schema Definitions for Validation
const ConsentSchema = z.object({
  consentToContact: z.boolean(),
  consentTimestamp: z.string().datetime(),
  researchConsent: z.boolean().optional(),
  researchTimestamp: z.string().datetime().optional(),
});

const PreDataSchema = z.object({
  age: z.union([z.number().int().min(18).max(120), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  race: z.enum(['black', 'white', 'asian', 'hispanic', 'other', 'prefer-not-to-say', 'african-american', 'american-indian', 'native-hawaiian', 'unknown']),
  ethnicity: z.enum(['hispanic-latino', 'not-hispanic-latino', 'unknown']).optional(),
  heightFt: z.union([z.number().int().min(1).max(9), z.string(), z.null()]).optional(),
  heightIn: z.union([z.number().int().min(0).max(11), z.string(), z.null()]).optional(),
  heightCm: z.union([z.number().positive(), z.string(), z.null()]).optional(),
  weight: z.union([z.number().positive(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  bmi: z.union([z.number().positive(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  heightUnit: z.enum(['ft', 'cm', 'imperial', 'metric']).optional().transform(val => val === 'imperial' ? 'ft' : val === 'metric' ? 'cm' : val),
  weightUnit: z.enum(['lbs', 'kg']).optional(),
  weightKg: z.union([z.number().positive(), z.string(), z.null()]).optional(),
  familyHistory: z.union([z.number().int().min(0).max(3), z.null()]).transform(val => val === null ? 0 : val),
  brcaStatus: z.enum(['none', 'brca1', 'brca2', 'both', 'unknown']).optional().transform(val => val || 'unknown'),
  ipss: z.array(z.union([z.number().int().min(0).max(5), z.null()])).transform(arr => arr.map(val => val === null ? 0 : val)),
  shim: z.array(z.union([z.number().int().min(1).max(5), z.null()])).transform(arr => arr.map(val => val === null ? 1 : val)),
  exercise: z.union([z.number().int().min(0).max(2), z.null()]).transform(val => val === null ? 0 : val),
  smoking: z.union([z.number().int().min(0).max(2), z.null()]).optional(),
  chemicalExposure: z.union([z.number().int().min(0).max(1), z.null()]).optional(),
  dietPattern: z.enum(['western', 'mediterranean', 'dash', 'plant-based', 'pescatarian', 'low-carb-keto', 'other']).optional().transform(val => val || ''),
});

const PostDataSchema = z.object({
  psa: z.string().regex(/^\d*\.?\d*$/),
  knowPsa: z.boolean(),
  onHormonalTherapy: z.boolean().optional(),
  hormonalTherapyType: z.enum(['', 'finasteride', 'dutasteride', 'other']).optional(),
  knowPirads: z.boolean(),
  pirads: z.enum(['0', '1', '2', '3', '4', '5']),
});

// Utility: Hash phone number
function hashPhone(phone: string): string {
  return CryptoJS.SHA256(phone).toString();
}

// Utility: Remove undefined values from objects so Firestore Admin SDK doesn't throw.
// Zod optional() fields produce undefined when the key is absent; Firestore rejects undefined.
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================
// RATE LIMITING UTILITY
// ============================================
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();

function checkRateLimit(userId: string): boolean {
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

function enforceRateLimit(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  if (!checkRateLimit(userId)) {
    throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again later.');
  }
}

// Utility: Audit logging
async function logAudit(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
) {
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
export const upsertConsent = functions.https.onCall(async (data: { consentToContact: boolean; consentTimestamp: string; researchConsent?: boolean; researchTimestamp?: string }, context: functions.https.CallableContext) => {
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
  } catch (error) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid consent data', error);
  }

  // 3. Hash phone number (don't store raw)
  const phoneHash = hashPhone(phoneNumber);

  // 4. Write to Firestore with minimal fields
  const userRef = db.collection('users').doc(userId);
  await userRef.set({
    phoneHash, // Only store hash, not raw phone
    ...consentData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

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
export const createSession = functions.https.onCall(async (data: { step1: unknown; step2?: unknown; result?: unknown; pathwayMode?: string }, context: functions.https.CallableContext) => {
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
  } catch (error) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid step1 data', error);
  }

  // Validate calculated result
  if (data.result) {
    const result = data.result as { score: number; risk: string };
    const ResultSchema = z.object({
      score: z.number().int().min(0).max(100),
      risk: z.enum(['LOWER', 'MODERATE', 'HIGHER', 'PSA_RECOMMENDED', 'PSA_NOT_RECOMMENDED']),
    });
    try {
      ResultSchema.parse(result);
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid result data', error);
    }
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
    expiresAt: admin.firestore.Timestamp.fromDate(ninetyDaysFromNow),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await sessionRef.set(sessionData);
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to write session document', error);
  }

  // Update user's current session (use set+merge so it works even if user doc doesn't exist)
  try {
    await db.collection('users').doc(userId).set({
      currentSessionId: sessionRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (_error) {
    // Non-fatal: session was created, just user doc update failed
  }

  // Audit log (non-fatal)
  const resultData = data.result as { score?: number } | undefined;
  try {
    await logAudit('SESSION_CREATE', userId, 'session', sessionRef.id, {
      status: 'STEP1_COMPLETE',
      score: resultData?.score,
    });
  } catch (_error) {
    // Audit log failure should not block session creation
  }

  return { success: true, sessionId: sessionRef.id };
});

// ============================================
// CLOUD FUNCTION: Update Session (Step 2)
// ============================================
export const updateSession = functions.https.onCall(async (data: { sessionId: string; step2: unknown; result?: { riskCat: string; score: number }; pathwayMode?: string }, context: functions.https.CallableContext) => {
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
  } catch (error) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid step2 data', error);
  }

  // Verify session ownership
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Session not found');
  }

  const sessionData = sessionDoc.data();
  if (sessionData?.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Session does not belong to user');
  }

  // Update session
  const updateData: Record<string, unknown> = {
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
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to update session document', error);
  }

  // Audit log (non-fatal)
  try {
    await logAudit('SESSION_UPDATE', userId, 'session', sessionId, {
      status: 'STEP2_COMPLETE',
      finalCategory: result?.riskCat,
    });
  } catch (_error) {
    // Audit log failure should not block session update
  }

  return { success: true, sessionId };
});

// ============================================
// CLOUD FUNCTION: Delete Session
// ============================================
export const deleteSession = functions.https.onCall(async (data: { sessionId: string }, context: functions.https.CallableContext) => {
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
  if (sessionData?.userId !== userId) {
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
export const getUserSessions = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
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

  const sessions = sessionsQuery.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Audit log
  await logAudit('SESSIONS_LIST', userId, 'sessions', 'list', { count: sessions.length });

  return { sessions };
});

// ============================================
// CLOUD FUNCTION: Get User Data
// ============================================
export const getUser = functions.https.onCall(async (data: { userId?: string }, context: functions.https.CallableContext) => {
  // Rate limiting
  enforceRateLimit(context);
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const requestedId = data?.userId;
  const callerId = context.auth.uid;

  // IDOR fix: non-admin users may only fetch their own data
  if (requestedId && requestedId !== callerId) {
    const isAdmin = await isAdminUser(callerId);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'You may only access your own data');
    }
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
    isAnonymous: userData?.isAnonymous ?? false,
    sessionId: userData?.sessionId ?? null,
    authMethod: userData?.authMethod ?? null,
    displayName: userData?.displayName ?? null,
    consentToContact: userData?.consentToContact,
    consentTimestamp: userData?.consentTimestamp,
    researchConsent: userData?.researchConsent,
    researchTimestamp: userData?.researchTimestamp,
    currentSessionId: userData?.currentSessionId,
    createdAt: userData?.createdAt,
    updatedAt: userData?.updatedAt,
    expiresAt: userData?.expiresAt ?? null,
  };
});

// ============================================
// CLOUD FUNCTION: Restore Anonymous Session by Session ID
// ============================================
export const loginAnonymousBySessionId = functions.https.onCall(async (data: AnonymousSessionLoginData, context: functions.https.CallableContext) => {
  try {
    // Rate limiting
    enforceRateLimit(context);
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const parsed = z.object({
      sessionId: z.string().regex(/^[A-Z0-9]{8}$/, 'Session ID must be 8 uppercase alphanumeric characters')
    }).safeParse({
      sessionId: (data?.sessionId || '').toUpperCase().trim()
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

    if (matchedData?.isAnonymous !== true) {
      throw new functions.https.HttpsError('failed-precondition', 'Session ID is not linked to an anonymous account');
    }

    // Check if the user account has expired (no activity for 30+ days)
    const userUpdatedAt = matchedData?.updatedAt as admin.firestore.Timestamp | undefined;
    const userCreatedAt = matchedData?.createdAt as admin.firestore.Timestamp | undefined;
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
        consentToContact: matchedData.consentToContact ?? null,
        consentTimestamp: matchedData.consentTimestamp ?? null,
        currentSessionId: matchedData.currentSessionId ?? null,
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
    } else {
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
      consentToContact: finalUserData.consentToContact ?? null,
      consentTimestamp: finalUserData.consentTimestamp || null
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    functions.logger.error('loginAnonymousBySessionId failed', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    throw new functions.https.HttpsError('internal', `Session restore failed: ${error?.message || 'unknown error'}`);
  }
});

// ============================================
// CLOUD FUNCTION: Check Collections (HIPAA Safe)
// ============================================
export const checkCollections = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
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

  } catch (error) {
    console.error('Error checking collections:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check collections');
  }
});

// ============================================
// CLOUD FUNCTION: Get User Phone Info (Admin Only)
// ============================================
export const getUserPhone = functions.https.onCall(async (data: { userId: string }, context: functions.https.CallableContext) => {
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
        const phoneFields = Object.keys(userData).filter(key => 
          key.toLowerCase().includes('phone') || 
          key.toLowerCase().includes('mobile') || 
          key.toLowerCase().includes('contact')
        );
        
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

  } catch (error) {
    console.error('Error getting user phone info:', error);
    throw new functions.https.HttpsError('internal', 'Failed to retrieve phone information');
  }
});

// ============================================
// CLOUD FUNCTION: Get Session by ID
// ============================================
export const getSession = functions.https.onCall(async (data: { sessionId: string }, context: functions.https.CallableContext) => {
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
  if (sessionData?.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Session does not belong to user');
  }

  // Check if session has expired
  if (sessionData?.expiresAt) {
    const expiresAt = sessionData.expiresAt as admin.firestore.Timestamp;
    if (expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Session has expired. Anonymous sessions last 90 days of inactivity.');
    }
  }

  // Audit log
  await logAudit('SESSION_READ', userId, 'session', sessionId);

  return {
    id: sessionDoc.id,
    ...sessionData,
  };
});

// ============================================
// SCHEDULED FUNCTION: Cleanup Old Sessions (Data Lifecycle)
// Runs daily to delete sessions older than retention period
// ============================================
export const cleanupOldSessions = functions.pubsub.schedule('0 2 * * *') // 2 AM daily
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const now = admin.firestore.Timestamp.now();
    let deletedCount = 0;
    const batchOps: admin.firestore.WriteBatch[] = [];

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
        if (expiredQuery.docs.some(d => d.id === doc.id)) continue;
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
export const cleanupAbandonedSessions = functions.pubsub.schedule('0 3 * * *') // 3 AM daily
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
async function isAdminUser(userId: string): Promise<boolean> {
  try {
    console.log('Checking admin document for userId:', userId);
    const adminDoc = await db.collection('admins').doc(userId).get();
    console.log('Admin document exists:', adminDoc.exists);
    
    if (!adminDoc.exists) {
      console.log('Admin document not found for userId:', userId);
      return false;
    }
    
    const adminData = adminDoc.data();
    console.log('Admin document data:', { userId, isActive: adminData?.isActive, data: adminData });
    
    const isActive = adminData?.isActive === true;
    console.log('Admin isActive result:', { userId, isActive });
    
    return isActive;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// ============================================
// CLOUD FUNCTION: List Sessions for Admin (HIPAA-safe: no PHI)
// ============================================
export const listSessionsForAdmin = functions.https.onCall(async (data: { limit?: number }, context: functions.https.CallableContext) => {
  enforceRateLimit(context);
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const isAdmin = await isAdminUser(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }
  try {
    const limitNum = Math.min(data?.limit ?? 100, 500);
    const usersQuery = await db.collection('users')
      .orderBy('lastLoginAt', 'desc')
      .limit(limitNum)
      .get();
    const sessions = usersQuery.docs.map(doc => {
      const d = doc.data();
      const toMs = (v: unknown): number | null => {
        if (v == null) return null;
        if (typeof v === 'object' && v !== null && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
          return (v as { toMillis: () => number }).toMillis();
        }
        if (typeof v === 'number') return v;
        const t = new Date(v as string).getTime();
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
  } catch (error) {
    functions.logger.error('listSessionsForAdmin failed', error);
    throw new functions.https.HttpsError('internal', 'Failed to list sessions');
  }
});

// ============================================
// CLOUD FUNCTION: Get Session Stats for Admin (HIPAA-safe: aggregates only)
// ============================================
export const getSessionStatsForAdmin = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
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
        if (typeof (raw as { toMillis?: () => number }).toMillis === 'function') {
          t = (raw as { toMillis: () => number }).toMillis();
        } else {
          t = new Date(raw as string | number).getTime();
        }
      }
      if (t >= weekAgo) recentSessions++;
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
  } catch (error) {
    functions.logger.error('getSessionStatsForAdmin failed', error);
    throw new functions.https.HttpsError('internal', 'Failed to get session stats');
  }
});

// ============================================
// CLOUD FUNCTION: Get Users with Consent (Admin Only)
// ============================================
export const getUsersWithConsent = functions.https.onCall(async (data: { limit?: number }, context: functions.https.CallableContext) => {
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
    const limit = data?.limit || 100;
    
    // 3. Get users with consent (simplified query to avoid index requirement)
    const usersQuery = await db.collection('users')
      .where('consentToContact', '==', true)
      .limit(limit)
      .get();

    const users = usersQuery.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt on the client side instead of server side
    users.sort((a: any, b: any) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
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

  } catch (error) {
    console.error('Error getting users with consent:', error);
    throw new functions.https.HttpsError('internal', 'Failed to retrieve users data');
  }
});

// ============================================
// SECTION LOCK FUNCTIONS (Clinical Data Integrity)
// ============================================

// Lock a section to prevent further edits
export const lockSection = functions.https.onCall(async (data: LockSectionData, context: functions.https.CallableContext) => {
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
    const lockData = {
      locked,
      section,
      lockedAt: admin.firestore.FieldValue.serverTimestamp(),
      lockedBy: context.auth.uid,
      reason: reason || (locked ? 'Section completed and locked' : 'Section unlocked'),
      ...(locked && { originalLocker: context.auth.uid })
    };

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

  } catch (error) {
    console.error('Error locking section:', error);
    throw new functions.https.HttpsError('internal', 'Failed to lock section');
  }
});

// Unlock a section (admin only)
export const unlockSection = functions.https.onCall(async (data: UnlockSectionData, context: functions.https.CallableContext) => {
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

  } catch (error) {
    console.error('Error unlocking section:', error);
    throw new functions.https.HttpsError('internal', 'Failed to unlock section');
  }
});

// Get lock status for user sections
export const getSectionLocks = functions.https.onCall(async (data: { userId: string }, context: functions.https.CallableContext) => {
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
    const locks: Record<string, any> = {};

    locksSnapshot.forEach(doc => {
      locks[doc.id] = doc.data();
    });

    return {
      success: true,
      locks,
      userId
    };

  } catch (error) {
    console.error('Error getting section locks:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get section locks');
  }
});

// ============================================
// CLOUD FUNCTION: Admin Login Verification
// ============================================
export const adminLogin = functions.https.onCall(async (data: AdminLoginData, context: functions.https.CallableContext) => {
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
export const storeEncryptedPhone = functions.https.onCall(async (data: StoreEncryptedPhoneData, context: functions.https.CallableContext) => {
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
    encryptionKey: CryptoJS.SHA256(encryptionKey).toString(), // Hash the key for security
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
export const getDecryptedPhone = functions.https.onCall(async (data: GetDecryptedPhoneData, context: functions.https.CallableContext) => {
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
  const keyHash = CryptoJS.SHA256(decryptionKey).toString();
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
export const exportUsersCSV = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
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

  } catch (error) {
    console.error('Error exporting users CSV:', error);
    throw new functions.https.HttpsError('internal', 'Failed to export users data');
  }
});

// ============================================
// CLOUD FUNCTION: Export Sessions Data as CSV (Admin Only)
// ============================================
export const exportSessionsCSV = functions.https.onCall(async (data: { dateRange?: { start: string; end: string } }, context: functions.https.CallableContext) => {
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
    
    if (data?.dateRange?.start && data?.dateRange?.end) {
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
      'Step1 - Ethnicity',
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

      const ipssTotal = Array.isArray(step1.ipss) ? step1.ipss.reduce((a: number, b: number) => a + b, 0) : 0;
      const shimTotal = Array.isArray(step1.shim) ? step1.shim.reduce((a: number, b: number) => a + b, 0) : 0;

      return [
        doc.id,
        session.userId || 'N/A',
        session.status || 'N/A',
        session.createdAt || 'N/A',
        session.updatedAt || 'N/A',
        step1.age || 'N/A',
        step1.race || 'N/A',
        step1.ethnicity || 'N/A',
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
      dateRange: data?.dateRange || 'all',
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      csvContent,
      filename: `sessions_export_${new Date().toISOString().split('T')[0]}.csv`,
      recordCount: sessionsSnapshot.docs.length
    };

  } catch (error) {
    console.error('Error exporting sessions CSV:', error);
    throw new functions.https.HttpsError('internal', 'Failed to export sessions data');
  }
});

// ============================================
// COST OPTIMIZATION & CLEANUP FUNCTIONS
// ============================================

// Clean up inactive admin users (remove admin access for inactive accounts)
export const cleanupInactiveAdmins = functions.pubsub.schedule('0 4 * * 0') // 4 AM every Sunday
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
    } catch (error) {
      console.error('Error cleaning up inactive admins:', error);
      throw error;
    }
  });

// Clean up old audit logs (keep only 1 year for compliance)
export const cleanupOldAuditLogs = functions.pubsub.schedule('0 5 * * 0') // 5 AM every Sunday
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
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      throw error;
    }
  });

// Optimize database by removing empty documents and consolidating data
export const optimizeDatabase = functions.pubsub.schedule('0 6 * * 0') // 6 AM every Sunday
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
    } catch (error) {
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
export const npiProxy = functions.https.onRequest((req, res) => {
  const suffix = req.url.replace(/^\/api\/npi/, '/api');
  const npiUrl = `https://npiregistry.cms.hhs.gov${suffix}`;

  const upstream = https.get(npiUrl, (proxyRes) => {
    let body = '';
    proxyRes.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    proxyRes.on('end', () => {
      try {
        res.json(JSON.parse(body));
      } catch {
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
export const updateAdminLastLogin = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const adminRef = db.collection('admins').doc(context.auth.uid);
    const adminDoc = await adminRef.get();

    if (adminDoc.exists && adminDoc.data()?.isActive) {
      await adminRef.update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating admin last login:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update last login');
  }
});

// ============================================
// HTTP FUNCTION: User Data Export (GDPR/CCPA compliance)
// Allows users to export their own data
// ============================================
export const exportUserData = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
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

  const sessions = sessionsQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

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
export const deleteUserData = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
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
export const submitRedcap = functions.https.onCall(async (data: { record?: Record<string, unknown> }, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const record = data?.record;
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

  const fetch = (await import('node-fetch')).default;
  const res = await (fetch as (url: string, init: object) => Promise<{ok: boolean, status: number, text: () => Promise<string>}>)(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('REDCap error:', res.status, text);
    throw new functions.https.HttpsError('internal', `REDCap returned HTTP ${res.status}`);
  }

  await logAudit('REDCAP_SUBMIT', context.auth.uid, 'research', String(record.record_id ?? 'unknown'));
  return { success: true };
});

// ── Admin OTP Authentication ──────────────────────────────────────────────────
// Replaces magic-link login. Admins enter email → receive a 6-digit code →
// enter the code → get a Firebase custom token to sign in with.

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

export const sendAdminOTP = functions.runWith({ secrets: ['OTP_GMAIL_USER', 'OTP_GMAIL_PASS'] }).https.onCall(async (data: { email: string }) => {
  const email = (data.email || '').toLowerCase().trim();
  if (!email) throw new functions.https.HttpsError('invalid-argument', 'Email required');

  // Only pre-registered admins can receive an OTP
  const db = admin.firestore();
  const adminsSnap = await db.collection('admins').where('email', '==', email).limit(1).get();
  if (adminsSnap.empty) {
    // Return success anyway to avoid email enumeration
    return { success: true };
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = CryptoJS.SHA256(code).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  await db.collection('admin_otps').doc(email).set({
    hash,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const gmailUser = OTP_GMAIL_USER.value();
  const gmailPass = OTP_GMAIL_PASS.value();
  if (!gmailUser || !gmailPass) throw new functions.https.HttpsError('internal', 'OTP email not configured');
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } });

  await transport.sendMail({
    from: `"ePSA Admin" <${gmailUser}>`,
    to: email,
    subject: 'Your ePSA Admin Login Code',
    text: `Your one-time login code is: ${code}\n\nThis code expires in 10 minutes. Do not share it.`,
    html: `
      <p>Your ePSA Admin one-time login code is:</p>
      <h2 style="letter-spacing:4px;font-family:monospace">${code}</h2>
      <p>This code expires in <strong>10 minutes</strong>. Do not share it.</p>
    `,
  });

  return { success: true };
});

export const verifyAdminOTP = functions.https.onCall(async (data: { email: string; code: string }) => {
  const email = (data.email || '').toLowerCase().trim();
  const code = (data.code || '').trim();
  if (!email || !code) throw new functions.https.HttpsError('invalid-argument', 'Email and code required');

  const db = admin.firestore();
  const otpRef = db.collection('admin_otps').doc(email);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'No OTP found. Please request a new code.');
  }

  const { hash, expiresAt, attempts } = otpDoc.data()!;

  if (Date.now() > expiresAt) {
    await otpRef.delete();
    throw new functions.https.HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await otpRef.delete();
    throw new functions.https.HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }

  const inputHash = CryptoJS.SHA256(code).toString();
  if (inputHash !== hash) {
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new functions.https.HttpsError('unauthenticated', 'Invalid code.');
  }

  // Code correct — clean up and issue a custom token
  await otpRef.delete();

  // Look up the admin's Firebase Auth UID (or create one)
  let uid: string;
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    uid = userRecord.uid;
  } catch {
    // Create a passwordless Firebase Auth user for this admin
    const newUser = await admin.auth().createUser({ email, emailVerified: true });
    uid = newUser.uid;
  }

  const customToken = await admin.auth().createCustomToken(uid, { isAdmin: true });
  await admin.firestore().collection('admins').doc(uid).update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {}); // best-effort

  return { success: true, customToken };
});
