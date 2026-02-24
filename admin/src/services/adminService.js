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

// New admin authentication functions
const adminLoginFn = httpsCallable(functions, 'adminLogin');
const getAdminUsersFn = httpsCallable(functions, 'getAdminUsers');
const storeEncryptedPhoneFn = httpsCallable(functions, 'storeEncryptedPhone');
const getDecryptedPhoneFn = httpsCallable(functions, 'getDecryptedPhone');

// CSV export functions
const exportUsersCSVFn = httpsCallable(functions, 'exportUsersCSV');
const exportSessionsCSVFn = httpsCallable(functions, 'exportSessionsCSV');

// Section lock functions
const lockSectionFn = httpsCallable(functions, 'lockSection');
const unlockSectionFn = httpsCallable(functions, 'unlockSection');
const getSectionLocksFn = httpsCallable(functions, 'getSectionLocks');

// Phone data diagnostic function (HIPAA safe)
const checkCollectionsFn = httpsCallable(functions, 'checkCollections');

/**
 * Admin login verification
 */
export const adminLogin = async (email) => {
  try {
    const result = await adminLoginFn({ email });
    return result.data;
  } catch (error) {
    console.error('adminLogin error:', error);
    throw error;
  }
};

/**
 * Get list of authorized admin users
 */
export const getAdminUsers = async () => {
  try {
    const result = await getAdminUsersFn();
    return result.data;
  } catch (error) {
    console.error('getAdminUsers error:', error);
    throw error;
  }
};

/**
 * Store encrypted phone number for a user
 */
export const storeEncryptedPhone = async (userId, encryptedPhone, encryptionKey) => {
  try {
    const result = await storeEncryptedPhoneFn({ 
      userId, 
      encryptedPhone, 
      encryptionKey 
    });
    return result.data;
  } catch (error) {
    console.error('storeEncryptedPhone error:', error);
    throw error;
  }
};

/**
 * Get decrypted phone number (returns encrypted data for client-side decryption)
 */
export const getDecryptedPhone = async (userId, decryptionKey) => {
  try {
    const result = await getDecryptedPhoneFn({ 
      userId, 
      decryptionKey 
    });
    return result.data;
  } catch (error) {
    console.error('getDecryptedPhone error:', error);
    throw error;
  }
};

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

/**
 * Export users data as CSV (admin only)
 */
export const exportUsersCSV = async () => {
  try {
    const result = await exportUsersCSVFn();
    return result.data;
  } catch (error) {
    console.error('exportUsersCSV error:', error);
    throw error;
  }
};

/**
 * Export sessions data as CSV (admin only)
 */
export const exportSessionsCSV = async (dateRange = null) => {
  try {
    const result = await exportSessionsCSVFn({ dateRange });
    return result.data;
  } catch (error) {
    console.error('exportSessionsCSV error:', error);
    throw error;
  }
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Lock a user section (prevent edits)
 */
export const lockSection = async (userId, section, reason) => {
  try {
    const result = await lockSectionFn({ userId, section, locked: true, reason });
    return result.data;
  } catch (error) {
    console.error('lockSection error:', error);
    throw error;
  }
};

/**
 * Unlock a user section (admin only)
 */
export const unlockSection = async (userId, section, adminReason) => {
  try {
    const result = await unlockSectionFn({ userId, section, adminReason });
    return result.data;
  } catch (error) {
    console.error('unlockSection error:', error);
    throw error;
  }
};

/**
 * Get section locks for a user
 */
export const getSectionLocks = async (userId) => {
  try {
    const result = await getSectionLocksFn({ userId });
    return result.data;
  } catch (error) {
    console.error('getSectionLocks error:', error);
    throw error;
  }
};

/**
 * Check collections (HIPAA safe - only collection names, no data)
 */
export const checkCollections = async () => {
  try {
    const result = await checkCollectionsFn();
    return result.data;
  } catch (error) {
    console.error('checkCollections error:', error);
    throw error;
  }
};
