import { test, expect, fillPart1, scorePart1, enterPsa } from './helpers.js';

test.describe('Navigation and state between parts', () => {
  test('Back from Part 2 PSA form returns to Part 1 results, answers intact', async ({ page }) => {
    await scorePart1(page);
    await page.getByRole('button', { name: 'Add PSA result' }).click();
    await page.getByRole('button', { name: '← Back' }).click();
    await expect(page.getByText('Why did I receive this result?')).toBeVisible();
    await expect(page.getByText('Strong candidate for PSA testing').first()).toBeVisible();
  });

  test('Part 1 -> Part 2 -> Back -> Part 2 again does not lose or double-score', async ({ page }) => {
    await scorePart1(page);
    await page.getByRole('button', { name: 'Add PSA result' }).click();
    await page.getByRole('button', { name: '← Back' }).click();
    await enterPsa(page, 4.8);
    await expect(page.getByText('4.8 ng/mL').first()).toBeVisible({ timeout: 45_000 });
  });

  test('Back from Part 2 results returns to the PSA form with the value kept', async ({ page }) => {
    await scorePart1(page);
    await enterPsa(page, 5.2);
    await expect(page.getByText('Continue to MRI Assessment →')).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: '← Back' }).click();
    // Regression: Back used to land on the disabled Advanced Biomarkers form.
    await expect(page.getByText('PART 3 — ADVANCED BIOMARKERS')).toHaveCount(0);
    await expect(page.locator('#field-psa')).toHaveValue('5.2');
  });

  test('Edit Answers from Part 1 results opens the form with answers prefilled', async ({ page }) => {
    await scorePart1(page);
    await page.getByRole('button', { name: 'Edit Answers' }).click();
    await expect(page.locator('#field-age')).toHaveValue('62');
  });

  test('Reload on results offers to continue, and continuing restores the results', async ({ page }) => {
    await scorePart1(page);
    await page.reload();
    await expect(page.getByText('Continue your session?')).toBeVisible();
    await page.getByRole('button', { name: 'Continue my session' }).click();
    await expect(page.getByText('Why did I receive this result?')).toBeVisible({ timeout: 45_000 });
  });

  test('Reload then "Start a new one" erases the old answers', async ({ page }) => {
    await scorePart1(page);
    await page.reload();
    await page.getByRole('button', { name: 'Start a new one' }).click();
    await page.reload();
    await expect(page.getByText('Continue your session?')).toHaveCount(0);
  });

  test('Session-key banner never sticks on "Saving…" after moving Part 1 -> Part 2', async ({ page }) => {
    await scorePart1(page);
    // Leave while the key lookup (1.2s timer + request) is in flight.
    await page.waitForTimeout(1500);
    await enterPsa(page, 5.2);
    await expect(page.getByText('Continue to MRI Assessment →')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Saving…' })).toHaveCount(0, { timeout: 15_000 });
  });
});

test.describe('Error reporting', () => {
  test('a failed scoring call can be reported, and the saved report is shown and survives reload', async ({ page }) => {
    // Break the scoring callable only (a real outage looks like this to the app).
    page.allowBrowserErrors = true;
    await page.route('**/calculatePsaRecommendation', (route) => route.abort('failed'));
    await fillPart1(page);
    await page.getByText('Calculate My Score').click();
    await expect(page.getByText("We couldn't calculate your results")).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Report this problem' }).click();
    const report = page.getByTestId('error-report-text');
    await expect(report).toContainText('[scoring]');
    await expect(report).toContainText('stage=pre');
    // Answers must never be in the report.
    await expect(report).not.toContainText('62');
    await page.reload();
    const stored = await page.evaluate(() => localStorage.getItem('epsa_error_reports'));
    expect(stored).toContain('scoring');
  });
});

test.describe('Bug report', () => {
  test('footer "Report a bug" opens the panel; email link targets the team and carries the note', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Report a bug' }).click();
    await page.getByRole('textbox').fill('Stuck on part 2');
    const href = await page.getByRole('link', { name: 'Email to the team' }).getAttribute('href');
    expect(href).toMatch(/^mailto:aditya\.dixit@mssm\.edu\?/);
    expect(decodeURIComponent(href)).toContain('Stuck on part 2');
    await expect(page.getByRole('button', { name: 'Save screenshot' })).toBeVisible();
  });

  test('Save screenshot downloads a PNG', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Report a bug' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: 'Save screenshot' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^epsa-screenshot-.*\.png$/);
  });
});
