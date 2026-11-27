// The decisions in spec/analysis.md and spec/cli.md, checked on what the real command prints for
// ./fixture and for a small GitHub repository answered in tests/helpers.ts. The edge cases of
// where skills live are yours to add.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { openGitHub } from '../src/core/github.ts';
import { parseSkill } from '../src/core/parse.ts';
import { replay } from '../src/core/replay.ts';
import { scan } from '../src/core/scan.ts';
import { atlas, CLI, EXAMPLE_COMMIT, FIXTURE } from './helpers.ts';

const fixture = await atlas(['scan', FIXTURE]);
const example = await atlas(['scan', 'github.com/JetBrains/example']);

test('malformed front matter → the directory name, no description and a warning', () => {
  const parsed = parseSkill(readFileSync(join(FIXTURE, '.agents/skills/release-checklist/SKILL.md'), 'utf8'));
  assert.equal(parsed.name, undefined);
  assert.equal(parsed.description, '');
  assert.equal(
    parsed.warning,
    'malformed front matter: Nested mappings are not allowed in compact mappings at line 3, column 14; using the directory name',
  );
});

test('scan prints the repository, then each skill with its first sentence and pinned link', () => {
  assert.equal(example.code, 0, example.stderr);
  assert.equal(
    example.stdout,
    [
      'JetBrains/example · 1 skill',
      '',
      'commits  Write commit messages the way this repository does.',
      `  https://github.com/JetBrains/example/blob/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`,
    ].join('\n'),
  );
});

test('./fixture: every skill, sorted by name, linked to its file, with a warning for the malformed one', () => {
  const root = pathToFileURL(FIXTURE).href;
  assert.equal(fixture.code, 0);
  assert.equal(
    fixture.stdout,
    [
      'fixture · 6 skills',
      '',
      "code-style            Follow the project's code style.",
      `  ${root}/.github/skills/code-style/SKILL.md`,
      '',
      'commits               Write commit messages the way this repository does.',
      `  ${root}/.claude/skills/commits/SKILL.md`,
      '',
      'mps-aspect-generator  Generate an MPS language aspect.',
      `  ${root}/plugins/mcp-tools/resources/skills/mps-aspect-generator/SKILL.md`,
      '  part of the product: plugins/mcp-tools/resources',
      '',
      'mps-tests             Run the MPS tests for the module you changed.',
      `  ${root}/.agents/skills/mps-tests/SKILL.md`,
      '  also in .claude/skills/mps-tests/SKILL.md',
      '',
      'release-checklist',
      `  ${root}/.agents/skills/release-checklist/SKILL.md`,
      '',
      'writing-lint-checks   Write a lint check the way this repository does.',
      `  ${root}/agent/skills/writing-lint-checks/SKILL.md`,
    ].join('\n'),
  );
  assert.match(fixture.stderr, /^warning: \.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter: /);
});

test('the CLI prints the result at once and stores nothing', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'skill-atlas-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const scanned = spawnSync(process.execPath, [CLI, 'scan', FIXTURE], { cwd, encoding: 'utf8' });
  assert.equal(scanned.status, 0, scanned.stderr);
  assert.equal(scanned.stdout, `${fixture.stdout}\n`);
  assert.deepEqual(readdirSync(cwd), []);
});

test('unreachable repository → a clear message, exit code 1', async () => {
  const missing = spawnSync(process.execPath, [CLI, 'scan', join(FIXTURE, 'no-such-directory')], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /^Not a GitHub URL or a readable directory: .*no-such-directory\n$/);

  // What GitHub answers for a repository that does not exist.
  const notFound = replay({ 'https://api.github.com/repos/JetBrains/no-such-repository': { status: 404, body: { message: 'Not Found' } } });
  await assert.rejects(openGitHub('https://github.com/JetBrains/no-such-repository', { fetch: notFound }), {
    message: 'Repository not found: https://github.com/JetBrains/no-such-repository',
  });

  const offline = await atlas(['scan', 'https://github.com/JetBrains/not-answered']);
  assert.equal(offline.code, 1);
  assert.match(offline.stderr, /^Cannot reach GitHub: not recorded: https:\/\/api\.github\.com\/repos\/JetBrains\/not-answered$/);
});

