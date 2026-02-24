import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
// Uses environment variables only - no hardcoded values
// For local development: set values in .env file (see .env.example)
// For GitHub Pages: set values as GitHub Secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that all required config values are present
const requiredFields = ['apiKey', 'projectId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  const errorMessage = `Firebase configuration is missing required values: ${missingFields.join(', ')}. ` +
    `Please set environment variables (see .env.example) or configure GitHub Secrets for deployment.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Disable reCAPTCHA for development when using emulator
if (window.location.hostname === 'localhost' && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true') {
  app.automaticDataCollectionEnabled = false;
  console.log('🚫 Automatic data collection disabled for emulator testing');
}

// Initialize Firebase Analytics (only in browser, not SSR)
let analytics = null;
if (typeof window !== 'undefined' && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Check if running on localhost
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use Firebase Auth Emulator for local development (bypasses reCAPTCHA)
// Run: firebase emulators:start --only auth
// Or use test phone numbers with production auth
if (isLocalhost && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true') {
  // IMPORTANT: Set emulator settings BEFORE connecting
  auth.settings.appVerificationDisabledForTesting = true;
  auth.tenantId = null;
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Firebase Auth Emulator connected on port 9099');
    console.log('reCAPTCHA should be bypassed');
  } catch (error) {
    console.error('Failed to connect to Auth Emulator:', error);
    console.log('Falling back to production auth (reCAPTCHA will be shown)');
  }
} else {
  console.log('Using production Firebase auth (reCAPTCHA enabled)');
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Functions
export const functions = getFunctions(app);

// Use Firebase Functions Emulator for local development
if (isLocalhost && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('Using Firebase Functions Emulator');
}

export { analytics };
export { firebaseConfig };
export default app;
