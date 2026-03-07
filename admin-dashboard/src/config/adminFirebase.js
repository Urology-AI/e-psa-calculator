/**
 * Firebase Configuration for Admin Dashboard
 * Uses production Firebase by default with optional emulator support.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const useAuthEmulator = import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';
const useFirestoreEmulator = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true';

// Admin Firebase configuration
const adminFirebaseConfig = {
  apiKey: "AIzaSyA3qMN6_moBA6ZXUC1mD4yZP9YxBXd1Mps",
  authDomain: "epsa-30d0b.firebaseapp.com",
  projectId: "epsa-30d0b",
  storageBucket: "epsa-30d0b.firebasestorage.app",
  messagingSenderId: "148985999968",
  appId: "1:148985999968:web:2c49caf6875ca31f348905",
  measurementId: "G-0W0CWTK14Q"
};

// Initialize Firebase for admin
const adminApp = initializeApp(adminFirebaseConfig, 'admin-app');
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminFunctions = getFunctions(adminApp);

if (isLocalhost && useAuthEmulator) {
  adminAuth.settings.appVerificationDisabledForTesting = true;
  adminAuth.tenantId = null;
  connectAuthEmulator(adminAuth, 'http://localhost:9099', { disableWarnings: true });
}

if (isLocalhost && useFirestoreEmulator) {
  connectFirestoreEmulator(adminDb, 'localhost', 8080);
}

if (import.meta.env.DEV) {
  console.log('🔥 Admin Firebase initialized');
  console.log('Project ID:', adminFirebaseConfig.projectId);
  console.log(`Auth emulator: ${isLocalhost && useAuthEmulator ? 'enabled' : 'disabled'}`);
  console.log(`Firestore emulator: ${isLocalhost && useFirestoreEmulator ? 'enabled' : 'disabled'}`);
}

// Admin analytics service
export const adminAnalytics = {
  trackEvent: async (eventType, data) => {
    if (import.meta.env.DEV) {
      console.log('Admin Analytics:', eventType, data);
    }
    // Add admin-specific analytics tracking here if needed
  }
};

export default adminApp;
