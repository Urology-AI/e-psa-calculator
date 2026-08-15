import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Ports must match the `emulators` block in firebase.json. */
const FIRESTORE_PORT = 8080;
const STORAGE_PORT = 9199;

export const PROJECT_ID = 'epsa-rules-test';

export function createTestEnv() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(repoRoot, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: FIRESTORE_PORT,
    },
    storage: {
      rules: readFileSync(join(repoRoot, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: STORAGE_PORT,
    },
  });
}

/**
 * The four caller shapes the rules distinguish.
 *
 * `anon` models a real visitor: anonymous auth is enabled in firebase.json, so
 * an unauthenticated attacker can always upgrade themselves to this tier for
 * free. Anything `anon` can reach is effectively public — that is the premise
 * behind most of the denial assertions in this suite.
 */
export const UIDS = {
  anon: 'anon-visitor-uid',
  otherAnon: 'other-anon-visitor-uid',
  admin: 'listed-admin-uid',
  inactiveAdmin: 'inactive-admin-uid',
  superAdmin: 'super-admin-uid',
};

export const SUPER_ADMIN_EMAIL = 'someone@mountsinai.org';

/** An anonymous visitor: signed in, but with no email claim. */
export const anonCtx = (env, uid = UIDS.anon) => env.authenticatedContext(uid);

/** Listed in /admins with isActive true, but not on a Sinai domain. */
export const adminCtx = (env) =>
  env.authenticatedContext(UIDS.admin, { email: 'contractor@example.com' });

/** Listed in /admins but isActive false — must be treated as a plain visitor. */
export const inactiveAdminCtx = (env) =>
  env.authenticatedContext(UIDS.inactiveAdmin, { email: 'former@example.com' });

/** Sinai-domain email — isSuperAdmin() passes on the email claim alone. */
export const superAdminCtx = (env) =>
  env.authenticatedContext(UIDS.superAdmin, { email: SUPER_ADMIN_EMAIL });

/** Not signed in at all. */
export const publicCtx = (env) => env.unauthenticatedContext();

/**
 * Seed the /admins docs that isAdmin() dereferences, plus any fixture data.
 * Runs with rules disabled, so it bypasses the very rules under test.
 */
export async function seed(env, extra) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`admins/${UIDS.admin}`).set({ isActive: true });
    await db.doc(`admins/${UIDS.inactiveAdmin}`).set({ isActive: false });
    if (extra) await extra(db);
  });
}
