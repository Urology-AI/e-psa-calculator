import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * HIPAA-Compliant Backend Service
 * All PHI operations go through Cloud Functions with Admin SDK
 */

// Cloud Function references
const upsertConsentFn = httpsCallable(functions, 'upsertConsent');
const createSessionFn = httpsCallable(functions, 'createSession');
const updateSessionFn = httpsCallable(functions, 'updateSession');
const deleteSessionFn = httpsCallable(functions, 'deleteSession');
const getUserFn = httpsCallable(functions, 'getUser');
const getUserSessionsFn = httpsCallable(functions, 'getUserSessions');
const getSessionFn = httpsCallable(functions, 'getSession');

/**
 * Upsert user consent (backend validates and stores hashed phone only)
 */
export const upsertConsent = async (consentData) => {
  try {
    const result = await upsertConsentFn(consentData);
    return result.data;
  } catch (error) {
    console.error('upsertConsent error:', error);
    throw error;
  }
};

/**
 * Create session with step1 data (backend validates schema)
 */
export const createSession = async (sessionData) => {
  try {
    const result = await createSessionFn(sessionData);
    return result.data;
  } catch (error) {
    console.error('createSession error:', error);
    throw error;
  }
};

/**
 * Update session with step2 data (backend validates ownership)
 */
export const updateSession = async (sessionId, step2Data, result) => {
  try {
    const result_data = await updateSessionFn({
      sessionId,
      step2: step2Data,
      result
    });
    return result_data.data;
  } catch (error) {
    console.error('updateSession error:', error);
    throw error;
  }
};

/**
 * Delete session (backend verifies ownership)
 */
export const deleteSession = async (sessionId) => {
  try {
    const result = await deleteSessionFn({ sessionId });
    return result.data;
  } catch (error) {
    console.error('deleteSession error:', error);
    throw error;
  }
};

/**
 * Get user data (backend filters sensitive fields)
 */
export const getUser = async () => {
  try {
    const result = await getUserFn({});
    return result.data;
  } catch (error) {
    console.error('getUser error:', error);
    throw error;
  }
};

/**
 * Get user's sessions (backend enforces ownership)
 */
export const getUserSessions = async () => {
  try {
    const result = await getUserSessionsFn({});
    return result.data;
  } catch (error) {
    console.error('getUserSessions error:', error);
    throw error;
  }
};

/**
 * Get session by ID (backend verifies ownership)
 */
export const getSession = async (sessionId) => {
  try {
    const result = await getSessionFn({ sessionId });
    return result.data;
  } catch (error) {
    console.error('getSession error:', error);
    throw error;
  }
};
