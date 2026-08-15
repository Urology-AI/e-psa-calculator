import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore';
import {
  createTestEnv,
  seed,
  UIDS,
  anonCtx,
  adminCtx,
  inactiveAdminCtx,
  superAdminCtx,
  publicCtx,
} from './helpers.js';

let env;

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(env);
});

// ---------------------------------------------------------------------------
// PHI and clinical data must never be reachable by an anonymous visitor.
// Anonymous auth is enabled, so "signed in" is not a meaningful barrier.
// ---------------------------------------------------------------------------

describe('users (consent + session pointer)', () => {
  test('a visitor can read and write their OWN doc', async () => {
    // Regression guard: App.jsx depends on this. If it breaks, consent
    // capture and session resumption break in production.
    const db = anonCtx(env).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', UIDS.anon), { consentToContact: true }, { merge: true }),
    );
    await assertSucceeds(getDoc(doc(db, 'users', UIDS.anon)));
  });

  test('a visitor cannot read another visitor’s doc', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(getDoc(doc(db, 'users', UIDS.otherAnon)));
  });

  test('a visitor cannot write another visitor’s doc', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(setDoc(doc(db, 'users', UIDS.otherAnon), { consentToContact: true }));
  });

  test('a visitor cannot enumerate the collection', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(getDocs(collection(db, 'users')));
  });

  test('nobody can delete a user doc — not even a super-admin', async () => {
    await assertFails(deleteDoc(doc(superAdminCtx(env).firestore(), 'users', UIDS.anon)));
  });

  test('an admin can enumerate the collection', async () => {
    await assertSucceeds(getDocs(collection(adminCtx(env).firestore(), 'users')));
  });
});

describe('securePhoneData', () => {
  test('a visitor cannot read or write it', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(getDoc(doc(db, 'securePhoneData', UIDS.anon)));
    await assertFails(setDoc(doc(db, 'securePhoneData', UIDS.anon), { phone: '555' }));
  });

  test('deletes are refused even for an admin', async () => {
    // `allow read, write` would grant delete; the rule spells out
    // create/update instead so this stays denied.
    await seed(env, (db) => db.doc('securePhoneData/subject').set({ phone: '555' }));
    await assertFails(deleteDoc(doc(adminCtx(env).firestore(), 'securePhoneData', 'subject')));
    await assertFails(deleteDoc(doc(superAdminCtx(env).firestore(), 'securePhoneData', 'subject')));
  });
});

describe('sinaiSessions (IRB STUDY-14-00050 clinical data)', () => {
  beforeEach(async () => {
    await seed(env, (db) => db.doc('sinaiSessions/s1').set({ clinicCode: 'ABC12345' }));
  });

  test('a visitor cannot read one', async () => {
    await assertFails(getDoc(doc(anonCtx(env).firestore(), 'sinaiSessions', 's1')));
  });

  test('a visitor cannot enumerate them', async () => {
    await assertFails(getDocs(collection(anonCtx(env).firestore(), 'sinaiSessions')));
  });

  test('no client can write one — Cloud Functions only', async () => {
    await assertFails(setDoc(doc(superAdminCtx(env).firestore(), 'sinaiSessions', 's2'), { x: 1 }));
    await assertFails(deleteDoc(doc(superAdminCtx(env).firestore(), 'sinaiSessions', 's1')));
  });

  test('an admin can read them', async () => {
    await assertSucceeds(getDoc(doc(adminCtx(env).firestore(), 'sinaiSessions', 's1')));
  });
});

describe('admin_otps', () => {
  test('are unreachable by every client tier, including super-admins', async () => {
    await seed(env, (db) => db.doc('admin_otps/a@mountsinai.org').set({ code: '123456' }));
    for (const ctx of [publicCtx(env), anonCtx(env), adminCtx(env), superAdminCtx(env)]) {
      await assertFails(getDoc(doc(ctx.firestore(), 'admin_otps', 'a@mountsinai.org')));
      await assertFails(setDoc(doc(ctx.firestore(), 'admin_otps', 'a@mountsinai.org'), { code: '0' }));
    }
  });
});

