import { beforeAll, afterAll, beforeEach, describe, test } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadString, deleteObject } from 'firebase/storage';
import { createTestEnv, anonCtx, adminCtx, superAdminCtx, publicCtx } from './helpers.js';

let env;

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  // Seed objects with rules disabled so read assertions test the rule, not
  // the absence of the file (a missing object fails for the wrong reason).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const s = ctx.storage();
    await uploadString(ref(s, 'media1.mp4'), 'fake-video-bytes');
    await uploadString(ref(s, 'uploads/patient-scan.pdf'), 'sensitive');
  });
});

describe('demo videos', () => {
  for (const name of ['media1.mp4', 'media2.mp4', 'media3.mp4']) {
    test(`${name} is publicly readable`, async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await uploadString(ref(ctx.storage(), name), 'fake-video-bytes');
      });
      await assertSucceeds(getBytes(ref(publicCtx(env).storage(), name)));
    });
  }

  test('the demo videos are not writable, even by a super-admin', async () => {
    for (const ctx of [publicCtx(env), anonCtx(env), adminCtx(env), superAdminCtx(env)]) {
      await assertFails(uploadString(ref(ctx.storage(), 'media1.mp4'), 'replaced'));
    }
  });
});

describe('everything else in the bucket', () => {
  // The regression this suite exists for: the old catch-all was
  // `allow read, write: if request.auth != null`, and anonymous auth is
  // enabled, so any visitor could read and overwrite the entire bucket.
  test('an anonymous visitor cannot write anywhere', async () => {
    const s = anonCtx(env).storage();
    await assertFails(uploadString(ref(s, 'uploads/evil.html'), '<script>'));
    await assertFails(uploadString(ref(s, 'anything.txt'), 'x'));
    await assertFails(uploadString(ref(s, 'deeply/nested/path/x.bin'), 'x'));
  });

  test('an anonymous visitor cannot read anything', async () => {
    await assertFails(getBytes(ref(anonCtx(env).storage(), 'uploads/patient-scan.pdf')));
  });

  test('an anonymous visitor cannot delete anything', async () => {
    await assertFails(deleteObject(ref(anonCtx(env).storage(), 'uploads/patient-scan.pdf')));
  });

  test('not even an admin or super-admin has client-side bucket access', async () => {
    // Server-side code uses the Admin SDK, which bypasses rules entirely,
    // so there is no reason to grant any client tier access here.
    for (const ctx of [adminCtx(env), superAdminCtx(env)]) {
      await assertFails(getBytes(ref(ctx.storage(), 'uploads/patient-scan.pdf')));
      await assertFails(uploadString(ref(ctx.storage(), 'uploads/new.txt'), 'x'));
    }
  });
});
