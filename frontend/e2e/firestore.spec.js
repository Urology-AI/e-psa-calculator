import { test, expect, scorePart1, enterPsa } from './helpers.js';

// Real Firestore (emulator) with the project's own firestore.rules enforced for
// the app's reads/writes. The admin-style REST read below uses the emulator's
// "owner" bearer token only to inspect what the app actually stored.
const DOCS = 'http://127.0.0.1:8080/v1/projects/demo-epsa/databases/(default)/documents';
const listDocs = async (collection) => {
  const res = await fetch(`${DOCS}/${collection}`, { headers: { Authorization: 'Bearer owner' } });
  const json = await res.json();
  return json.documents || [];
};
const clearFirestore = () =>
  fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-epsa/databases/(default)/documents', { method: 'DELETE' });

test.describe.configure({ mode: 'serial' }); // shares one emulator database

test.beforeEach(async () => { await clearFirestore(); });

test.describe('Firestore persistence', () => {
  test('nothing is written to Firestore until the user chooses to save', async ({ page }) => {
    await scorePart1(page);
    // Let the session-key lookup finish.
    await expect(page.locator('.save-results-banner__key-value')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Save my results' })).toBeEnabled();
    expect(await listDocs('sessions')).toHaveLength(0);
  });

  test('Save my results writes exactly one session; adding PSA updates it, not a new one', async ({ page }) => {
    await scorePart1(page);
    const key = (await page.locator('.save-results-banner__key-value').innerText({ timeout: 20_000 })).trim();
    expect(key).toMatch(/^[A-Z0-9]{8}$/);

    await page.getByRole('button', { name: 'Save my results' }).click();
    await page.locator('[role=dialog]').getByRole('button', { name: 'Save my results' }).click();
    await expect(page.getByText('Saved.', { exact: false }).first()).toBeVisible({ timeout: 30_000 });

    let sessions = await listDocs('sessions');
    expect(sessions).toHaveLength(1);
    const users = await listDocs('users');
    expect(users.some((u) => u.fields?.sessionId?.stringValue === key)).toBe(true);

    await enterPsa(page, 5.2);
    await expect(page.getByText('Continue to MRI Assessment →')).toBeVisible({ timeout: 45_000 });
    await expect.poll(async () => (await listDocs('sessions')).length, { timeout: 15_000 }).toBe(1);
    sessions = await listDocs('sessions');
    // The Part 2 answers landed on the same document.
    expect(JSON.stringify(sessions[0].fields)).toContain('5.2');
  });

  test('"Not now" in the save dialog stores nothing', async ({ page }) => {
    await scorePart1(page);
    await expect(page.locator('.save-results-banner__key-value')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Save my results' }).click();
    await page.locator('[role=dialog]').getByText('Not now', { exact: true }).click();
    expect(await listDocs('sessions')).toHaveLength(0);
  });
});
