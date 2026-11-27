// The yaml-aliases demo (docs/demo/yaml-aliases.mjs) as tests: a SKILL.md with 100 YAML aliases (issue #48), in the
// real terminal and the real web view, on the demo's stage; its key moments compared pixel for pixel with their
// screenshots in tests/demo/screenshots/. `npm run test:demo`; spec/analysis.md#demo-tests.
import { expect, test } from '@playwright/test';
import { aliases, stage, webUrl } from '../../docs/demo/stage.mjs';
import { run } from './terminal.ts';

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(1000);
});

const warning = 'warning: .agents/skills/alias/SKILL.md: malformed front matter: Excessive alias count indicates a resource exhaustion attack; using the directory name';

test('scan ./aliases: both skills, the warning for the 100 aliases, exit code 0', async ({ page }) => {
  expect(await run(page, './skill-atlas scan ./aliases; echo "exit code $?"')).toBe([
    'aliases · 2 skills',
    'alias',
    `  file://${stage}/aliases/.agents/skills/alias/SKILL.md`,
    'commits — Write commit messages the way this repository does.',
    `  file://${stage}/aliases/.claude/skills/commits/SKILL.md`,
    warning,
    'exit code 0',
  ].join('\n'));
  await expect(page).toHaveScreenshot('cli-scan-aliases.png');
});

test('the web view: both skills listed, the warning under the field, alias shown by its directory name', async ({ page }) => {
  await page.goto(webUrl);
  await page.locator('#repository').pressSequentially(aliases, { delay: 25 });
  await page.click('#scan');
  await expect(page.locator('#status')).toHaveText('aliases · 2 skills');
  await expect(page.locator('#warnings li')).toHaveText([warning]);
  await page.locator('#skills li', { hasText: 'alias' }).click();
  await expect(page.locator('#skill h2')).toHaveText('alias');
  await expect(page).toHaveScreenshot('web-scanned-aliases.png');
});
