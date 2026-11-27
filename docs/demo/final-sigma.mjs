// Records docs/demo/final-sigma.mp4: an upper-case Greek filter that ends in Σ, in the CLI, then in the web view,
// on the stage's ./greek (one skill, ΟΔΥΣΣΕΥΣ). The plumbing is recorder.mjs; see README.md here.
import { greek, record } from './recorder.mjs';

await record('final-sigma', async ({ page, wait, caption, terminal, run, web }) => {
  // 1. The CLI.
  await caption('Skill Atlas · Greek in the filter', 'ΟΔΥΣ matches ΟΔΥΣΣΕΥΣ: σ and the final ς are one letter');
  await terminal();
  await run('./skill-atlas scan ./greek ΟΔΥ', 2500);
  await run('./skill-atlas scan ./greek ΟΔΥΣ', 3500);
  await run('./skill-atlas scan ./greek οδυς', 3500);

  // 2. The web view.
  await caption('The same filter in the web view', './skill-atlas serve → http://127.0.0.1:4173/');
  await web();
  await page.locator('#repository').pressSequentially(greek, { delay: 25 });
  await page.click('#scan');
  await page.waitForSelector('#skills li');
  await wait(1500);
  const filter = page.locator('#filter');
  await filter.pressSequentially('ΟΔΥ', { delay: 200 });
  await wait(1500);
  // The Σ at the end: the skill stays, 1 of 1 skill.
  await filter.pressSequentially('Σ', { delay: 200 });
  await wait(3000);
});
