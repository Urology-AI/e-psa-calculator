import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// Cloud Function references for admin operations
const getUserFn = httpsCallable(functions, 'getUser');
const getUserSessionsFn = httpsCallable(functions, 'getUserSessions');
const getSessionFn = httpsCallable(functions, 'getSession');
const getUserPhoneFn = httpsCallable(functions, 'getUserPhone');
const searchUserByPhoneHashFn = httpsCallable(functions, 'searchUserByPhoneHash');
const getUsersWithConsentFn = httpsCallable(functions, 'getUsersWithConsent');
const exportUserDataFn = httpsCallable(functions, 'exportUserData');
const deleteUserDataFn = httpsCallable(functions, 'deleteUserData');

/**
 * Get user information
 */
export const getUser = async (userId) => {
  try {
    const result = await getUserFn({ userId });
    return result.data;
  } catch (error) {
    console.error('getUser error:', error);
    throw error;
  }
};

/**
 * Get all sessions for a user
 */
export const getUserSessions = async (userId) => {
  try {
    const result = await getUserSessionsFn({ userId });
    return result.data;
  } catch (error) {
    console.error('getUserSessions error:', error);
    throw error;
  }
};

/**
 * Get specific session details
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

/**
 * Get user phone information (admin only)
 */
export const getUserPhone = async (userId) => {
  try {
    const result = await getUserPhoneFn({ userId });
    return result.data;
  } catch (error) {
    console.error('getUserPhone error:', error);
    throw error;
  }
};

/**
 * Search user by phone hash (admin only)
 */
export const searchUserByPhoneHash = async (phoneHash) => {
  try {
    const result = await searchUserByPhoneHashFn({ phoneHash });
    return result.data;
  } catch (error) {
    console.error('searchUserByPhoneHash error:', error);
    throw error;
  }
};

/**
 * Get users who consented to contact (admin only)
 */
export const getUsersWithConsent = async (limit = 100) => {
  try {
    const result = await getUsersWithConsentFn({ limit });
    return result.data;
  } catch (error) {
    console.error('getUsersWithConsent error:', error);
    throw error;
  }
};

/**
 * Export user data (GDPR/CCPA compliance)
 */
export const exportUserData = async (userId) => {
  try {
    const result = await exportUserDataFn({ userId });
    return result.data;
  } catch (error) {
    console.error('exportUserData error:', error);
    throw error;
  }
};

/**
 * Delete user data (admin only)
 */
export const deleteUserData = async (userId) => {
  try {
    const result = await deleteUserDataFn({ userId });
    return result.data;
  } catch (error) {
    console.error('deleteUserData error:', error);
    throw error;
  }
};
