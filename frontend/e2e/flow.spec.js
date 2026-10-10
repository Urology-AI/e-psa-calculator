import { test, expect, fillPart1, scorePart1, enterPsa } from './helpers.js';

test.describe('Patient flow: Part 1 -> Part 2 -> MRI', () => {
  test('Part 1 form reaches 25/25 and scores without a scoring-failed banner', async ({ page }) => {
    await fillPart1(page);
    await expect(page.getByText('25/25')).toBeVisible();
    await page.getByText('Calculate My Score').click();
    await expect(page.getByText('Why did I receive this result?')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("We couldn't calculate your results")).toHaveCount(0);
    await expect(page.getByText('Strong candidate for PSA testing').first()).toBeVisible();
  });

  test('Part 2: PSA entry shows Part 1 baseline with a human label (not the raw enum)', async ({ page }) => {
    await scorePart1(page);
    await page.getByRole('button', { name: 'Add PSA result' }).click();
    await expect(page.getByText('PART 2 — YOUR PSA RESULT')).toBeVisible();
    await expect(page.getByText('Part 1 Baseline')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('PSA_RECOMMENDED');
  });

  test('Part 2: PSA above age threshold gives an elevated result carrying the Part 1 score', async ({ page }) => {
    await scorePart1(page);
    await enterPsa(page, 5.2);
    await expect(page.getByText('Elevated — Imaging Advised')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('PSA above age-adjusted threshold')).toBeVisible();
    await expect(page.getByText('5.2 ng/mL').first()).toBeVisible();
  });

  test('Part 2: a low PSA is not flagged as elevated', async ({ page }) => {
    await scorePart1(page);
    await enterPsa(page, 0.9);
    await expect(page.getByText('WHAT HAPPENS NEXT?')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Elevated — Imaging Advised')).toHaveCount(0);
  });

  test('Part 3: MRI with PI-RADS 4 recalculates the assessment', async ({ page }) => {
    await scorePart1(page);
    await enterPsa(page, 5.2);
    await page.getByRole('button', { name: 'Continue to MRI Assessment →' }).click({ timeout: 45_000 });
    await expect(page.getByText('PART 3 — MRI RESULTS (OPTIONAL)')).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByRole('radio', { name: 'PI-RADS 4: Suspicious' }).click();
    await page.getByRole('button', { name: 'Calculate Risk Assessment ✓' }).click();
    await expect(page.getByText('MRI or biopsy', { exact: false }).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("We couldn't calculate your results")).toHaveCount(0);
  });

  test('Part 3: MRI can be skipped (PIRADS unknown)', async ({ page }) => {
    await scorePart1(page);
    await enterPsa(page, 5.2);
    await page.getByRole('button', { name: 'Continue to MRI Assessment →' }).click({ timeout: 45_000 });
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Calculate Risk Assessment ✓' }).click();
    await expect(page.getByText("We couldn't calculate your results")).toHaveCount(0);
    await expect(page.getByText('Overall', { exact: false }).first()).toBeVisible({ timeout: 45_000 });
  });
});
