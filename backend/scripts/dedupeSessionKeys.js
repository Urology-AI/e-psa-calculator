#!/usr/bin/env node
/**
 * One-off cleanup: release anonymous session keys left behind on migrated users.
 *
 * Background: loginAnonymousBySessionId used to copy a session key onto the
 * restoring user's doc without removing it from the doc it came from. After a
 * key had been restored once, two (or more) users/ docs held the same key, and
 * the `.where('sessionId', '==', key).limit(1)` lookup could pick the stale one
 * — whose sessions had already been moved away — so the next restore landed on
 * an empty screen. The function now hands the key over; this script fixes the
 * duplicates created before that change.
 *
 * What it does, per key held by more than one user doc:
 *   - follows the migratedToUid chain to the doc the key was last handed to
 *     (the "owner"), and checks the owner actually owns that key's sessions;
 *   - on every other doc in the group, removes `sessionId` and
 *     `currentSessionId` and records `sessionKeyReleasedTo` / `...At`.
 *
 * What it never does: delete a document, touch sessions/, or change the owner
 * doc. Groups it can't resolve unambiguously are reported and left alone.
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   cd backend && npm install
 *   node scripts/dedupeSessionKeys.js              # dry run: report only
 *   node scripts/dedupeSessionKeys.js --apply      # write the changes
 *
 * Credentials: scripts/serviceAccount.json at the repo root if present (same
 * as scripts/upload-demo-videos.js), otherwise Application Default Credentials
 * (`gcloud auth application-default login`). Set FIRESTORE_EMULATOR_HOST to
 * run against the emulator instead.
 *
 * --apply writes a backup of every changed field to
 * dedupeSessionKeys-backup-<timestamp>.json in the current directory. It holds
 * session keys (not PHI, but they unlock a session) — keep it private and
 * delete it once you're satisfied.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'epsa-30d0b';
const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 500;
const BATCH_LIMIT = 400;

function initAdmin() {
  const keyPath = path.join(__dirname, '..', '..', 'scripts', 'serviceAccount.json');
  if (!process.env.FIRESTORE_EMULATOR_HOST && fs.existsSync(keyPath)) {
    admin.initializeApp({ credential: admin.credential.cert(require(keyPath)), projectId: PROJECT_ID });
  } else {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  return admin.firestore();
}

async function loadUsersWithKeys(db) {
  // orderBy on a field only returns docs that have it — exactly the key holders.
  const docs = [];
  let last = null;
  for (;;) {
    let q = db.collection('users').orderBy('sessionId').limit(PAGE_SIZE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    docs.push(...snap.docs);
    if (snap.size < PAGE_SIZE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return docs;
}

/** Returns { owner, stale } or { skip: reason }. */
async function resolveGroup(db, key, group) {
  const byId = new Map(group.map(d => [d.id, d]));

  const terminals = new Set();
  for (const d of group) {
    let cur = d;
    const seen = new Set();
    while (true) {
      if (seen.has(cur.id)) return { skip: 'migratedToUid cycle' };
      seen.add(cur.id);
      const next = cur.get('migratedToUid');
      if (!next || !byId.has(next)) break;
      cur = byId.get(next);
    }
    terminals.add(cur.id);
  }
  if (terminals.size !== 1) {
    return { skip: `ambiguous owner (${terminals.size} candidates)` };
  }
  const owner = byId.get([...terminals][0]);
  if (owner.get('isAnonymous') !== true) return { skip: 'owner is not anonymous' };

  // Safety check: sessions must sit with the owner, never with a doc we'd strip.
  const sessionCounts = await Promise.all(group.map(async d => {
    const snap = await db.collection('sessions').where('userId', '==', d.id).limit(1).get();
    return [d.id, snap.size];
  }));
  const staleWithSessions = sessionCounts.filter(([id, n]) => id !== owner.id && n > 0);
  if (staleWithSessions.length > 0) {
    return { skip: `non-owner doc still owns sessions (${staleWithSessions.map(([id]) => id).join(', ')})` };
  }

  return { owner, stale: group.filter(d => d.id !== owner.id) };
}

async function main() {
  const db = initAdmin();
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : `project ${PROJECT_ID}`;
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} against ${target}`);

  const users = await loadUsersWithKeys(db);
  const groups = new Map();
  for (const d of users) {
    const key = d.get('sessionId');
    if (typeof key !== 'string' || !key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  const dupes = [...groups.entries()].filter(([, g]) => g.length > 1);
  console.log(`${users.length} user docs hold a key; ${dupes.length} keys are held by more than one doc.`);

  const plan = [];
  const skipped = [];
  for (const [key, group] of dupes) {
    const res = await resolveGroup(db, key, group);
    if (res.skip) {
      skipped.push({ key: key.slice(0, 2) + '******', docs: group.map(d => d.id), reason: res.skip });
      continue;
    }
    for (const d of res.stale) {
      plan.push({ ref: d.ref, id: d.id, owner: res.owner.id, before: { sessionId: d.get('sessionId'), currentSessionId: d.get('currentSessionId') ?? null } });
    }
  }

  console.log(`Will release the key from ${plan.length} stale docs.`);
  for (const p of plan) console.log(`  users/${p.id}  → key stays with users/${p.owner}`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} keys (left untouched, review by hand):`);
    for (const s of skipped) console.log(`  ${s.key}  [${s.docs.join(', ')}]  ${s.reason}`);
  }

  if (!APPLY) {
    console.log('Dry run — nothing written. Re-run with --apply to make these changes.');
    return;
  }
  if (plan.length === 0) return;

  const backupPath = path.resolve(`dedupeSessionKeys-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(plan.map(({ id, owner, before }) => ({ id, owner, before })), null, 2), { mode: 0o600 });
  console.log(`Backup written to ${backupPath}`);

  const now = admin.firestore.Timestamp.now();
  for (let i = 0; i < plan.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const p of plan.slice(i, i + BATCH_LIMIT)) {
      batch.update(p.ref, {
        sessionId: admin.firestore.FieldValue.delete(),
        currentSessionId: admin.firestore.FieldValue.delete(),
        sessionKeyReleasedTo: p.owner,
        sessionKeyReleasedAt: now,
      });
    }
    await batch.commit();
    console.log(`  committed ${Math.min(i + BATCH_LIMIT, plan.length)}/${plan.length}`);
  }
  console.log('Done.');
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
