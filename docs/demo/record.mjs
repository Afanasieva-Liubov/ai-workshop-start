// Records docs/demo/filter.mp4: the filter in the CLI, then in the web view, on ./fixture.
// The real CLI in a real terminal (ttyd), the real `./skill-atlas serve`, driven by Playwright.
// Needs ttyd, ffmpeg and Google Chrome; see README.md here.
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = join(root, 'fixture');
const out = join(root, 'docs/demo/filter.mp4');
const size = { width: 1280, height: 720 };
const TTY = 7681, WEB = 4173;

const children = [];
function start(cmd, args, env = {}) {
  const child = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' });
  children.push(child);
  return child;
}
async function until(url) {
  for (let i = 0; i < 100; i++) {
    try { await fetch(url); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error(`${url} did not start`);
}

// A clean shell: `$ ` prompt, no history, in the checkout.
start('ttyd', ['-p', String(TTY), '-i', '127.0.0.1', '-W', '-t', 'fontSize=17', '-t', 'disableLeaveAlert=true',
  'bash', '--norc', '--noprofile'], { PS1: '$ ', HISTFILE: '/dev/null' });
start('node', ['src/cli.ts', 'serve', String(WEB)]);
await until(`http://127.0.0.1:${TTY}/`);
await until(`http://127.0.0.1:${WEB}/`);

const videos = mkdtempSync(join(tmpdir(), 'skill-atlas-demo-'));
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: size, recordVideo: { dir: videos, size } });
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);

async function caption(title, line) {
  await page.setContent(`<body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
    background:#16181c;color:#e6e8eb;font:28px/1.5 system-ui,sans-serif">
    <div style="font-size:44px;font-weight:600">${title}</div><div style="color:#959ca5">${line}</div></body>`);
  await wait(2200);
}

// 1. The CLI.
await caption('Skill Atlas · the filter', 'Words after the repository keep the skills whose name or description contains every word');
await page.goto(`http://127.0.0.1:${TTY}/`);
await page.waitForSelector('.xterm-helper-textarea');
await page.click('.xterm');
await wait(600);
async function run(command, pause = 3000) {
  await page.keyboard.type(command, { delay: 55 });
  await wait(300);
  await page.keyboard.press('Enter');
  await wait(pause);
}
// Warnings go to stderr; the fixture has one malformed SKILL.md on purpose. Hidden here to keep it short.
await run('./skill-atlas scan ./fixture 2>/dev/null', 3500);
await run('clear', 300);
await run('./skill-atlas scan ./fixture mps 2>/dev/null', 3500);
await run('./skill-atlas scan ./fixture MPS tests 2>/dev/null', 3500);
await run('./skill-atlas scan ./fixture nothing 2>/dev/null; echo "exit code $?"', 3500);

// 2. The web view.
await caption('The same filter in the web view', './skill-atlas serve → http://127.0.0.1:4173/');
await page.goto(`http://127.0.0.1:${WEB}/`);
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
const url = `http://127.0.0.1:${WEB}/?repository=${encodeURIComponent(fixture)}&filter=test`;
await caption('?filter= in the address', `…/?repository=…/fixture&amp;filter=test`);
await page.goto(url);
await page.waitForSelector('#skills li:not([hidden])');
await wait(3000);

await context.close();
await browser.close();
for (const child of children) child.kill();

const [webm] = readdirSync(videos).filter((f) => f.endsWith('.webm'));
await new Promise((ok, fail) => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(videos, webm), '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], { stdio: 'inherit' });
  ff.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`))));
});
rmSync(videos, { recursive: true });
console.log(out);