// ---------------------------------------------------------------------------
// Audit trails must be append-only from the server's perspective: readable by
// admins, never mutable by any client. An attacker who can edit these can
// cover their tracks.
// ---------------------------------------------------------------------------

describe('audit logs', () => {
  for (const path of ['auditLogs', 'clinicCodeAuditLog', 'adminAccessLog']) {
    test(`${path} cannot be created, modified, or deleted by any client`, async () => {
      await seed(env, (db) => db.doc(`${path}/e1`).set({ event: 'read' }));
      for (const ctx of [anonCtx(env), adminCtx(env), superAdminCtx(env)]) {
        const db = ctx.firestore();
        await assertFails(setDoc(doc(db, path, 'e2'), { event: 'forged' }));
        await assertFails(updateDoc(doc(db, path, 'e1'), { event: 'tampered' }));
        await assertFails(deleteDoc(doc(db, path, 'e1')));
      }
    });

    test(`${path} is not readable by a visitor`, async () => {
      await seed(env, (db) => db.doc(`${path}/e1`).set({ event: 'read' }));
      await assertFails(getDoc(doc(anonCtx(env).firestore(), path, 'e1')));
    });
  }
});

// ---------------------------------------------------------------------------
// Privilege boundaries.
// ---------------------------------------------------------------------------

describe('admin privilege tiers', () => {
  test('an admin with isActive:false gets no admin powers', async () => {
    await seed(env, (db) => db.doc('sinaiSessions/s1').set({ clinicCode: 'ABC' }));
    await assertFails(getDoc(doc(inactiveAdminCtx(env).firestore(), 'sinaiSessions', 's1')));
  });

  test('a visitor cannot promote themselves by writing /admins', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(setDoc(doc(db, 'admins', UIDS.anon), { isActive: true }));
  });

  test('a plain admin cannot grant admin to anyone', async () => {
    await assertFails(
      setDoc(doc(adminCtx(env).firestore(), 'admins', 'new-uid'), { isActive: true }),
    );
  });

  test('a super-admin can grant admin', async () => {
    await assertSucceeds(
      setDoc(doc(superAdminCtx(env).firestore(), 'admins', 'new-uid'), { isActive: true }),
    );
  });
});

describe('clinicCodes', () => {
  beforeEach(async () => {
    await seed(env, (db) => db.doc('clinicCodes/ABC12345').set({ used: false }));
  });

  test('a visitor cannot read a code (no brute-force enumeration)', async () => {
    await assertFails(getDoc(doc(anonCtx(env).firestore(), 'clinicCodes', 'ABC12345')));
    await assertFails(getDocs(collection(anonCtx(env).firestore(), 'clinicCodes')));
  });

  test('a plain admin can read but cannot mint codes', async () => {
    await assertSucceeds(getDoc(doc(adminCtx(env).firestore(), 'clinicCodes', 'ABC12345')));
    await assertFails(setDoc(doc(adminCtx(env).firestore(), 'clinicCodes', 'NEW00001'), { used: false }));
  });

  test('a super-admin can mint codes', async () => {
    await assertSucceeds(
      setDoc(doc(superAdminCtx(env).firestore(), 'clinicCodes', 'NEW00001'), { used: false }),
    );
  });
});

// ---------------------------------------------------------------------------
// appConfig — the merged block. These assertions are the reason the two
// duplicate match blocks were collapsed into one.
// ---------------------------------------------------------------------------

