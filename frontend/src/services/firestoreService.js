import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import CryptoJS from 'crypto-js';

/**
 * Hash phone number for secure storage
 */
export const hashPhone = (phone) => {
  return CryptoJS.SHA256(phone).toString();
};

/**
 * Create or update user document
 */
export const createOrUpdateUser = async (uid, phone, consentData) => {
  const userRef = doc(db, 'users', uid);
  const phoneHash = hashPhone(phone);
  
  // Ensure consentToContact is a boolean
  const consentToContact = consentData.consentToContact === true || consentData.consentToContact === 'true';
  
  const userData = {
    phone: phone, // E.164 format
    phoneHash: phoneHash,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    consentToContact: consentToContact,
    consentTimestamp: consentData.consentTimestamp || serverTimestamp(),
    followUpStatus: consentToContact ? 'PENDING' : 'DECLINED',
    updatedAt: serverTimestamp()
  };

  // Check if user exists
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    // Update existing user
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      consentToContact: consentToContact,
      consentTimestamp: consentData.consentTimestamp || serverTimestamp(),
      followUpStatus: consentToContact ? 'PENDING' : 'DECLINED',
      updatedAt: serverTimestamp()
    });
  } else {
    // Create new user
    await setDoc(userRef, userData);
  }

  return userData;
};

/**
 * Create session document
 */
export const createSession = async (uid, sessionData) => {
  const sessionRef = doc(collection(db, 'sessions'));
  const sessionId = sessionRef.id;

  const session = {
    uid: uid,
    createdAt: serverTimestamp(),
    status: sessionData.status, // 'STEP1_COMPLETE' | 'STEP2_COMPLETE'
    step1: sessionData.step1 || null,
    step2: sessionData.step2 || null,
    finalCategory: sessionData.finalCategory || null,
    version: 'epsa-v2',
    updatedAt: serverTimestamp()
  };

  await setDoc(sessionRef, session);

  // Update user's current session
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    currentSessionId: sessionId,
    updatedAt: serverTimestamp()
  });

  return sessionId;
};

/**
 * Update session
 */
export const updateSession = async (sessionId, updates) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Delete session
 */
export const deleteSession = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await deleteDoc(sessionRef);
};

/**
 * Clear user's current session
 */
export const clearUserSession = async (uid) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    currentSessionId: null,
    updatedAt: serverTimestamp()
  });
};

/**
 * Get user's sessions (for their own view)
 */
export const getUserSessions = async (uid) => {
  const sessionsRef = collection(db, 'sessions');
  const q = query(sessionsRef, where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get session by ID
 */
export const getSession = async (sessionId) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (sessionSnap.exists()) {
    return {
      id: sessionSnap.id,
      ...sessionSnap.data()
    };
  }
  return null;
};

/**
 * Get user document
 */
export const getUser = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return {
      id: userSnap.id,
      ...userSnap.data()
    };
  }
  return null;
};

/**
 * Update follow-up status (admin function)
 */
export const updateFollowUpStatus = async (uid, status) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    followUpStatus: status,
    updatedAt: serverTimestamp()
  });
};
