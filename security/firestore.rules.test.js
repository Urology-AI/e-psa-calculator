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
  verifiedSinaiCtx,
  publicCtx,
} from './helpers.js';

let env;

const FORMER_ADMIN_TIERS = () => [adminCtx(env), inactiveAdminCtx(env), superAdminCtx(env), verifiedSinaiCtx(env)];

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

  test('no client can enumerate the collection, not even a former admin tier', async () => {
    for (const ctx of FORMER_ADMIN_TIERS()) {
      await assertFails(getDocs(collection(ctx.firestore(), 'users')));
      await assertFails(getDoc(doc(ctx.firestore(), 'users', UIDS.anon)));
    }
  });
});

describe('securePhoneData', () => {
  test('a visitor cannot read or write it', async () => {
    const db = anonCtx(env).firestore();
    await assertFails(getDoc(doc(db, 'securePhoneData', UIDS.anon)));
    await assertFails(setDoc(doc(db, 'securePhoneData', UIDS.anon), { phone: '555' }));
  });

  test('no former admin tier can read, write or delete it', async () => {
    await seed(env, (db) => db.doc('securePhoneData/subject').set({ phone: '555' }));
    for (const ctx of FORMER_ADMIN_TIERS()) {
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, 'securePhoneData', 'subject')));
      await assertFails(setDoc(doc(db, 'securePhoneData', 'subject'), { phone: '1' }));
      await assertFails(deleteDoc(doc(db, 'securePhoneData', 'subject')));
    }
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

  test('no former admin tier can read them — the Entra dashboard is the only path', async () => {
    for (const ctx of FORMER_ADMIN_TIERS()) {
      await assertFails(getDoc(doc(ctx.firestore(), 'sinaiSessions', 's1')));
      await assertFails(getDocs(collection(ctx.firestore(), 'sinaiSessions')));
    }
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
// Audit trails are server-only: never readable or mutable by any client. An attacker who can edit these can
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

    test(`${path} is not readable by any client`, async () => {
      await seed(env, (db) => db.doc(`${path}/e1`).set({ event: 'read' }));
      for (const ctx of [anonCtx(env), ...FORMER_ADMIN_TIERS()]) {
        await assertFails(getDoc(doc(ctx.firestore(), path, 'e1')));
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Privilege boundaries.
// ---------------------------------------------------------------------------

describe('former admin tiers', () => {
  // There is no client-side admin anymore. A listed /admins uid, an inactive
  // one, a Sinai-domain email (verified or not) — all are plain visitors.
  test('nobody can write /admins', async () => {
    for (const ctx of [anonCtx(env), ...FORMER_ADMIN_TIERS()]) {
      await assertFails(setDoc(doc(ctx.firestore(), 'admins', 'new-uid'), { isActive: true }));
    }
  });

  test('clinic codes are unreadable and unmintable by every client', async () => {
    await seed(env, (db) => db.doc('clinicCodes/ABC12345').set({ used: false }));
    for (const ctx of [anonCtx(env), ...FORMER_ADMIN_TIERS()]) {
      await assertFails(getDoc(doc(ctx.firestore(), 'clinicCodes', 'ABC12345')));
      await assertFails(getDocs(collection(ctx.firestore(), 'clinicCodes')));
      await assertFails(setDoc(doc(ctx.firestore(), 'clinicCodes', 'NEW00001'), { used: false }));
    }
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
      await db.doc('appConfig/voiceServers').set({ servers: [] });
    });
  });

  test('featureFlags, sinai and voiceServers are publicly readable without sign-in', async () => {
    const db = publicCtx(env).firestore();
    await assertSucceeds(getDoc(doc(db, 'appConfig', 'featureFlags')));
    await assertSucceeds(getDoc(doc(db, 'appConfig', 'sinai')));
    await assertSucceeds(getDoc(doc(db, 'appConfig', 'voiceServers')));
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

  test('no client can write any appConfig doc — the dashboard service account only', async () => {
    for (const ctx of FORMER_ADMIN_TIERS()) {
      const db = ctx.firestore();
      await assertFails(updateDoc(doc(db, 'appConfig', 'featureFlags'), { biomarkers: false }));
      await assertFails(updateDoc(doc(db, 'appConfig', 'sinai'), { redcapEnabled: true }));
      await assertFails(setDoc(doc(db, 'appConfig', 'voiceServers'), { servers: [] }));
    }
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

  test('no client can collectionGroup-query every device’s records', async () => {
    const { collectionGroup, query } = await import('firebase/firestore');
    for (const ctx of [anonCtx(env), ...FORMER_ADMIN_TIERS()]) {
      await assertFails(getDocs(query(collectionGroup(ctx.firestore(), 'records'))));
    }
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
