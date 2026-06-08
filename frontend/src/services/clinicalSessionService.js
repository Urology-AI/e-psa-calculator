import {
  collection, doc, setDoc, getDocs, deleteDoc,
  serverTimestamp, orderBy, query, where
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from '../config/firebase';

const LOCAL_KEY = 'epsa_clinical_sessions';
const DEVICE_KEY = 'epsa_device_id';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function setLocal(sessions) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions)); } catch {}
}

/** Returns a Firebase UID (anonymous) or device-local ID. */
export async function getOrCreateUid() {
  if (isFirebaseConfigured() && auth) {
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      return auth.currentUser?.uid || getDeviceId();
    } catch {
      return getDeviceId();
    }
  }
  return getDeviceId();
}

/**
 * Normalise any incoming session shape into the unified format.
 *
 * Unified format:
 *   version       "epsa-session-v1"
 *   type          "clinical" | "full"
 *   formData      Part 1 inputs  (== step1)
 *   engineResult  Part 1 result  (== preResult)
 *   step1         alias of formData
 *   preResult     alias of engineResult
 *   step2         Part 2 inputs  { psa, pirads, onHormonalTherapy, … }
 *   postResult    Part 2 result
 *   status        "STEP1_COMPLETE" | "STEP2_COMPLETE"
 *   finalCategory string
 */
export function normaliseSession(raw) {
  // Support both canonical (formData/engineResult) and full-ePSA (step1/preResult) shapes
  const formData     = raw.formData    ?? raw.step1      ?? null;
  const engineResult = raw.engineResult ?? raw.preResult  ?? null;
  const step2        = raw.step2       ?? null;
  const postResult   = raw.postResult  ?? null;
  const status       = raw.status      ?? (step2 ? 'STEP2_COMPLETE' : 'STEP1_COMPLETE');
  const type         = (step2 || postResult) ? 'full' : (raw.type ?? 'clinical');

  return {
    version: 'epsa-session-v1',
    type,
    formData,
    engineResult,
    step1: formData,
    preResult: engineResult,
    step2,
    postResult,
    status,
    finalCategory: raw.finalCategory ?? null,
  };
}

/** Short human-readable reference: EP-YYYYMMDD-XXXX (shown on result + sent to REDCap). */
export function generateSessionRef(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EP-${ymd}-${suffix}`;
}

export async function saveClinicalSession(uid, sessionData) {
  const id = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sessionRef = sessionData.sessionRef ?? generateSessionRef();
  const record = { id, sessionRef, ...normaliseSession(sessionData) };

  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = doc(db, 'clinicalSessions', uid, 'records', id);
      await setDoc(ref, { ...record, createdAt: serverTimestamp() });
      return id;
    } catch (e) {
      console.warn('Firestore save failed, falling back to localStorage:', e);
    }
  }

  const sessions = getLocal();
  sessions.unshift({ ...record, createdAt: new Date().toISOString() });
  setLocal(sessions);
  return id;
}

function toIso(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return ts;
}

/** Fetch sessions saved in the clinical sessions collection. */
async function fetchClinicalSessions(uid) {
  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = collection(db, 'clinicalSessions', uid, 'records');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        ...normaliseSession(d.data()),
        id: d.id,
        createdAt: toIso(d.data().createdAt),
        _source: 'clinical',
      }));
    } catch (e) {
      console.warn('Firestore clinicalSessions read failed:', e);
    }
  }
  return getLocal().map(s => ({ ...normaliseSession(s), id: s.id, createdAt: s.createdAt, _source: 'local' }));
}

/** Fetch full ePSA sessions from the main sessions collection (user's own). */
async function fetchFullEpsaSessions(uid) {
  if (!isFirebaseConfigured() || !uid || uid.startsWith('dev_') || !db) return [];
  try {
    const ref = collection(db, 'sessions');
    const q = query(ref, where('userId', '==', uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
      .filter(d => d.data().step1)
      .map(d => ({
        ...normaliseSession(d.data()),
        id: d.id,
        createdAt: toIso(d.data().createdAt),
        _source: 'full',
      }));
  } catch {
    return [];
  }
}

/** Returns all sessions (clinical + full ePSA) merged and sorted by date. */
export async function getClinicalSessions(uid) {
  const [clinical, full] = await Promise.all([
    fetchClinicalSessions(uid),
    fetchFullEpsaSessions(uid),
  ]);

  // Merge and sort newest-first; deduplicate by id
  const seen = new Set();
  return [...clinical, ...full]
    .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function deleteClinicalSession(uid, sessionId) {
  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      await deleteDoc(doc(db, 'clinicalSessions', uid, 'records', sessionId));
      return;
    } catch (e) {
      console.warn('Firestore delete failed, using localStorage:', e);
    }
  }
  setLocal(getLocal().filter(s => s.id !== sessionId));
}

/** Download sessions as a unified JSON file. */
export function exportSessionsAsJson(sessions, filename) {
  const payload = sessions.map(s => normaliseSession(s));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `epsa_sessions_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import from a JSON file — accepts single object or array, any supported shape. */
export async function importSessionsFromFile(uid, file) {
  const text = await file.text();
  const raw = JSON.parse(text);
  const items = Array.isArray(raw) ? raw : [raw];
  if (!items.length) throw new Error('File is empty');
  for (const item of items) {
    // eslint-disable-next-line no-unused-vars
    const { id: _id, createdAt: _ts, _source, ...rest } = item;
    await saveClinicalSession(uid, rest);
  }
  return items.length;
}