describe('appConfig', () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc('appConfig/featureFlags').set({ biomarkers: true });
      await db.doc('appConfig/sinai').set({ redcapEnabled: false });
    });
  });

  test('featureFlags and sinai are publicly readable without sign-in', async () => {
    const db = publicCtx(env).firestore();
    await assertSucceeds(getDoc(doc(db, 'appConfig', 'featureFlags')));
    await assertSucceeds(getDoc(doc(db, 'appConfig', 'sinai')));
  });

  test('no other appConfig doc is publicly readable', async () => {
    await seed(env, (db) => db.doc('appConfig/internal').set({ secretish: true }));
    await assertFails(getDoc(doc(publicCtx(env).firestore(), 'appConfig', 'internal')));
  });

  test('a visitor cannot flip a feature flag', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(updateDoc(doc(db, 'appConfig', 'featureFlags'), { biomarkers: false }));
    await assertFails(updateDoc(doc(db, 'appConfig', 'sinai'), { redcapEnabled: true }));
  });

  test('an admin can write featureFlags but NOT sinai', async () => {
    // This is the case the duplicate match blocks silently allowed: the
    // looser condition won, so any admin could toggle the REDCap submit path
    // for the whole Sinai cohort.
    const db = adminCtx(env).firestore();
    await assertSucceeds(updateDoc(doc(db, 'appConfig', 'featureFlags'), { biomarkers: false }));
    await assertFails(updateDoc(doc(db, 'appConfig', 'sinai'), { redcapEnabled: true }));
  });

  test('a super-admin can write both', async () => {
    const db = superAdminCtx(env).firestore();
    await assertSucceeds(updateDoc(doc(db, 'appConfig', 'featureFlags'), { biomarkers: false }));
    await assertSucceeds(updateDoc(doc(db, 'appConfig', 'sinai'), { redcapEnabled: true }));
  });
});

// ---------------------------------------------------------------------------
// Per-device clinical sessions and the collectionGroup escape hatch.
// ---------------------------------------------------------------------------

describe('clinicalSessions', () => {
  beforeEach(async () => {
    await seed(env, async (db) => {
      await db.doc(`clinicalSessions/${UIDS.anon}/records/r1`).set({ score: 3 });
      await db.doc(`clinicalSessions/${UIDS.otherAnon}/records/r2`).set({ score: 7 });
    });
  });

  test('a device can read its own records', async () => {
    const db = anonCtx(env).firestore();
    await assertSucceeds(getDoc(doc(db, 'clinicalSessions', UIDS.anon, 'records', 'r1')));
  });

  test('a device cannot read another device’s records', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(getDoc(doc(db, 'clinicalSessions', UIDS.otherAnon, 'records', 'r2')));
  });

  test('the collectionGroup /records rule does not leak to visitors', async () => {
    // A wildcard `{path=**}/records/{recordId}` rule exists for the admin
    // dashboard's cross-device query. Verify it is admin-gated and cannot be
    // ridden by a visitor to vacuum up every device's records.
    const { collectionGroup, query } = await import('firebase/firestore');
    await assertFails(
      getDocs(query(collectionGroup(anonCtx(env).firestore(), 'records'))),
    );
    await assertSucceeds(
      getDocs(query(collectionGroup(adminCtx(env).firestore(), 'records'))),
    );
  });
});

describe('sessions', () => {
  beforeEach(async () => {
    await seed(env, (db) => db.doc('sessions/s1').set({ userId: UIDS.otherAnon, step1: {} }));
  });

  test('a visitor cannot read someone else’s session', async () => {
    await assertFails(getDoc(doc(anonCtx(env).firestore(), 'sessions', 's1')));
  });

  test('a visitor cannot create a session owned by someone else', async () => {
    await assertFails(
      setDoc(doc(anonCtx(env).firestore(), 'sessions', 's2'), { userId: UIDS.otherAnon }),
    );
  });

  test('a visitor can create a session they own', async () => {
    await assertSucceeds(
      setDoc(doc(anonCtx(env).firestore(), 'sessions', 's3'), { userId: UIDS.anon }),
    );
  });
});

// ---------------------------------------------------------------------------
// Default deny. Guards against a new collection shipping before its rule does.
// ---------------------------------------------------------------------------

describe('default deny', () => {
  test('an undeclared collection is closed to everyone', async () => {
    for (const ctx of [publicCtx(env), anonCtx(env), adminCtx(env), superAdminCtx(env)]) {
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, 'someCollectionAddedLater', 'x')));
      await assertFails(setDoc(doc(db, 'someCollectionAddedLater', 'x'), { a: 1 }));
    }
  });
});