test('rate limit → a message that asks for GITHUB_TOKEN', async () => {
  const limited = replay({
    'https://api.github.com/repos/JetBrains/MPS': {
      status: 403,
      body: { message: 'API rate limit exceeded for 192.0.2.1. (But here is the good news: ...)' },
    },
  });
  await assert.rejects(openGitHub('https://github.com/JetBrains/MPS', { fetch: limited }), {
    message: 'GitHub rate limit reached; set GITHUB_TOKEN',
  });
});

// The edge cases of where skills live: spec/analysis.md, "Edge cases".
const skill = (name: string) => `---\nname: ${name}\ndescription: The ${name} skill.\n---\n# ${name}\n`;

/** What GitHub answers for JetBrains/edges: one SKILL.md for each edge case, listed through the tree. */
function edges(files: Record<string, string>) {
  const raw = (path: string) => `https://raw.githubusercontent.com/JetBrains/edges/${EXAMPLE_COMMIT}/${path}`;
  return replay({
    'https://api.github.com/repos/JetBrains/edges': { status: 200, body: { full_name: 'JetBrains/edges', default_branch: 'main' } },
    'https://api.github.com/repos/JetBrains/edges/commits/main': { status: 200, body: { sha: EXAMPLE_COMMIT } },
    [`https://api.github.com/repos/JetBrains/edges/git/trees/${EXAMPLE_COMMIT}?recursive=1`]: {
      status: 200,
      body: { truncated: false, tree: Object.keys(files).map((path) => ({ path, mode: '100644', type: 'blob', sha: path })) },
    },
    ...Object.fromEntries(Object.entries(files).map(([path, text]) => [raw(path), { status: 200, body: text }])),
  });
}

async function scanEdges(files: Record<string, string>) {
  return scan(await openGitHub('https://github.com/JetBrains/edges', { fetch: edges(files) }));
}

test('duplicates: identical files in .agents and .claude → one skill, the .agents one, with the other as a copy', async () => {
  const result = await scanEdges({
    '.claude/skills/mps-tests/SKILL.md': skill('mps-tests'),
    '.agents/skills/mps-tests/SKILL.md': skill('mps-tests'),
  });
  assert.deepEqual(
    result.skills.map((s) => [s.path, s.copies]),
    [['.agents/skills/mps-tests/SKILL.md', ['.claude/skills/mps-tests/SKILL.md']]],
  );
  assert.match(fixture.stdout, /^ {2}also in \.claude\/skills\/mps-tests\/SKILL\.md$/m);
});

test('duplicates: different files with the same name → separate skills', async () => {
  const result = await scanEdges({
    '.agents/skills/mps-tests/SKILL.md': skill('mps-tests'),
    '.claude/skills/mps-tests/SKILL.md': `${skill('mps-tests')}Changed.\n`,
  });
  assert.deepEqual(
    result.skills.map((s) => [s.path, s.copies]),
    [
      ['.agents/skills/mps-tests/SKILL.md', []],
      ['.claude/skills/mps-tests/SKILL.md', []],
    ],
  );
});

test('duplicates: identical files of different names → separate skills', async () => {
  const result = await scanEdges({
    '.agents/skills/alpha/SKILL.md': '# TODO\n',
    '.agents/skills/beta/SKILL.md': '# TODO\n',
  });
  assert.deepEqual(
    result.skills.map((s) => [s.name, s.copies]),
    [
      ['alpha', []],
      ['beta', []],
    ],
  );
});

