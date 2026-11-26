// Records docs/demo/filter.mp4: the filter in the CLI, then in the web view, on ./fixture.
// The plumbing is recorder.mjs; see README.md here.
import { fixture, record } from './recorder.mjs';

await record('filter', async ({ page, wait, caption, terminal, run, web }) => {
  // 1. The CLI.
  await caption('Skill Atlas · the filter', 'Words after the repository keep the skills whose name or description contains every word');
  await terminal();
  // Warnings go to stderr; the fixture has one malformed SKILL.md on purpose. Hidden here to keep it short.
  await run('./skill-atlas scan ./fixture 2>/dev/null', 3500);
  await run('clear', 300);
  await run('./skill-atlas scan ./fixture mps 2>/dev/null', 3500);
  await run('./skill-atlas scan ./fixture MPS tests 2>/dev/null', 3500);
  await run('./skill-atlas scan ./fixture nothing 2>/dev/null; echo "exit code $?"', 3500);

  // 2. The web view.
  await caption('The same filter in the web view', './skill-atlas serve → http://127.0.0.1:4173/');
  await web();
  await page.locator('#repository').pressSequentially(fixture, { delay: 25 });
  await page.click('#scan');
  await page.waitForSelector('#skills li');
  await wait(2000);
  const filter = page.locator('#filter');
  // As you type, with no new scan: code-style, selected, stops matching and is no longer shown.
  await filter.pressSequentially('mps', { delay: 180 });
  await wait(2200);
  await filter.fill('');
  await wait(800);
  // Two matches with three hidden skills between them: the arrow key skips those.
  await filter.pressSequentially('repository', { delay: 120 });
  await wait(1500);
  const visible = page.locator('#skills li:not([hidden])');
  await visible.first().click();
  await wait(1500);
  await page.keyboard.press('ArrowDown');
  await wait(600);
  await page.keyboard.press('Enter');
  await wait(2000);
  await filter.fill('');
  await filter.pressSequentially('nothing', { delay: 150 });
  await wait(2200);

  // 3. ?filter= in the address fills the field on load.
  await caption('?filter= in the address', `…/?repository=…/fixture&amp;filter=test`);
  await web({ repository: fixture, filter: 'test' });
  await page.waitForSelector('#skills li:not([hidden])');
  await wait(3000);
});
