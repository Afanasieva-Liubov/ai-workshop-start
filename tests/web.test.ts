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

// spec/web.md, Filter: on the page, over the skills already scanned.
/** The page at `?<query>`, once the scan has finished, counting its requests to /api/scan. */
async function filterPage(query: string) {
  const scans: string[] = [];
  const dom = await JSDOM.fromURL(`${url}?${query}`, {
    runScripts: 'dangerously',
    beforeParse: (window) =>
      Object.assign(window, {
        fetch: (path: string) => {
          if (path.startsWith('/api/scan')) scans.push(path);
          return fetch(new URL(path, url));
        },
      }),
  });
  const document = dom.window.document;
  const button = document.getElementById('scan') as HTMLButtonElement;
  for (let i = 0; i < 200 && (button.disabled || !document.getElementById('status')!.textContent); i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  after(() => dom.window.close());
  const filter = document.getElementById('filter') as HTMLInputElement;
  return {
    window: dom.window,
    document,
    scans,
    filter,
    type(text: string) {
      filter.value = text;
      filter.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    },
    status: () => document.getElementById('status')!.textContent,
    names: () => [...document.querySelectorAll('#skills li:not([hidden]) .name')].map((name) => name.firstChild!.textContent),
    shown: () => (document.getElementById('skill')!.hidden ? null : document.querySelector('#skill h2')?.textContent ?? null),
    empty: () => {
      const empty = document.getElementById('empty')!;
      return empty.hidden ? null : empty.textContent;
    },
  };
}

test('the page: a filter field above the skills; typing filters the list and the count, with no new scan', async () => {
  const view = await filterPage(`repository=${encodeURIComponent(FIXTURE)}`);
  assert.equal(view.filter.getAttribute('aria-label'), 'Filter the skills');
  assert.ok(view.filter.compareDocumentPosition(view.document.getElementById('skills')!) & view.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(view.status(), 'fixture · 6 skills');
  assert.equal(view.names().length, 6);
  view.type('MPS');
  assert.deepEqual(view.names(), ['mps-aspect-generator', 'mps-tests']);
  assert.equal(view.status(), 'fixture · 2 of 6 skills');
  view.type('repository commit');
  assert.deepEqual(view.names(), ['commits']);
  view.type('kotlin');
  assert.deepEqual(view.names(), ['code-style']);
  view.type('');
  assert.equal(view.names().length, 6);
  assert.equal(view.status(), 'fixture · 6 skills');
  assert.deepEqual(view.scans, [`/api/scan?repository=${encodeURIComponent(FIXTURE)}`]);
});

test('the page: typing updates the address; the selected skill stays shown only while it matches', async () => {
  const view = await filterPage(`repository=${encodeURIComponent(FIXTURE)}`);
  assert.equal(view.shown(), 'code-style');
  view.type('style');
  assert.equal(view.shown(), 'code-style');
  const address = new URL(view.window.location.href).searchParams;
  assert.equal(address.get('repository'), FIXTURE);
  assert.equal(address.get('filter'), 'style');
  view.type('mps');
  assert.equal(view.shown(), null);
  view.type('');
  assert.equal(new URL(view.window.location.href).searchParams.get('filter'), null);
});

test('the page: ?filter=<words> fills the field on load and filters the scan', async () => {
  const view = await filterPage(`repository=${encodeURIComponent(FIXTURE)}&filter=${encodeURIComponent('Test')}`);
  assert.equal(view.filter.value, 'Test');
  assert.deepEqual(view.names(), ['mps-tests']);
  assert.equal(view.status(), 'fixture · 1 of 6 skills');
  // The first match is shown, not a skill the filter hides.
  assert.equal(view.shown(), 'mps-tests');
  assert.equal(view.empty(), null);
});

test('the page: no match → no skills match "<words>"', async () => {
  const view = await filterPage(`repository=${encodeURIComponent(FIXTURE)}`);
  view.type('  no-such   skill ');
  assert.deepEqual(view.names(), []);
  assert.equal(view.status(), 'fixture · 0 of 6 skills');
  assert.equal(view.empty(), 'no skills match "no-such skill"');
  assert.equal(view.shown(), null);
  view.type('lint');
  assert.equal(view.empty(), null);
  assert.deepEqual(view.names(), ['writing-lint-checks']);
});

test('the page: the arrow keys skip the skills the filter hides', async () => {
  const view = await filterPage(`repository=${encodeURIComponent(FIXTURE)}&filter=repository`);
  // commits and writing-lint-checks match; mps-aspect-generator, mps-tests and release-checklist between them do not.
  assert.deepEqual(view.names(), ['commits', 'writing-lint-checks']);
  const items = [...view.document.querySelectorAll<HTMLElement>('#skills li')];
  const named = (name: string) => items.find((item) => item.querySelector('.name')!.firstChild!.textContent === name)!;
  const press = (key: string) =>
    (view.document.activeElement as HTMLElement).dispatchEvent(new view.window.KeyboardEvent('keydown', { key, bubbles: true }));
  named('commits').focus();
  press('ArrowDown');
  assert.equal(view.document.activeElement, named('writing-lint-checks'));
  press('ArrowUp');
  assert.equal(view.document.activeElement, named('commits'));
});