test('an unusual folder: agent/skills → a skill like any other', async () => {
  const result = await scanEdges({ 'agent/skills/writing-lint-checks/SKILL.md': skill('writing-lint-checks') });
  assert.deepEqual(
    result.skills.map((s) => [s.name, s.path, s.product]),
    [['writing-lint-checks', 'agent/skills/writing-lint-checks/SKILL.md', undefined]],
  );
  assert.match(fixture.stdout, /^writing-lint-checks {3}Write a lint check/m);
});

test('part of the product: a skill under resources → a skill, marked as part of the product', async () => {
  const path = 'plugins/mcp-tools/resources/META-INF/skills/mps-aspect-generator/SKILL.md';
  const result = await scanEdges({ [path]: skill('mps-aspect-generator') });
  assert.deepEqual(
    result.skills.map((s) => [s.name, s.path, s.product]),
    [['mps-aspect-generator', path, 'plugins/mcp-tools/resources']],
  );
  assert.match(fixture.stdout, /^mps-aspect-generator {2}.*\n.*\n {2}part of the product: plugins\/mcp-tools\/resources$/m);
});

test('test data: a SKILL.md among the tests → not a skill, skipped without a warning', async () => {
  const result = await scanEdges({
    'integration-tests/src/jvmTest/resources/skills/weather-retrieval/SKILL.md': skill('weather-retrieval'),
    'core/src/test/resources/skills/a/SKILL.md': skill('a'),
    'core/testData/skills/b/SKILL.md': skill('b'),
    'docs/fixtures/skills/c/SKILL.md': skill('c'),
    'lib/src/androidUnitTest/resources/skills/d/SKILL.md': skill('d'),
    'lib/src/iosX64Test/resources/skills/e/SKILL.md': skill('e'),
    'latest/skills/kept/SKILL.md': skill('kept'),
    '.claude/skills/tests/SKILL.md': skill('tests'),
    '.agents/skills/loadTest/SKILL.md': skill('loadTest'),
  });
  assert.deepEqual(
    result.skills.map((s) => s.path),
    ['latest/skills/kept/SKILL.md', '.agents/skills/loadTest/SKILL.md', '.claude/skills/tests/SKILL.md'],
  );
  assert.deepEqual(result.warnings, []);
  assert.doesNotMatch(fixture.stdout, /weather-retrieval/);
});

// A fixed commit, and a tree too large for one answer: spec/analysis.md, "Details".
const COMMIT = '1111111111111111111111111111111111111111';
const blob = (path: string) => ({ path, mode: '100644', type: 'blob', sha: path });
const dir = (path: string, sha: string) => ({ path, mode: '040000', type: 'tree', sha });

/** What GitHub answers for JetBrains/large at COMMIT: a root tree too large to list at once. */
const large = replay({
  'https://api.github.com/repos/JetBrains/large': { status: 200, body: { full_name: 'JetBrains/large', default_branch: 'main' } },
  [`https://api.github.com/repos/JetBrains/large/commits/${COMMIT}`]: { status: 200, body: { sha: COMMIT } },
  [`https://api.github.com/repos/JetBrains/large/git/trees/${COMMIT}?recursive=1`]: { status: 200, body: { truncated: true, tree: [] } },
  [`https://api.github.com/repos/JetBrains/large/git/trees/${COMMIT}`]: {
    status: 200,
    body: { truncated: false, tree: [blob('SKILL.md'), dir('agent', 'agent-sha'), dir('plugins', 'plugins-sha')] },
  },
  'https://api.github.com/repos/JetBrains/large/git/trees/agent-sha?recursive=1': {
    status: 200,
    body: { truncated: false, tree: [dir('skills', 's'), blob('skills/writing-lint-checks/SKILL.md')] },
  },
  // Still too large: one level further down.
  'https://api.github.com/repos/JetBrains/large/git/trees/plugins-sha?recursive=1': { status: 200, body: { truncated: true, tree: [] } },
  'https://api.github.com/repos/JetBrains/large/git/trees/plugins-sha': { status: 200, body: { truncated: false, tree: [dir('mcp', 'mcp-sha')] } },
  'https://api.github.com/repos/JetBrains/large/git/trees/mcp-sha?recursive=1': {
    status: 200,
    body: { truncated: false, tree: [blob('resources/skills/mps-aspect-generator/SKILL.md')] },
  },
});

