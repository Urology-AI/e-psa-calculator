/**
 * Firebase Configuration for Admin Dashboard
 * Uses production Firebase directly (no emulators)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Admin Firebase configuration - uses production directly
const adminFirebaseConfig = {
  apiKey: "AIzaSyA3qMN6_moBA6ZXUC1mD4yZP9YxBXd1Mps",
  authDomain: "epsa-30d0b.firebaseapp.com",
  projectId: "epsa-30d0b",
  storageBucket: "epsa-30d0b.firebasestorage.app",
  messagingSenderId: "148985999968",
  appId: "1:148985999968:web:2c49caf6875ca31f348905",
  measurementId: "G-0W0CWTK14Q"
};

// Initialize Firebase for admin - no emulators
const adminApp = initializeApp(adminFirebaseConfig, 'admin-app');
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

// Explicitly disable any emulator connections
adminAuth.settings.appVerificationDisabledForTesting = false;
adminAuth.tenantId = null;

// Ensure we're using production, not emulator
console.log('🔥 Admin Firebase initialized in PRODUCTION mode');
console.log('Project ID:', adminFirebaseConfig.projectId);
console.log('🚫 Emulators DISABLED for admin dashboard');

// Admin analytics service
export const adminAnalytics = {
  trackEvent: async (eventType, data) => {
    console.log('Admin Analytics:', eventType, data);
    // Add admin-specific analytics tracking here if needed
  }
};

export default adminApp;
