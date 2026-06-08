import {
  collection, doc, setDoc, getDocs, deleteDoc,
  serverTimestamp, orderBy, query
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
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      return auth.currentUser?.uid || getDeviceId();
    } catch {
      return getDeviceId();
    }
  }
  return getDeviceId();
}

export async function saveClinicalSession(uid, sessionData) {
  const id = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record = { id, ...sessionData };

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

export async function getClinicalSessions(uid) {
  if (isFirebaseConfigured() && uid && !uid.startsWith('dev_') && db) {
    try {
      const ref = collection(db, 'clinicalSessions', uid, 'records');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? d.data().createdAt,
      }));
    } catch (e) {
      console.warn('Firestore read failed, using localStorage:', e);
    }
  }
  return getLocal();
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

export function exportSessionsAsJson(sessions) {
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `epsa_sessions_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importSessionsFromFile(uid, file) {
  const text = await file.text();
  const sessions = JSON.parse(text);
  if (!Array.isArray(sessions)) throw new Error('Invalid file: expected a JSON array');
  for (const s of sessions) {
    // eslint-disable-next-line no-unused-vars
    const { id: _id, createdAt: _ts, ...rest } = s;
    await saveClinicalSession(uid, rest);
  }
  return sessions.length;
}