test('a fixed commit: /tree/<commit> scans that commit through its tree, even with a token; a large tree is walked whole', async () => {
  // With a token, as the CLI runs it: code search is not recorded, so using it would fail.
  const source = await openGitHub(`https://github.com/JetBrains/large/tree/${COMMIT}`, { fetch: large, token: 'test' });
  assert.equal(source.repository.commit, COMMIT);
  assert.deepEqual(source.paths.sort(), [
    'SKILL.md',
    'agent/skills/writing-lint-checks/SKILL.md',
    'plugins/mcp/resources/skills/mps-aspect-generator/SKILL.md',
  ]);
  assert.deepEqual(source.warnings, []);
});

test('a fixed commit that does not exist → a clear message', async () => {
  await assert.rejects(openGitHub('github.com/JetBrains/large/tree/no-such-ref', { fetch: replay({
    'https://api.github.com/repos/JetBrains/large': { status: 200, body: { full_name: 'JetBrains/large', default_branch: 'main' } },
    'https://api.github.com/repos/JetBrains/large/commits/no-such-ref': { status: 404, body: { message: 'Not Found' } },
  }) }), { message: 'Not found in https://github.com/JetBrains/large: no-such-ref' });
});

// spec/cli.md, Filter: the words after the repository.
const filtered = async (...words: string[]) => atlas(['scan', FIXTURE, ...words]);
const names = (stdout: string) => stdout.split('\n').slice(1).filter((line) => line && !line.startsWith('  ')).map((line) => line.split(' ')[0]);

test('filter: one word → the skills whose name contains it, counted in the header', async () => {
  const { code, stdout } = await filtered('test');
  assert.equal(code, 0);
  const root = pathToFileURL(FIXTURE).href;
  assert.equal(
    stdout,
    [
      'fixture · 1 of 6 skills',
      '',
      'mps-tests  Run the MPS tests for the module you changed.',
      `  ${root}/.agents/skills/mps-tests/SKILL.md`,
      '  also in .claude/skills/mps-tests/SKILL.md',
    ].join('\n'),
  );
});

test('filter: two words → only the skills that contain both (AND), by name', async () => {
  assert.deepEqual(names((await filtered('repository')).stdout), ['commits', 'writing-lint-checks']);
  assert.deepEqual(names((await filtered('repository', 'commit')).stdout), ['commits']);
  // Two words in one argument are two words too.
  assert.deepEqual(names((await filtered('repository commit')).stdout), ['commits']);
});

test('filter: case-insensitive', async () => {
  const { stdout } = await filtered('MPS');
  assert.equal(stdout.split('\n')[0], 'fixture · 2 of 6 skills');
  assert.deepEqual(names(stdout), ['mps-aspect-generator', 'mps-tests']);
  assert.deepEqual(names((await filtered('Code-STYLE')).stdout), ['code-style']);
});

test('filter: a word in the description only, even past its first sentence', async () => {
  assert.deepEqual(names((await filtered('kotlin')).stdout), ['code-style']);
  assert.deepEqual(names((await filtered('push')).stdout), ['mps-tests']);
});

test('filter: no match → the header, then the message; exit code 0, warnings still on stderr', async () => {
  const { code, stdout, stderr } = await filtered('no-such', 'skill');
  assert.equal(code, 0);
  assert.equal(stdout, ['fixture · 0 of 6 skills', 'no skills match "no-such skill"'].join('\n'));
  assert.match(stderr, /^warning: \.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter: /);
});

test('filter: from the real CLI', () => {
  const scanned = spawnSync(process.execPath, [CLI, 'scan', FIXTURE, 'lint'], { encoding: 'utf8' });
  assert.equal(scanned.status, 0, scanned.stderr);
  assert.equal(scanned.stdout.split('\n')[0], 'fixture · 1 of 6 skills');
});

