// The stage of the demo, the same for the video (recorder.mjs) and for its tests (playwright.config.ts):
// the same data (./fixture), the same viewport, the same fonts, the same terminal and the same web view.
import { existsSync, mkdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// The same paths on every machine: the CLI and the web view print them (file:///tmp/skill-atlas-stage/fixture/…),
// so the screenshots of the tests match wherever the checkout is. A real directory, not a link to the checkout:
// the shell's working directory, `./skill-atlas` and `./fixture` in it link to the checkout.
export const stage = '/tmp/skill-atlas-stage';
mkdirSync(stage, { recursive: true });
for (const entry of ['skill-atlas', 'src', 'fixture']) {
  const link = join(stage, entry), target = join(root, entry);
  let current;
  try { current = readlinkSync(link); } catch {}
  if (current === target) continue;
  rmSync(link, { force: true });
  symlinkSync(target, link);
}
export const fixture = join(stage, 'fixture');
// A repository with one upper-case Greek skill, for the final-sigma demo: `ΟΔΥΣ` lowers to `οδυς`, with the final ς,
// but inside `ΟΔΥΣΣΕΥΣ` the Σ is a σ (#49). A real directory in the stage, written here: ./fixture stays as it is.
export const greek = join(stage, 'greek');
mkdirSync(join(greek, '.agents/skills/greek'), { recursive: true });
writeFileSync(join(greek, '.agents/skills/greek/SKILL.md'), '---\nname: ΟΔΥΣΣΕΥΣ\ndescription: İSTANBUL straße.\n---\n');
export const size = { width: 1280, height: 720 };
export const TTY = 7681, WEB = 4173;
export const ttyUrl = `http://127.0.0.1:${TTY}/`;
export const webUrl = `http://127.0.0.1:${WEB}/`;

// Chrome sees only the fonts in fonts.conf: DejaVu, from node_modules.
const fonts = join(root, 'node_modules/dejavu-fonts-ttf/ttf');
if (!existsSync(fonts)) throw new Error(`${fonts} is missing: run npm ci`);
export const browserEnv = { FONTCONFIG_FILE: join(root, 'docs/demo/fonts.conf') };
// The same pixels in every run: with partial raster, the rounded corners of a field could come out one shade
// lighter, depending on what was painted before; the screenshots of the tests compare every pixel.
export const browserArgs = ['--disable-partial-raster'];

// The same page in every run: no device scaling, light colours, one locale and time zone.
/** @type {import('playwright').BrowserContextOptions} */
export const contextOptions = {
  viewport: size,
  deviceScaleFactor: 1,
  colorScheme: 'light',
  locale: 'en-US',
  timezoneId: 'UTC',
};

// A clean shell in a real terminal: `$ ` prompt, no history, in the stage, DejaVu Sans Mono 17 px.
export const ttyd = {
  command: 'ttyd',
  args: ['-p', String(TTY), '-i', '127.0.0.1', '-d', '3', '-W', '-t', 'fontSize=17', '-t', 'fontFamily=DejaVu Sans Mono',
    '-t', 'disableLeaveAlert=true', 'bash', '--norc', '--noprofile'],
  env: { PS1: '$ ', HISTFILE: '/dev/null' },
};

// The real web view.
export const serve = { command: 'node', args: ['src/cli.ts', 'serve', String(WEB)] };
