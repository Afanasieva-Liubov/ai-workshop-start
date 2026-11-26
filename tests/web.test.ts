// spec/web.md, checked on the real server: the page, and the scan behind it for ./fixture and for
// a small GitHub repository answered in tests/helpers.ts.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { request } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { serve } from '../src/web.ts';
import { CLI, EXAMPLE_COMMIT, FIXTURE, open } from './helpers.ts';

const { server, url } = await serve({ open, port: 0 });
after(() => server.close());

async function scanned(repository: string) {
  const response = await fetch(`${url}api/scan?repository=${encodeURIComponent(repository)}`);
  return { status: response.status, body: (await response.json()) as any };
}

test('the page: a field for the repository link, on 127.0.0.1', async () => {
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
  const page = await response.text();
  assert.match(page, /<input id="repository"[^>]*aria-label="Repository link"/);
  assert.match(page, /\/api\/scan\?repository=/);
});

/** The page as a browser shows it, opened at `?repository=<link>`, once the scan has finished. */
async function page(repository: string) {
  const dom = await JSDOM.fromURL(`${url}?repository=${encodeURIComponent(repository)}`, {
    runScripts: 'dangerously',
    beforeParse: (window) => Object.assign(window, { fetch: (path: string) => fetch(new URL(path, url)) }),
  });
  const document = dom.window.document;
  const button = document.getElementById('scan') as HTMLButtonElement;
  for (let i = 0; i < 200 && (button.disabled || !document.getElementById('status')!.textContent); i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  after(() => dom.window.close());
  return document;
}

test('the page: ?repository=<link> scans on load; skills with badges, warnings under the field, the first skill shown', async () => {
  const document = await page(FIXTURE);
  assert.equal((document.getElementById('repository') as HTMLInputElement).value, FIXTURE);
  assert.equal(document.getElementById('status')!.textContent, 'fixture · 6 skills');
  assert.equal(document.getElementById('result')!.hidden, false);
  const items = [...document.querySelectorAll('#skills li')].map((li) => li.querySelector('.name')!.textContent);
  assert.deepEqual(items, ['code-style', 'commits', 'mps-aspect-generatorproduct', 'mps-tests+1 copy', 'release-checklist', 'writing-lint-checks']);
  const warnings = [...document.querySelectorAll('#warnings li')].map((li) => li.textContent);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /^warning: \.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter: /);
  const shown = document.getElementById('skill')!;
  assert.equal(shown.querySelector('h2')!.textContent, 'code-style');
  assert.equal(shown.querySelector('pre')!.textContent, readFileSync(join(FIXTURE, '.github/skills/code-style/SKILL.md'), 'utf8'));
});

test('the page: a selected skill shows its link, also in and part of the product', async () => {
  const document = await page(FIXTURE);
  const item = (name: string) => [...document.querySelectorAll<HTMLElement>('#skills li')].find((li) => li.textContent!.startsWith(name))!;
  item('mps-tests').click();
  const meta = () => [...document.querySelectorAll('#skill .meta')].map((p) => p.textContent);
  assert.ok(meta().includes('also in .claude/skills/mps-tests/SKILL.md'), String(meta()));
  assert.equal(document.querySelector<HTMLAnchorElement>('#skill a')!.href, `${pathToFileURL(FIXTURE).href}/.agents/skills/mps-tests/SKILL.md`);
  item('mps-aspect-generator').click();
  assert.ok(meta().includes('part of the product: plugins/mcp-tools/resources'), String(meta()));
});

test('the page: an error → its clear message in place of the result', async () => {
  const document = await page(join(FIXTURE, 'no-such-directory'));
  const status = document.getElementById('status')!;
  assert.equal(status.className, 'error');
  assert.match(status.textContent!, /^Not a GitHub URL or a readable directory: .*no-such-directory$/);
  assert.equal(document.getElementById('result')!.hidden, true);
});

test('a Host other than 127.0.0.1:<port> or localhost:<port> → 403 (DNS rebinding)', async () => {
  const { port } = new URL(url);
  const status = (host: string) =>
    new Promise<number>((resolve, reject) => {
      const path = `/api/scan?repository=${encodeURIComponent(FIXTURE)}`;
      request({ host: '127.0.0.1', port, path, headers: { host } }, (response) => resolve(response.resume().statusCode!)).on('error', reject).end();
    });
  assert.equal(await status(`attacker.example:${port}`), 403);
  assert.equal(await status('127.0.0.1'), 403);
  assert.equal(await status(`localhost:${port}`), 200);
  assert.equal(await status(`127.0.0.1:${port}`), 200);
});

