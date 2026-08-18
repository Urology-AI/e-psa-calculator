/**
 * Voice server list for Dr. Tewari's narration.
 * Reads the admin-published options from Firestore appConfig/voiceServers
 * (published by the admin dashboard), same public-read/admin-write pattern
 * as featureFlags.js and calculatorConfig.
 */

export const VOICE_SERVERS_CACHE_KEY = 'epsa_voice_servers';
export const VOICE_SERVERS_DOC_PATH = { collection: 'appConfig', doc: 'voiceServers' };

// Always available even if Firestore hasn't published anything yet, or the
// app is offline — this is what makes local development work out of the box.
export const DEFAULT_VOICE_SERVERS = [
  { name: 'Local (dev)', url: 'http://localhost:8000' },
];

export const getVoiceServers = () => {
  try {
    const stored = localStorage.getItem(VOICE_SERVERS_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (error) {
    console.error('Error loading cached voice servers:', error);
  }
  return DEFAULT_VOICE_SERVERS;
};

// Refresh the list from Firestore (if Firebase is configured).
// Returns the loaded list, or null if refresh failed.
export const refreshVoiceServers = async () => {
  try {
    const firebaseModule = await import('../config/firebase');
    const firestoreDb = firebaseModule.db;

    if (!firestoreDb) {
      return null;
    }

    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(firestoreDb, VOICE_SERVERS_DOC_PATH.collection, VOICE_SERVERS_DOC_PATH.doc);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    const servers = snap.data()?.servers;
    if (!Array.isArray(servers) || servers.length === 0) {
      return null;
    }

    localStorage.setItem(VOICE_SERVERS_CACHE_KEY, JSON.stringify(servers));
    return servers;
  } catch (error) {
    console.warn('Failed to refresh voice servers from Firestore:', error);
    return null;
  }
};
