// Records docs/demo/double-slash.mp4: a request for // and other odd paths no longer stops the web view (#47).
// The plumbing is recorder.mjs; see README.md here.
import { fixture, record, webUrl } from './recorder.mjs';

await record('double-slash', async ({ page, wait, caption, terminal, run, web }) => {
  await caption('Skill Atlas · a request for // keeps the web view running',
    'A path it does not know → 404, a foreign Host → 403; no request stops the server');
  // 1. In the browser: http://127.0.0.1:4173// is a path it does not know.
  await web();
  await wait(1500);
  await page.goto(`${webUrl}/`);
  await wait(2500);
  // 2. The requests that used to stop it, from a terminal; then the page, still answered.
  await terminal();
  await run('curl -si http://127.0.0.1:4173// | head -1', 2200);
  await run("curl -si -H 'Host: evil.com' http://127.0.0.1:4173// | head -1", 2200);
  await run("curl -si --path-as-is --request-target '/\\' http://127.0.0.1:4173/ | head -1", 2200);
  await run('curl -si http://127.0.0.1:4173/ | head -1', 3000);
  // 3. The web view still scans.
  await web();
  await page.locator('#repository').pressSequentially(fixture, { delay: 25 });
  await page.click('#scan');
  await page.waitForSelector('#skills li');
  await wait(3000);
});
