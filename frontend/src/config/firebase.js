import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
// Uses environment variables only - no hardcoded values
// For local development: set values in .env file (see .env.example)
// For GitHub Pages: set values as GitHub Secrets
// For GitHub Pages demo: Firebase is disabled
const isGitHubPages = import.meta.env.VITE_GITHUB_PAGES === 'true';
const isFirebaseDisabled = import.meta.env.VITE_DISABLE_FIREBASE === 'true';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  if (isGitHubPages || isFirebaseDisabled) {
    return false;
  }
  return firebaseConfig.apiKey && 
         firebaseConfig.projectId && 
         firebaseConfig.appId;
};

// Validate that all required config values are present
const requiredFields = ['apiKey', 'projectId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (!isFirebaseConfigured()) {
  if (isGitHubPages || isFirebaseDisabled) {
    console.log('Firebase is disabled for GitHub Pages demo');
  } else {
    const errorMessage = `Firebase configuration is missing required values: ${missingFields.join(', ')}. ` +
      `Please set environment variables (see .env.example) or configure GitHub Secrets for deployment.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

// Initialize Firebase only if configured
let app, auth, db, functions, analytics;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  
  // Initialize Analytics only if measurementId is available
  if (firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }

  // Disable reCAPTCHA for development when using emulator
  if (window.location.hostname === 'localhost' && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true') {
    app.automaticDataCollectionEnabled = false;
    console.log('🚫 Automatic data collection disabled for emulator testing');
  }
} else {
  console.log('Firebase is not initialized - running in demo mode');
  // Set services to undefined for demo mode
  app = undefined;
  auth = undefined;
  db = undefined;
  functions = undefined;
  analytics = undefined;
}

// Check if running on localhost
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use Firebase Auth Emulator for local development (bypasses reCAPTCHA)
// Run: firebase emulators:start --only auth
// Or use test phone numbers with production auth
if (isLocalhost && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true' && auth) {
  // IMPORTANT: Set emulator settings BEFORE connecting
  auth.settings.appVerificationDisabledForTesting = true;
  auth.tenantId = null;
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔧 Using Firebase Auth Emulator (http://localhost:9099)');
  } catch (error) {
    console.error('Failed to connect to Auth Emulator:', error);
    console.log('Falling back to production auth (reCAPTCHA will be shown)');
  }
} else if (auth) {
  console.log('Using production Firebase auth (reCAPTCHA enabled)');
}

// Use Firebase Functions Emulator for local development
if (isLocalhost && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true' && functions) {
  connectFunctionsEmulator(functions, 'http://localhost:5001');
  console.log('🔧 Using Firebase Functions Emulator (http://localhost:5001)');
}

// Export Firebase services (will be undefined if not configured)
export { app, auth, db, functions, analytics, firebaseConfig, isFirebaseConfigured };
export default app;
