// The stage of the demo, the same for the video (recorder.mjs) and for its tests (playwright.config.ts):
// the same data (./fixture), the same viewport, the same fonts, the same terminal and the same web view.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const fixture = join(root, 'fixture');
export const size = { width: 1280, height: 720 };
export const TTY = 7681, WEB = 4173;
export const ttyUrl = `http://127.0.0.1:${TTY}/`;
export const webUrl = `http://127.0.0.1:${WEB}/`;

// Chrome sees only the fonts in fonts.conf: DejaVu, from node_modules.
const fonts = join(root, 'node_modules/dejavu-fonts-ttf/ttf');
if (!existsSync(fonts)) throw new Error(`${fonts} is missing: run npm ci`);
export const browserEnv = { FONTCONFIG_FILE: join(root, 'docs/demo/fonts.conf') };

// The same page in every run: no device scaling, light colours, one locale and time zone.
/** @type {import('playwright').BrowserContextOptions} */
export const contextOptions = {
  viewport: size,
  deviceScaleFactor: 1,
  colorScheme: 'light',
  locale: 'en-US',
  timezoneId: 'UTC',
};

// A clean shell in a real terminal: `$ ` prompt, no history, in the checkout, DejaVu Sans Mono 17 px.
export const ttyd = {
  command: 'ttyd',
  args: ['-p', String(TTY), '-i', '127.0.0.1', '-d', '3', '-W', '-t', 'fontSize=17', '-t', 'fontFamily=DejaVu Sans Mono',
    '-t', 'disableLeaveAlert=true', 'bash', '--norc', '--noprofile'],
  env: { PS1: '$ ', HISTFILE: '/dev/null' },
};

// The real web view.
export const serve = { command: 'node', args: ['src/cli.ts', 'serve', String(WEB)] };
