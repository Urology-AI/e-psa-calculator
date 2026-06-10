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
    rawAnswers: raw.rawAnswers ?? null,
    // Patient consent to cloud storage: true | false | null (legacy, pre-consent).
    consented: raw.consented ?? null,
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

  // Always persist locally so sessions survive offline / Firebase outages.
  // A case with the same sessionRef replaces the old copy instead of
  // duplicating (e.g. re-importing a previously exported session).
  const sessions = getLocal().filter(s => s.sessionRef !== sessionRef);
  sessions.unshift({ ...record, createdAt: new Date().toISOString() });
  setLocal(sessions);

  // Also sync to Firestore when available
  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = doc(db, 'clinicalSessions', uid, 'records', id);
      await setDoc(ref, { ...record, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore save failed; session retained in localStorage:', e);
    }
  }

  return id;
}

/** Update the consent flag on a saved session (e.g. the patient signs the
 *  form later, or a staff member confirms consent). Updates the local copy
 *  and, when present, the Firestore copy. */
export async function setSessionConsent(uid, session, consented) {
  const keyOf = s => s.sessionRef ?? s.id;
  setLocal(getLocal().map(s => (keyOf(s) === keyOf(session) ? { ...s, consented } : s)));

  if (session._storage !== 'local' && isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = doc(db, 'clinicalSessions', uid, 'records', session.id);
      await setDoc(ref, { consented }, { merge: true });
    } catch (e) {
      console.warn('Firestore consent update failed; local copy updated:', e);
    }
  }
}

function toIso(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return ts;
}

/** Fetch sessions saved in the clinical sessions collection.
 *  Each session is tagged with `_storage`: 'local', 'cloud', or 'both'. */
async function fetchClinicalSessions(uid) {
  const local = getLocal().map(s => ({ ...normaliseSession(s), id: s.id, sessionRef: s.sessionRef ?? null, createdAt: s.createdAt, _source: 'local', _storage: 'local' }));

  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = collection(db, 'clinicalSessions', uid, 'records');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const localIds = new Set(local.map(s => s.id));
      const cloud = snap.docs.map(d => ({
        ...normaliseSession(d.data()),
        id: d.id,
        sessionRef: d.data().sessionRef ?? null,
        createdAt: toIso(d.data().createdAt),
        _source: 'clinical',
        _storage: localIds.has(d.id) ? 'both' : 'cloud',
      }));
      // Merge cloud + local; cloud wins on duplicate id
      const seen = new Set(cloud.map(s => s.id));
      return [...cloud, ...local.filter(s => !seen.has(s.id))];
    } catch (e) {
      console.warn('Firestore clinicalSessions read failed, using localStorage:', e);
    }
  }
  return local;
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
        _storage: 'cloud',
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

/** Delete a session from wherever it is stored (`_storage`: 'local' | 'cloud' | 'both'). */
export async function deleteClinicalSession(uid, session) {
  const { id, _source, _storage } = session;
  // Default to removing the local copy when storage is unknown, otherwise the
  // session resurrects from localStorage on the next refresh.
  if (_storage !== 'cloud') {
    setLocal(getLocal().filter(s => s.id !== id));
  }

  if (_storage !== 'local' && isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = _source === 'full'
        ? doc(db, 'sessions', id)
        : doc(db, 'clinicalSessions', uid, 'records', id);
      await deleteDoc(ref);
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
  }
}

/** Remove every saved session: localStorage plus this device's Firestore records. */
export async function clearAllClinicalSessions(uid) {
  try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }

  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const snap = await getDocs(collection(db, 'clinicalSessions', uid, 'records'));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (e) {
      console.warn('Firestore clear failed; localStorage cleared:', e);
    }
  }
}

/** Merge externally fetched sessions (e.g. a Turso pull) into localStorage.
 *  Cases are matched by sessionRef (falling back to id) so the same case is
 *  never duplicated; incoming records win. Returns the number of new sessions. */
export function mergeSessions(records) {
  const keyOf = s => s.sessionRef ?? s.id;
  const local = getLocal();
  const localKeys = new Set(local.map(keyOf));
  const incomingKeys = new Set(records.map(keyOf));
  const merged = [
    ...records,
    ...local.filter(s => !incomingKeys.has(keyOf(s))),
  ].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  setLocal(merged);
  return records.filter(s => !localKeys.has(keyOf(s))).length;
}

/** Download sessions as a unified JSON file. sessionRef is kept so a
 *  re-import is recognised as the same case rather than a duplicate. */
export function exportSessionsAsJson(sessions, filename) {
  const payload = sessions.map(s => ({
    ...normaliseSession(s),
    sessionRef: s.sessionRef ?? null,
    createdAt: s.createdAt ?? null,
  }));
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
