import { test, expect, openPatientPathway } from './helpers.js';

test.describe('Entry pathways', () => {
  test('landing -> consent -> pathway chooser lists all three paths', async ({ page }) => {
    await openPatientPathway(page);
    await expect(page.getByText('Should I get a PSA test?')).toBeVisible();
    await expect(page.getByText('I have a PSA result')).toBeVisible();
    await expect(page.getByText('I had a PSA and an MRI')).toBeVisible();
  });

  test('"Enter My PSA" path opens a form instead of erroring', async ({ page }) => {
    await openPatientPathway(page);
    await page.getByText('Enter My PSA', { exact: true }).click();
    await expect(page.locator('input').first()).toBeVisible();
    await expect(page.getByText("We couldn't calculate")).toHaveCount(0);
  });

  test('"Enter My Results" (PSA + MRI) path opens a form instead of erroring', async ({ page }) => {
    await openPatientPathway(page);
    await page.getByText('Enter My Results', { exact: true }).click();
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('Part 1 cannot be calculated until all questions are answered', async ({ page }) => {
    await openPatientPathway(page);
    await page.getByText('Start Assessment', { exact: true }).click();
    await expect(page.getByText('Calculate My Score')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Complete all questions (0/25)' })).toBeVisible();
  });
});
