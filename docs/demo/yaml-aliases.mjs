// Records docs/demo/yaml-aliases.mp4: a SKILL.md with 100 YAML aliases (issue #48) is a warning, and the scan
// goes on, in the CLI, then in the web view. The repository is ./aliases on the stage (stage.mjs).
// The plumbing is recorder.mjs; see README.md here.
import { record } from './recorder.mjs';
import { aliases } from './stage.mjs';

await record('yaml-aliases', async ({ page, wait, caption, terminal, run, web }) => {
  // 1. The CLI.
  await caption('Skill Atlas · 100 YAML aliases', 'Front matter the yaml package will not build → a warning; the scan goes on');
  await terminal();
  await run('cat aliases/.agents/skills/alias/SKILL.md', 3500);
  await run('./skill-atlas scan ./aliases; echo "exit code $?"', 4500);

  // 2. The web view.
  await caption('The same repository in the web view', './skill-atlas serve → http://127.0.0.1:4173/');
  await web();
  await page.locator('#repository').pressSequentially(aliases, { delay: 25 });
  await page.click('#scan');
  await page.waitForSelector('#skills li');
  await wait(3000);
  await page.locator('#skills li', { hasText: 'alias' }).click();
  await wait(3000);
});
