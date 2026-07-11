/**
 * Runtime feature flags
 * Reads app-wide toggles from Firestore appConfig/featureFlags (published by
 * the admin dashboard), same public-read/admin-write pattern as calculatorConfig.
 */

export const FEATURE_FLAGS_STORAGE_KEY = 'epsa_feature_flags';
export const FEATURE_FLAGS_DOC_PATH = { collection: 'appConfig', doc: 'featureFlags' };

// Biomarkers step is off by default until an admin enables it from the dashboard.
export const DEFAULT_FEATURE_FLAGS = {
  biomarkersEnabled: false,
};

// Get current flags (from localStorage cache or defaults)
export const getFeatureFlags = () => {
  try {
    const stored = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading feature flags:', error);
  }
  return DEFAULT_FEATURE_FLAGS;
};

// Refresh flags from Firestore (if Firebase is configured)
// Returns the loaded flags, or null if refresh failed.
export const refreshFeatureFlags = async () => {
  try {
    const firebaseModule = await import('../config/firebase');
    const firestoreDb = firebaseModule.db;

    if (!firestoreDb) {
      return null;
    }

    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(firestoreDb, FEATURE_FLAGS_DOC_PATH.collection, FEATURE_FLAGS_DOC_PATH.doc);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    const flags = { ...DEFAULT_FEATURE_FLAGS, ...snap.data() };
    localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags));
    return flags;
  } catch (error) {
    console.warn('Failed to refresh feature flags from Firestore:', error);
    return null;
  }
};