test('scan with no repository → the usage, with the words', async () => {
  const { code, stderr } = await atlas(['scan']);
  assert.equal(code, 1);
  assert.equal(stderr, 'Usage: skill-atlas scan <GitHub URL | directory> [words…]');
});

// spec/cli.md, Output: aligned columns, blank lines, bold names on a terminal.
test('output: the names padded to the longest one shown, two spaces, then the first sentence', async () => {
  const lines = (stdout: string) => stdout.split('\n').filter((line) => line && !line.startsWith('  ')).slice(1);
  // mps-aspect-generator is the longest of the two: 20 characters.
  assert.deepEqual(lines((await filtered('mps')).stdout), [
    'mps-aspect-generator  Generate an MPS language aspect.',
    'mps-tests             Run the MPS tests for the module you changed.',
  ]);
  // The width is that of the skills shown, not of every skill: writing-lint-checks, 19.
  assert.deepEqual(lines((await filtered('repository')).stdout), [
    'commits              Write commit messages the way this repository does.',
    'writing-lint-checks  Write a lint check the way this repository does.',
  ]);
});

test('output: a blank line after the header and between the skills; none in the no-match message', async () => {
  const [header, ...skills] = fixture.stdout.split('\n\n');
  assert.equal(header, 'fixture · 6 skills');
  assert.deepEqual(skills.map((block) => block.split('\n')[0].split(' ')[0]),
    ['code-style', 'commits', 'mps-aspect-generator', 'mps-tests', 'release-checklist', 'writing-lint-checks']);
  assert.ok(skills.every((block) => block.split('\n').slice(1).every((line) => line.startsWith('  '))));
  assert.doesNotMatch((await filtered('nothing')).stdout, /\n\n/);
});

/** The real CLI on a terminal: `script` gives it one. */
const onTerminal = (args: string[], env: Record<string, string> = {}) => {
  const command = [process.execPath, CLI, ...args].map((arg) => `'${arg}'`).join(' ');
  const { NO_COLOR, ...rest } = process.env;
  const result = spawnSync('script', ['-qec', `${command} 2>/dev/null`, '/dev/null'], { encoding: 'utf8', env: { ...rest, ...env } });
  return { status: result.status, stdout: result.stdout.replace(/\r\n/g, '\n') };
};
const terminal = process.platform === 'linux' ? false : 'needs util-linux script for a terminal';

test('output: on a terminal, the names in bold, still aligned', { skip: terminal }, () => {
  const { status, stdout } = onTerminal(['scan', FIXTURE, 'mps']);
  assert.equal(status, 0);
  assert.match(stdout, /^\x1b\[1mmps-aspect-generator\x1b\[22m {2}Generate an MPS language aspect\.$/m);
  assert.match(stdout, /^\x1b\[1mmps-tests\x1b\[22m {13}Run the MPS tests/m);
  // Only the names: the header and the links stay plain.
  assert.match(stdout, /^fixture · 2 of 6 skills$/m);
  assert.match(stdout, /^ {2}file:\/\/\S+\/SKILL\.md$/m);
});

test('output: NO_COLOR on a terminal → plain names', { skip: terminal }, () => {
  const { status, stdout } = onTerminal(['scan', FIXTURE, 'mps'], { NO_COLOR: '1' });
  assert.equal(status, 0);
  assert.doesNotMatch(stdout, /\x1b/);
  assert.match(stdout, /^mps-aspect-generator {2}Generate/m);
});

test('output: piped → plain text, no escape codes', () => {
  const scanned = spawnSync(process.execPath, [CLI, 'scan', FIXTURE], { encoding: 'utf8' });
  assert.equal(scanned.status, 0, scanned.stderr);
  assert.doesNotMatch(scanned.stdout, /\x1b/);
  assert.equal(scanned.stdout, `${fixture.stdout}\n`);
});
