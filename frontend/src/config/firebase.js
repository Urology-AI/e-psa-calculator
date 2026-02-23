import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// Uses environment variables only - no hardcoded values
// For local development: set values in .env file (see .env.example)
// For GitHub Pages: set values as GitHub Secrets
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
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

// Initialize Firebase Analytics (only in browser, not SSR)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Use Firebase Auth Emulator for local development (bypasses reCAPTCHA)
// Run: firebase emulators:start --only auth
// Or use test phone numbers with production auth
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (isLocalhost && process.env.REACT_APP_USE_AUTH_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('Using Firebase Auth Emulator');
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export { analytics };
export { firebaseConfig };
export default app;
