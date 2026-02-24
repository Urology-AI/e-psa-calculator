import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { z } from 'zod';
import CryptoJS from 'crypto-js';

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
  race: z.enum(['black', 'white', 'asian', 'hispanic', 'other', 'prefer-not-to-say']),
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
  dietPattern: z.enum(['western', 'mediterranean', 'asian', 'vegetarian', 'other']).optional().transform(val => val || ''),
  geographicOrigin: z.enum(['north-america', 'europe', 'asia', 'africa', 'south-america', 'oceania', 'other']).optional().transform(val => val || ''),
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
export const createSession = functions.https.onCall(async (data: { step1: unknown; step2?: unknown; result?: unknown }, context: functions.https.CallableContext) => {
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
      risk: z.enum(['LOWER', 'MODERATE', 'HIGHER']),
    });
    try {
      ResultSchema.parse(result);
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid result data', error);
    }
  }

  // Create session document
  const sessionRef = db.collection('sessions').doc();
  const sessionData = {
    userId,
    status: 'STEP1_COMPLETE',
    step1: step1Data,
    result: data.result || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await sessionRef.set(sessionData);

  // Update user's current session
  await db.collection('users').doc(userId).update({
    currentSessionId: sessionRef.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Audit log
  const resultData = data.result as { score?: number } | undefined;
  await logAudit('SESSION_CREATE', userId, 'session', sessionRef.id, {
    status: 'STEP1_COMPLETE',
    score: resultData?.score,
  });

  return { success: true, sessionId: sessionRef.id };
});

// ============================================
// CLOUD FUNCTION: Update Session (Step 2)
// ============================================
export const updateSession = functions.https.onCall(async (data: { sessionId: string; step2: unknown; result?: { riskCat: string; score: number } }, context: functions.https.CallableContext) => {
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
    step2: step2Data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (result) {
    updateData.finalCategory = result.riskCat;
    updateData.finalScore = result.score;
  }

  await sessionRef.update(updateData);

  // Audit log
  await logAudit('SESSION_UPDATE', userId, 'session', sessionId, {
    status: 'STEP2_COMPLETE',
    finalCategory: result?.riskCat,
  });

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
export const getUser = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
  // Rate limiting
  enforceRateLimit(context);
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data();

  // Audit log
  await logAudit('USER_READ', userId, 'user', userId);

  // Return only non-sensitive fields
  return {
    consentToContact: userData?.consentToContact,
    consentTimestamp: userData?.consentTimestamp,
    currentSessionId: userData?.currentSessionId,
  };
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
    const RETENTION_DAYS = 90; // 90 day retention
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Query old sessions
    const oldSessionsQuery = await db.collection('sessions')
      .where('updatedAt', '<', cutoffDate)
      .limit(500)
      .get();

    if (oldSessionsQuery.empty) {
      console.log('No old sessions to cleanup');
      return { deleted: 0 };
    }

    // Delete in batches
    const batch = db.batch();
    let deletedCount = 0;

    for (const doc of oldSessionsQuery.docs) {
      batch.delete(doc.ref);
      deletedCount++;
      
      // Log deletion for audit
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

    await batch.commit();
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
    const adminDoc = await db.collection('admins').doc(userId).get();
    return adminDoc.exists && adminDoc.data()?.isActive === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// ============================================
// CLOUD FUNCTION: Admin Login Verification
// ============================================
export const adminLogin = functions.https.onCall(async (data: AdminLoginData, context: functions.https.CallableContext) => {
  // Rate limiting
  enforceRateLimit(context);
  
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email } = data;
  const userEmail = context.auth.token.email;

  // 2. Verify email matches authenticated user
  if (!userEmail || userEmail.toLowerCase() !== email.toLowerCase()) {
    throw new functions.https.HttpsError('permission-denied', 'Email does not match authenticated user');
  }

  // 3. Check if user is admin in Firestore database
  const isAdmin = await isAdminUser(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized as admin. Admin access must be granted in Firestore database.');
  }

  // 4. Log admin access
  await logAudit('ADMIN_LOGIN', context.auth.uid, 'admin', 'system', {
    email: userEmail,
    timestamp: new Date().toISOString()
  });

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
