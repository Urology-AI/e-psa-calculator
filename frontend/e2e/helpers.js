import { test as base, expect } from '@playwright/test';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Console noise that is expected when running against the emulators.
const IGNORED_CONSOLE = [
  /Firebase configuration is missing/,
  /Failed to load resource.*(favicon|manifest)/i,
  /firestore|Firestore|WebChannel|net::ERR_CONNECTION_REFUSED.*8080/i,
];

/**
 * Every test fails on an uncaught page error or an unexpected console.error —
 * "the app silently broke on Part 2" is exactly what this exists to catch.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      problems.push(`console.error: ${text.slice(0, 300)}`);
    });
    page.allowBrowserErrors = false;
    await use(page);
    if (page.allowBrowserErrors) return; // test deliberately breaks something
    expect(problems, 'unexpected browser errors').toEqual([]);
  },
});
export { expect };

/** Click one option in a numbered Part 1 question card ("2", "2b", "Q8"...). */
export const pick = (page, q, option) =>
  page
    .locator('.question-card')
    .filter({ has: page.locator('.question-number', { hasText: new RegExp(`^${esc(q)}$`) }) })
    .locator('button')
    .filter({ hasText: new RegExp(`^${esc(option)}$`) })
    .first()
    .click();

export async function openPatientPathway(page) {
  await page.goto('/');
  await page.getByText('Start Assessment').first().click();
  await page.getByText('I understand — start my assessment').click();
}

const BASE_ANSWERS = {
  age: '62', ft: '5', inch: '10', lbs: '180',
  race: 'White or Caucasian', family: 'None', exercise: 'Some (1-2 days/week)',
};

/** Walk Pre-PSA ("Should I get a PSA test?") through all 25 answers, stopping before Calculate. */
export async function fillPart1(page, overrides = {}) {
  const a = { ...BASE_ANSWERS, ...overrides };
  await openPatientPathway(page);
  await page.getByText('Start Assessment', { exact: true }).click();
  await page.waitForSelector('#field-age');
  await page.fill('#field-age', a.age);
  await pick(page, '2', a.race);
  await pick(page, '2b', 'Not Hispanic or Latino');
  await pick(page, '2c', 'No');
  await pick(page, '3', a.family);
  await pick(page, '4', 'Never tested / unsure');
  await pick(page, '4b', 'No');
  await page.fill('#field-height-ft', a.ft);
  await page.fill('#field-height-in', a.inch);
  await page.fill('#field-weight-lbs', a.lbs);
  await pick(page, '8', a.exercise);
  await pick(page, '9', 'Never');
  await pick(page, '10', 'Mediterranean');
  await pick(page, '11', 'No');
  await pick(page, '12', 'No');
  await pick(page, '13', 'None of the above');
  await page.getByText('(2) Mostly satisfied').click();
  await page.getByText('(4) High').click();
}

export async function scorePart1(page, overrides) {
  await fillPart1(page, overrides);
  await page.getByText('Calculate My Score').click();
  await expect(page.getByText('Why did I receive this result?')).toBeVisible({ timeout: 45_000 });
}

export async function enterPsa(page, psa) {
  await page.getByRole('button', { name: 'Add PSA result' }).click();
  await page.fill('#field-psa', String(psa));
  await page.getByRole('button', { name: 'No / Not sure' }).click();
  await page.getByRole('button', { name: 'Next →' }).click();
}
