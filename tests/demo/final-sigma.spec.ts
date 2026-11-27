// The final-sigma demo (docs/demo/final-sigma.mjs) as tests: an upper-case Greek filter that ends in Σ keeps
// ΟΔΥΣΣΕΥΣ, in the real terminal and the real web view, on the stage's ./greek (#49). Each scene's key moment is
// compared pixel for pixel with its screenshot in tests/demo/screenshots/. `npm run test:demo`; spec/cli.md#filter.
import { expect, test } from '@playwright/test';
import { greek, stage, webUrl } from '../../docs/demo/stage.mjs';
import { run } from './terminal.ts';

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(1000);
});

const listed = ['greek · 1 of 1 skill', 'ΟΔΥΣΣΕΥΣ — İSTANBUL straße.', `  file://${stage}/greek/.agents/skills/greek/SKILL.md`].join('\n');

test('the CLI: scan ./greek ΟΔΥΣ keeps ΟΔΥΣΣΕΥΣ, 1 of 1 skill, like ΟΔΥ and οδυς', async ({ page }) => {
  expect(await run(page, './skill-atlas scan ./greek ΟΔΥ; ./skill-atlas scan ./greek ΟΔΥΣ; ./skill-atlas scan ./greek οδυς'))
    .toBe([listed, listed, listed].join('\n'));
  await expect(page).toHaveScreenshot('cli-scan-greek-final-sigma.png');
});

test('the web view: ΟΔΥ, then Σ → ΟΔΥΣΣΕΥΣ stays, 1 of 1 skill', async ({ page }) => {
  await page.goto(webUrl);
  await page.locator('#repository').pressSequentially(greek, { delay: 25 });
  await page.click('#scan');
  await expect(page.locator('#status')).toHaveText('greek · 1 skill');
  const filter = page.locator('#filter');
  await filter.pressSequentially('ΟΔΥ', { delay: 200 });
  await expect(page.locator('#status')).toHaveText('greek · 1 of 1 skill');
  await filter.pressSequentially('Σ', { delay: 200 });
  await expect(filter).toHaveValue('ΟΔΥΣ');
  await expect(page.locator('#status')).toHaveText('greek · 1 of 1 skill');
  await expect(page.locator('#skills li:not([hidden]) .name')).toHaveText(['ΟΔΥΣΣΕΥΣ']);
  await expect(page.locator('#empty')).toBeHidden();
  await expect(page.locator('#skill h2')).toHaveText('ΟΔΥΣΣΕΥΣ');
  await expect(page).toHaveScreenshot('web-filter-greek-final-sigma.png');
});
