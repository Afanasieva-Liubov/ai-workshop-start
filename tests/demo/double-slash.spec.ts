// The double-slash demo (docs/demo/double-slash.mjs) as tests: each of its scenes, in the real terminal and the
// real web view, on the demo's stage, and its key moment compared pixel for pixel with its screenshot.
// spec/web.md#server: a path it does not know → 404, a foreign Host → 403; no request stops the server.
import { expect, test } from '@playwright/test';
import { fixture, webUrl } from '../../docs/demo/stage.mjs';
import { run } from './terminal.ts';

test.afterEach(async ({ page }) => {
  await page.waitForTimeout(1000);
});

test.describe('a request for // keeps the web view running', () => {
  test('the browser at //: Not found, 404', async ({ page }) => {
    const response = await page.goto(`${webUrl}/`);
    expect(new URL(response!.url()).pathname).toBe('//');
    expect(response!.status()).toBe(404);
    await expect(page.locator('body')).toHaveText('Not found');
    await expect(page).toHaveScreenshot('double-slash-web.png');
  });

  test('curl //: 404 Not Found', async ({ page }) => {
    expect(await run(page, 'curl -si http://127.0.0.1:4173// | head -1')).toBe('HTTP/1.1 404 Not Found');
    await expect(page).toHaveScreenshot('double-slash-curl.png');
  });

  test("curl // with Host: evil.com: 403 Forbidden", async ({ page }) => {
    expect(await run(page, "curl -si -H 'Host: evil.com' http://127.0.0.1:4173// | head -1")).toBe('HTTP/1.1 403 Forbidden');
    await expect(page).toHaveScreenshot('double-slash-curl-host.png');
  });

  test('curl /\\ (as is): 404 Not Found', async ({ page }) => {
    expect(await run(page, "curl -si --path-as-is --request-target '/\\' http://127.0.0.1:4173/ | head -1")).toBe('HTTP/1.1 404 Not Found');
    await expect(page).toHaveScreenshot('double-slash-curl-backslash.png');
  });

  test('curl / after them: 200 OK, the server still runs', async ({ page }) => {
    expect(await run(page, 'curl -si http://127.0.0.1:4173/ | head -1')).toBe('HTTP/1.1 200 OK');
    await expect(page).toHaveScreenshot('double-slash-curl-root.png');
  });

  test('the web view still scans: fixture · 6 skills', async ({ page }) => {
    await page.goto(webUrl);
    await page.locator('#repository').pressSequentially(fixture, { delay: 25 });
    await page.click('#scan');
    await expect(page.locator('#status')).toHaveText('fixture · 6 skills');
    await expect(page).toHaveScreenshot('web-scanned.png');
  });
});