test('a GitHub repository: its skills, each with its pinned link and its SKILL.md', async () => {
  const { status, body } = await scanned('https://github.com/JetBrains/example');
  assert.equal(status, 200);
  assert.equal(body.repository.id, 'JetBrains/example');
  assert.deepEqual(body.warnings, []);
  assert.deepEqual(body.skills.map((s: { name: string; link: string; text: string }) => [s.name, s.link, s.text]), [[
    'commits',
    `https://github.com/JetBrains/example/blob/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`,
    '---\nname: commits\ndescription: Write commit messages the way this repository does. Use for every commit.\n---\n# Commits\n',
  ]]);
});

test('./fixture: the same skills as the CLI, in the same order, with copies, product, warnings and each SKILL.md', async () => {
  const { status, body } = await scanned(FIXTURE);
  assert.equal(status, 200);
  const root = pathToFileURL(FIXTURE).href;
  assert.deepEqual(
    body.skills.map((s: { name: string; path: string; link: string; copies: string[]; product?: string }) => [s.name, s.link, s.copies, s.product ?? null]),
    [
      ['code-style', `${root}/.github/skills/code-style/SKILL.md`, [], null],
      ['commits', `${root}/.claude/skills/commits/SKILL.md`, [], null],
      ['mps-aspect-generator', `${root}/plugins/mcp-tools/resources/skills/mps-aspect-generator/SKILL.md`, [], 'plugins/mcp-tools/resources'],
      ['mps-tests', `${root}/.agents/skills/mps-tests/SKILL.md`, ['.claude/skills/mps-tests/SKILL.md'], null],
      ['release-checklist', `${root}/.agents/skills/release-checklist/SKILL.md`, [], null],
      ['writing-lint-checks', `${root}/agent/skills/writing-lint-checks/SKILL.md`, [], null],
    ],
  );
  for (const skill of body.skills) assert.equal(skill.text, readFileSync(join(FIXTURE, skill.path), 'utf8'));
  assert.equal(body.warnings.length, 1);
  assert.match(body.warnings[0], /^\.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter: /);
});

test('an empty field or an unreachable repository → 400 with the clear message', async () => {
  assert.deepEqual(await scanned('  '), { status: 400, body: { error: 'Enter a GitHub URL or a directory' } });
  const missing = await scanned(join(FIXTURE, 'no-such-directory'));
  assert.equal(missing.status, 400);
  assert.match(missing.body.error, /^Not a GitHub URL or a readable directory: .*no-such-directory$/);
  const offline = await scanned('https://github.com/JetBrains/not-answered');
  assert.deepEqual(offline, { status: 400, body: { error: 'Cannot reach GitHub: not recorded: https://api.github.com/repos/JetBrains/not-answered' } });
  assert.equal((await fetch(`${url}nothing-here`)).status, 404);
});

test('skill-atlas serve <port>: prints the URL and serves the page until stopped', async (t) => {
  const child = spawn(process.execPath, [CLI, 'serve', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const line = await new Promise<string>((resolve, reject) => {
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
      if (out.includes('\n')) resolve(out);
    });
    child.once('exit', (code) => reject(new Error(`exited with ${code}`)));
  });
  const served = /^Skill Atlas web view: (http:\/\/127\.0\.0\.1:\d+\/)\n$/.exec(line);
  assert.ok(served, line);
  assert.equal((await fetch(served[1])).status, 200);
});

test('skill-atlas serve with a bad port → usage, exit code 1', () => {
  for (const port of ['eighty', '', '0x10', '1e3', '-1', '65536']) {
    const bad = spawnSync(process.execPath, [CLI, 'serve', port], { encoding: 'utf8', timeout: 5000 });
    assert.equal(bad.status, 1, `serve ${JSON.stringify(port)}`);
    assert.equal(bad.stderr, 'Usage: skill-atlas serve [port]\n');
  }
});

test('skill-atlas serve on a port in use → a clear message, exit code 1', () => {
  const port = new URL(url).port;
  const busy = spawnSync(process.execPath, [CLI, 'serve', port], { encoding: 'utf8' });
  assert.equal(busy.status, 1);
  assert.equal(busy.stderr, `Port ${port} is in use; try another: skill-atlas serve <port>\n`);
});
