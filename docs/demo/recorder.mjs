// The plumbing of every demo video here: the real CLI in a real terminal (ttyd), the real
// `./skill-atlas serve`, driven by Playwright in Google Chrome; ffmpeg makes the MP4.
// A video is a small script that calls record() with its scenes: see filter.mjs, and
// .agents/skills/demo-video/SKILL.md for the cases. Needs ttyd, ffmpeg and Google Chrome.
// The stage (data, viewport, fonts, terminal, web view) is stage.mjs, shared with the demo's tests.
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { browserEnv, contextOptions, root, serve, size, ttyd, ttyUrl, webUrl } from './stage.mjs';

export { fixture, root, webUrl } from './stage.mjs';

async function until(url) {
  for (let i = 0; i < 100; i++) {
    try { await fetch(url); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error(`${url} did not start`);
}

// Records docs/demo/<name>.mp4, or the path given as the first argument (a trial run).
// scenes({ page, wait, caption, terminal, run, web }) plays the video, in order.
export async function record(name, scenes) {
  const out = process.argv[2] ? resolve(process.argv[2]) : join(root, 'docs/demo', `${name}.mp4`);
  const videos = mkdtempSync(join(tmpdir(), 'skill-atlas-demo-'));
  const children = [];
  const start = (cmd, args, env = {}) =>
    children.push(spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' }));
  let browser;
  try {
    start(ttyd.command, ttyd.args, ttyd.env);
    start(serve.command, serve.args);
    await until(ttyUrl);
    await until(webUrl);

    browser = await chromium.launch({ channel: 'chrome', env: { ...process.env, ...browserEnv } });
    const context = await browser.newContext({ ...contextOptions, recordVideo: { dir: videos, size } });
    const page = await context.newPage();
    const wait = (ms) => page.waitForTimeout(ms);

    await scenes({
      page,
      wait,
      // A title card between the parts; `line` is HTML.
      async caption(title, line = '') {
        await page.setContent(`<body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
          background:#16181c;color:#e6e8eb;font:28px/1.5 system-ui,sans-serif">
          <div style="font-size:44px;font-weight:600">${title}</div><div style="color:#959ca5">${line}</div></body>`);
        await wait(2200);
      },
      // Opens the terminal, in the checkout, ready for run().
      async terminal() {
        await page.goto(ttyUrl);
        await page.waitForSelector('.xterm-helper-textarea');
        await page.click('.xterm');
        await wait(600);
      },
      // Types a command into the terminal, runs it, and leaves its output on screen for `pause` ms.
      async run(command, pause = 3000) {
        await page.keyboard.type(command, { delay: 55 });
        await wait(300);
        await page.keyboard.press('Enter');
        await wait(pause);
      },
      // Opens the web view; web({ repository: fixture, filter: 'test' }) puts them in the address.
      async web(query = {}) {
        const search = new URLSearchParams(query).toString();
        await page.goto(search ? `${webUrl}?${search}` : webUrl);
      },
    });

    await context.close(); // the video is written when the context closes
    const [webm] = readdirSync(videos).filter((f) => f.endsWith('.webm'));
    await new Promise((ok, fail) => {
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(videos, webm), '-c:v', 'libx264', '-preset', 'slow',
        '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out], { stdio: 'inherit' });
      ff.on('error', fail);
      ff.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`))));
    });
    console.log(out);
  } finally {
    await browser?.close();
    for (const child of children) child.kill();
    rmSync(videos, { recursive: true, force: true });
  }
}
