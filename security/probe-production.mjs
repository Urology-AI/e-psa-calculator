#!/usr/bin/env node
/**
 * Layer 3: probe the DEPLOYED Firebase project, not the code.
 *
 * The rules tests in this directory prove that firestore.rules and
 * storage.rules are correct. They cannot prove those files are what is
 * currently live — a console edit, a failed deploy, or a rollback all leave the
 * repo green while production is wrong. This script checks production itself.
 *
 * It authenticates the way a real attacker would: anonymous sign-in, which is
 * enabled on this project, so it needs no credentials beyond the public
 * Firebase Web API key.
 *
 * Env:
 *   FIREBASE_API_KEY   (required) public Web API key
 *   FIREBASE_PROJECT_ID          default: epsa-30d0b
 *   FIREBASE_STORAGE_BUCKET      default: <project>.firebasestorage.app
 *   APP_ORIGIN                   default: https://epsa-30d0b.web.app
 *
 * Exit: 0 all checks pass, 1 one or more FAILED, 2 could not run.
 */

const API_KEY = process.env.FIREBASE_API_KEY;
const PROJECT = process.env.FIREBASE_PROJECT_ID || 'epsa-30d0b';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT}.firebasestorage.app`;
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://epsa-30d0b.web.app';

// Host overrides exist so this script can be exercised against the emulators
// before it is ever pointed at production. A probe that has never been run is
// not evidence of anything. Leave unset for a real production run.
const AUTH_HOST = process.env.PROBE_AUTH_HOST || 'https://identitytoolkit.googleapis.com';
const FIRESTORE_HOST = process.env.PROBE_FIRESTORE_HOST || 'https://firestore.googleapis.com';
const STORAGE_HOST = process.env.PROBE_STORAGE_HOST || 'https://firebasestorage.googleapis.com';

const FIRESTORE = `${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const STORAGE = `${STORAGE_HOST}/v0/b/${BUCKET}/o`;

if (!API_KEY) {
  console.error('FATAL: FIREBASE_API_KEY is required (it is public — the Web API key).');
  process.exit(2);
}

let failed = 0;
let passed = 0;
let skipped = 0;

const pass = (msg) => { passed++; console.log(`  PASS  ${msg}`); };
const fail = (msg, detail) => {
  failed++;
  console.log(`  FAIL  ${msg}`);
  if (detail) console.log(`        ${detail}`);
};
const skip = (msg, why) => { skipped++; console.log(`  SKIP  ${msg} (${why})`); };

/** Anonymous sign-in — the cheapest identity an attacker can obtain here. */
async function signInAnonymously() {
  const res = await fetch(
    `${AUTH_HOST}/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`anonymous sign-in failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const { idToken, localId } = await res.json();
  return { idToken, uid: localId };
}

async function get(url, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(url, { headers });
}

// ---------------------------------------------------------------------------

async function checkFirestoreDenied(token, uid) {
  console.log('\nFirestore — collections that must be unreachable by a visitor');

  // Paths holding PHI, clinical data, or auth material. A 200 on any of these
  // is a live data exposure.
  const forbidden = [
    ['users (someone else\'s)', 'users/not-my-uid'],
    ['users (list)', 'users'],
    ['sessions (list)', 'sessions'],
    ['securePhoneData', 'securePhoneData/not-my-uid'],
    ['sinaiSessions (list)', 'sinaiSessions'],
    ['clinicCodes (list)', 'clinicCodes'],
    ['auditLogs (list)', 'auditLogs'],
    ['adminAccessLog (list)', 'adminAccessLog'],
    ['clinicCodeAuditLog (list)', 'clinicCodeAuditLog'],
    ['admin_otps (list)', 'admin_otps'],
    ['admins (list)', 'admins'],
  ];

  for (const [label, path] of forbidden) {
    const res = await get(`${FIRESTORE}/${path}`, token);
    if (res.status === 200) {
      const body = await res.text();
      // An empty collection also returns 200 with no documents. That still
      // means the read was PERMITTED, which is the thing being tested.
      fail(`${label} is readable by an anonymous visitor`, `HTTP 200, ${body.slice(0, 120)}`);
    } else if (res.status === 403 || res.status === 401) {
      pass(`${label} denied (${res.status})`);
    } else if (res.status === 404) {
      pass(`${label} not found (404) — not exposed`);
    } else {
      fail(`${label} unexpected status ${res.status}`);
    }
  }

  // Own doc should be reachable — proves the probe's token really works and
  // that a 403 elsewhere is the rules talking, not a broken token.
  const own = await get(`${FIRESTORE}/users/${uid}`, token);
  if (own.status === 200 || own.status === 404) {
    pass(`own users/${uid.slice(0, 8)}… reachable (${own.status}) — token is valid`);
  } else {
    fail(
      'own user doc unreachable — the denials above may be false comfort',
      `HTTP ${own.status}`,
    );
  }
}

async function checkFirestorePublic() {
  console.log('\nFirestore — documents that are public by design');

  for (const docId of ['featureFlags', 'sinai']) {
    const res = await get(`${FIRESTORE}/appConfig/${docId}`);
    if (res.status === 200) {
      const body = await res.text();
      pass(`appConfig/${docId} publicly readable`);

      // A flag doc must never carry a credential. This is the check that
      // catches someone stashing a token in a "config" document.
      const suspicious = /"stringValue"\s*:\s*"(eyJ[A-Za-z0-9_-]{10,}\.|[0-9A-F]{32}|-----BEGIN)/.test(body);
      if (suspicious) {
        fail(`appConfig/${docId} contains something shaped like a credential`);
      } else {
        pass(`appConfig/${docId} carries no token-shaped values`);
      }
    } else if (res.status === 404) {
      skip(`appConfig/${docId}`, 'document does not exist');
    } else {
      fail(`appConfig/${docId} not publicly readable (${res.status}) — the app expects it to be`);
    }
  }
}

async function checkStorage(token) {
  console.log('\nStorage — bucket must be closed except the demo videos');

  const demo = await get(`${STORAGE}/media1.mp4?alt=media`);
  if (demo.status === 200) pass('media1.mp4 publicly readable');
  else if (demo.status === 404) skip('media1.mp4', 'object not present');
  else fail(`media1.mp4 not publicly readable (${demo.status})`);

  // The regression that motivated locking storage.rules down: with the old
  // `if request.auth != null` catch-all, an anonymous token read the bucket.
  const listed = await get(`${STORAGE}?maxResults=1`, token);
  if (listed.status === 200) {
    fail('an anonymous visitor can LIST the storage bucket', await listed.text().then((t) => t.slice(0, 160)));
  } else {
    pass(`bucket listing denied (${listed.status})`);
  }

  const arbitrary = await get(`${STORAGE}/uploads%2Fprobe-should-not-exist.txt?alt=media`, token);
  if (arbitrary.status === 200) {
    fail('an anonymous visitor can read arbitrary bucket objects');
  } else if (arbitrary.status === 403) {
    pass('arbitrary object read denied (403)');
  } else {
    pass(`arbitrary object read not permitted (${arbitrary.status})`);
  }

  // Attempt a real write. Uses a clearly-labelled path; on a correctly
  // configured bucket this is refused before anything is stored.
  const wrote = await fetch(`${STORAGE}?uploadType=media&name=security-probe-delete-me.txt`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' },
    body: 'security probe — this file should never have been created',
  });
  if (wrote.ok) {
    fail(
      'an anonymous visitor can WRITE to the storage bucket',
      'delete security-probe-delete-me.txt and redeploy storage.rules immediately',
    );
  } else {
    pass(`bucket write denied (${wrote.status})`);
  }
}

async function checkHeaders(origin) {
  console.log(`\nTransport — ${origin}`);
  let res;
  try {
    res = await fetch(origin, { redirect: 'follow' });
  } catch (e) {
    fail(`could not reach ${origin}`, String(e.message));
    return;
  }

  if (!res.url.startsWith('https://')) fail(`${origin} did not end on HTTPS`);
  else pass('served over HTTPS');

  const h = res.headers;
  const wanted = [
    ['strict-transport-security', 'HSTS'],
    ['x-content-type-options', 'MIME-sniffing protection'],
    ['x-frame-options|content-security-policy', 'clickjacking protection'],
  ];

  for (const [name, label] of wanted) {
    const present = name.split('|').some((n) => h.get(n));
    if (present) pass(`${label} header present`);
    else fail(`${label} header missing (${name.replace('|', ' or ')})`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`ePSA production security probe`);
  console.log(`project: ${PROJECT}   bucket: ${BUCKET}`);
  console.log(`time:    ${new Date().toISOString()}`);

  let session;
  try {
    session = await signInAnonymously();
    console.log(`\nAcquired an anonymous identity (${session.uid.slice(0, 8)}…) with only the public API key.`);
  } catch (e) {
    console.error(`\nFATAL: ${e.message}`);
    console.error('If anonymous auth has been disabled, that is a hardening improvement —');
    console.error('update this probe rather than re-enabling it.');
    process.exit(2);
  }

  await checkFirestoreDenied(session.idToken, session.uid);
  await checkFirestorePublic();
  await checkStorage(session.idToken);
  await checkHeaders(APP_ORIGIN);

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) {
    console.log('\nPRODUCTION DOES NOT MATCH THE RULES IN THIS REPO.');
    console.log('Redeploy rules:  firebase deploy --only firestore:rules,storage');
    process.exit(1);
  }
  console.log('Production matches the committed security rules.');
}

main().catch((e) => {
  console.error('probe crashed:', e);
  process.exit(2);
});
