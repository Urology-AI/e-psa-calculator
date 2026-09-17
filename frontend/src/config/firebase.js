import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { initializeAuth, browserSessionPersistence, browserPopupRedirectResolver, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, memoryLocalCache } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

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

// reCAPTCHA Enterprise site key registered for this web app in Firebase App
// Check. Public identifier (it ships in every page), not a secret.
const RECAPTCHA_ENTERPRISE_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '6Lfzu8AtAAAAANpQ5hIH7CRiqQjUV_Gwq3Q4shws';

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

const isDev = import.meta.env.DEV;
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const useAuthEmulator = import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';
const useFunctionsEmulator = import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true';
const useFirestoreEmulator = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true';

if (!isFirebaseConfigured()) {
  if (isGitHubPages || isFirebaseDisabled) {
    if (isDev) {
      console.log('Firebase is disabled for GitHub Pages demo');
    }
  } else {
    const errorMessage = `Firebase configuration is missing required values: ${missingFields.join(', ')}. ` +
      `Please set environment variables (see .env.example) or configure GitHub Secrets for deployment.`;
    console.error(errorMessage);
  }
}

// Initialize Firebase only if configured
let app, auth, db, functions, analytics;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  // App Check: attests requests come from this web app (reCAPTCHA Enterprise,
  // invisible score-based). Must run before any other Firebase service is
  // used. The site key is public by design. Skipped on localhost (reCAPTCHA
  // won't attest it), so local dev and emulators keep working.
  if (!isLocalhost) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.error('App Check initialization failed:', error);
    }
  }
  // Tab-scoped auth: the anonymous identity survives a reload (so a reload
  // doesn't mint a new account and burn Firebase's per-IP sign-up quota) but
  // dies with the tab, so the next person on a shared device can't be signed
  // back into someone else's session. Returning patients use their key.
  auth = initializeAuth(app, {
    persistence: browserSessionPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  // Memory-only cache: patient documents must never be written to the
  // device's IndexedDB, where they would outlive the tab (and a deletion) on
  // shared or clinic devices.
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
  functions = getFunctions(app);
  
  // Disable analytics for localhost to avoid CSP/noise during emulator testing.
  const shouldInitAnalytics = Boolean(firebaseConfig.measurementId) && !isLocalhost;
  if (shouldInitAnalytics) {
    analytics = getAnalytics(app);
  } else if (isDev) {
    console.log('📉 Analytics disabled for local/emulator run');
  }

  // Disable reCAPTCHA for development when using emulator
  if (window.location.hostname === 'localhost' && useAuthEmulator) {
    app.automaticDataCollectionEnabled = false;
    if (isDev) {
      console.log('🚫 Automatic data collection disabled for emulator testing');
    }
  }
} else {
  if (isDev) {
    console.log('Firebase is not initialized - running in demo mode');
  }
  // Set services to undefined for demo mode
  app = undefined;
  auth = undefined;
  db = undefined;
  functions = undefined;
  analytics = undefined;
}

if (isDev) {
  console.log('Firebase runtime mode:', {
    localhost: isLocalhost,
    useAuthEmulator,
    useFunctionsEmulator,
    useFirestoreEmulator
  });
}

// Use Firebase Auth Emulator for local development (bypasses reCAPTCHA)
// Run: firebase emulators:start --only auth
// Or use test phone numbers with production auth
if (isLocalhost && useAuthEmulator && auth) {
  // IMPORTANT: Set emulator settings BEFORE connecting
  auth.settings.appVerificationDisabledForTesting = true;
  auth.tenantId = null;
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    if (isDev) {
      console.log('🔧 Using Firebase Auth Emulator (http://localhost:9099)');
    }
  } catch (error) {
    console.error('Failed to connect to Auth Emulator:', error);
    if (isDev) {
      console.log('Falling back to production auth (reCAPTCHA will be shown)');
    }
  }
} else if (auth) {
  if (isDev) {
    console.log('Using production Firebase auth (reCAPTCHA enabled)');
  }
}

// Use Firebase Functions Emulator for local development
if (isLocalhost && useFunctionsEmulator && functions) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
  if (isDev) {
    console.log('🔧 Using Firebase Functions Emulator (localhost:5001)');
  }
}

// Use Firestore Emulator for local development
if (isLocalhost && useFirestoreEmulator && db) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  if (isDev) {
    console.log('🔧 Using Firestore Emulator (localhost:8080)');
  }
}

// Export Firebase services (will be undefined if not configured)
export { app, auth, db, functions, analytics, firebaseConfig, isFirebaseConfigured };
export default app;
