// spec/web.md, checked on the real server: the page, and the scan behind it for ./fixture and for
// a small GitHub repository answered in tests/helpers.ts.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
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
  const bad = spawnSync(process.execPath, [CLI, 'serve', 'eighty'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr, 'Usage: skill-atlas serve [port]\n');
});

test('skill-atlas serve on a port in use → a clear message, exit code 1', () => {
  const port = new URL(url).port;
  const busy = spawnSync(process.execPath, [CLI, 'serve', port], { encoding: 'utf8' });
  assert.equal(busy.status, 1);
  assert.equal(busy.stderr, `Port ${port} is in use; try another: skill-atlas serve <port>\n`);
});
