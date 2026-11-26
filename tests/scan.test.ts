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
import { openGitHub, openOwner, parseGitHubOwnerUrl, parseGitHubUrl } from '../src/core/github.ts';
import { parseSkill } from '../src/core/parse.ts';
import { replay } from '../src/core/replay.ts';
import { scan } from '../src/core/scan.ts';
import { run } from '../src/commands.ts';
import { atlas, CLI, EXAMPLE_COMMIT, FIXTURE, open, OWNER_COMMIT, SHARED_SKILL, skillText } from './helpers.ts';

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
      'commits — Write commit messages the way this repository does.',
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
      "code-style — Follow the project's code style.",
      `  ${root}/.github/skills/code-style/SKILL.md`,
      'commits — Write commit messages the way this repository does.',
      `  ${root}/.claude/skills/commits/SKILL.md`,
      'mps-aspect-generator — Generate an MPS language aspect.',
      `  ${root}/plugins/mcp-tools/resources/skills/mps-aspect-generator/SKILL.md`,
      '  part of the product: plugins/mcp-tools/resources',
      'mps-tests — Run the MPS tests for the module you changed.',
      `  ${root}/.agents/skills/mps-tests/SKILL.md`,
      '  also in .claude/skills/mps-tests/SKILL.md',
      'release-checklist',
      `  ${root}/.agents/skills/release-checklist/SKILL.md`,
      'writing-lint-checks — Write a lint check the way this repository does.',
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
  assert.match(fixture.stdout, /^writing-lint-checks — /m);
});

test('part of the product: a skill under resources → a skill, marked as part of the product', async () => {
  const path = 'plugins/mcp-tools/resources/META-INF/skills/mps-aspect-generator/SKILL.md';
  const result = await scanEdges({ [path]: skill('mps-aspect-generator') });
  assert.deepEqual(
    result.skills.map((s) => [s.name, s.path, s.product]),
    [['mps-aspect-generator', path, 'plugins/mcp-tools/resources']],
  );
  assert.match(fixture.stdout, /^mps-aspect-generator — .*\n.*\n {2}part of the product: plugins\/mcp-tools\/resources$/m);
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

// An organization or a user, github.com/<owner>: spec/cli.md and spec/analysis.md.
const organization = await atlas(['scan', 'github.com/JetBrains-example']);
const ownerLink = (repo: string, path: string) => `https://github.com/JetBrains-example/${repo}/blob/${OWNER_COMMIT}/${path}`;

test('an organization: one section per repository with skills, sorted by name, then the total', () => {
  assert.equal(organization.code, 0, organization.stderr);
  assert.equal(
    organization.stdout,
    [
      'JetBrains-example/alpha · 2 skills',
      'deploy — Deploy the service.',
      `  ${ownerLink('alpha', '.agents/skills/deploy/SKILL.md')}`,
      'shared — The same skill in two repositories.',
      `  ${ownerLink('alpha', '.agents/skills/shared/SKILL.md')}`,
      'JetBrains-example/beta · 1 skill',
      'shared — The same skill in two repositories.',
      `  ${ownerLink('beta', '.claude/skills/shared/SKILL.md')}`,
      'JetBrains-example · 3 skills in 2 repositories',
    ].join('\n'),
  );
});

test('an organization: forks, archived repositories and repositories without skills are not printed', () => {
  assert.doesNotMatch(organization.stdout, /JetBrains-example\/(?:old|forked|empty)|legacy|borrowed/);
  // Not even asked for: a request for them is not recorded, and would be a warning.
  assert.doesNotMatch(organization.stderr, /old|forked|empty/);
});

test('an organization: a repository that fails → a warning on stderr, the scan goes on, exit code 0', () => {
  assert.equal(organization.code, 0);
  assert.equal(
    organization.stderr,
    'warning: JetBrains-example/broken: GitHub answered 500 for https://api.github.com/repos/JetBrains-example/broken: Server Error',
  );
});

test('an organization: identical skills in different repositories stay separate, no `also in`', () => {
  assert.equal(organization.stdout.match(/^shared — /gm)?.length, 2);
  assert.doesNotMatch(organization.stdout, /also in/);
});

test('github.com/<owner>: the same scheme, www. and trailing slash rules as a repository URL', () => {
  for (const input of ['github.com/JetBrains-example', 'https://github.com/JetBrains-example/', 'http://www.github.com/JetBrains-example']) {
    assert.deepEqual(parseGitHubOwnerUrl(input), { owner: 'JetBrains-example' }, input);
    assert.equal(parseGitHubUrl(input), undefined, input);
  }
  assert.equal(parseGitHubOwnerUrl('github.com/JetBrains/example'), undefined);
  assert.equal(parseGitHubOwnerUrl('gitlab.com/JetBrains'), undefined);
});

test("a user, with someone else's token: listed through /users/<user>/repos, page after page until one has fewer than 100", async () => {
  const id = (n: number) => `someone/repo-${String(n).padStart(3, '0')}`;
  // 100 forks on the first page; the one repository of their own is on the second.
  const forks = Array.from({ length: 100 }, (_, n) => ({ full_name: id(n), fork: true, archived: false }));
  const user = await atlas(['scan', 'https://github.com/someone/'], {
    'https://api.github.com/users/someone': { status: 200, body: { login: 'someone', type: 'User' } },
    'https://api.github.com/user': { status: 200, body: { login: 'someone-else' } },
    'https://api.github.com/users/someone/repos?type=owner&per_page=100&page=1': { status: 200, body: forks },
    'https://api.github.com/users/someone/repos?type=owner&per_page=100&page=2': {
      status: 200,
      body: [{ full_name: 'someone/notes', fork: false, archived: false }],
    },
    'https://api.github.com/search/code?q=filename:SKILL.md+user:someone&per_page=100&page=1': {
      status: 200,
      body: { total_count: 2, items: [{ path: 'SKILL.md', repository: { full_name: 'someone/notes' } }, { path: 'SKILL.md', repository: { full_name: id(0) } }] },
    },
    'https://api.github.com/repos/someone/notes': { status: 200, body: { full_name: 'someone/notes', default_branch: 'main' } },
    'https://api.github.com/repos/someone/notes/commits/main': { status: 200, body: { sha: OWNER_COMMIT } },
    [`https://raw.githubusercontent.com/someone/notes/${OWNER_COMMIT}/SKILL.md`]: { status: 200, body: skillText('notes') },
  });
  assert.equal(user.code, 0, user.stderr);
  assert.equal(
    user.stdout,
    [
      'someone/notes · 1 skill',
      'notes — The notes skill.',
      `  https://github.com/someone/notes/blob/${OWNER_COMMIT}/SKILL.md`,
      'someone · 1 skill in 1 repository',
    ].join('\n'),
  );
  assert.equal(user.stderr, '');
});

test("a user, with their own token: their private repositories too, listed through /user/repos", async () => {
  const user = await atlas(['scan', 'github.com/Me'], {
    'https://api.github.com/users/Me': { status: 200, body: { login: 'me', type: 'User' } },
    // The login is compared without case, as GitHub compares it.
    'https://api.github.com/user': { status: 200, body: { login: 'ME' } },
    'https://api.github.com/user/repos?affiliation=owner&per_page=100&page=1': {
      status: 200,
      body: [
        { full_name: 'me/secret', fork: false, archived: false, private: true },
        { full_name: 'me/open', fork: false, archived: false, private: false },
      ],
    },
    'https://api.github.com/search/code?q=filename:SKILL.md+user:me&per_page=100&page=1': {
      status: 200,
      body: { total_count: 1, items: [{ path: '.claude/skills/hidden/SKILL.md', repository: { full_name: 'me/secret' } }] },
    },
    'https://api.github.com/repos/me/secret': { status: 200, body: { full_name: 'me/secret', default_branch: 'main' } },
    'https://api.github.com/repos/me/secret/commits/main': { status: 200, body: { sha: OWNER_COMMIT } },
    [`https://raw.githubusercontent.com/me/secret/${OWNER_COMMIT}/.claude/skills/hidden/SKILL.md`]: { status: 200, body: skillText('hidden') },
  });
  assert.equal(user.code, 0, user.stderr);
  assert.equal(
    user.stdout,
    [
      'me/secret · 1 skill',
      'hidden — The hidden skill.',
      `  https://github.com/me/secret/blob/${OWNER_COMMIT}/.claude/skills/hidden/SKILL.md`,
      'me · 1 skill in 1 repository',
    ].join('\n'),
  );
  assert.equal(user.stderr, '');
});

test('an organization with more than 1000 SKILL.md hits: each repository through its tree, none left out', async () => {
  const tree = (paths: string[]) => ({ status: 200, body: { truncated: false, tree: paths.map((path) => ({ path, mode: '100644', type: 'blob', sha: path })) } });
  const repository = (name: string, paths: string[]) => ({
    [`https://api.github.com/repos/big-org/${name}`]: { status: 200, body: { full_name: `big-org/${name}`, default_branch: 'main' } },
    [`https://api.github.com/repos/big-org/${name}/commits/main`]: { status: 200, body: { sha: OWNER_COMMIT } },
    [`https://api.github.com/repos/big-org/${name}/git/trees/${OWNER_COMMIT}?recursive=1`]: tree(paths),
  });
  const hits = Array.from({ length: 100 }, (_, n) => ({ path: `skills/s${n}/SKILL.md`, repository: { full_name: 'big-org/big' } }));
  const scanned = await atlas(['scan', 'github.com/big-org'], {
    'https://api.github.com/users/big-org': { status: 200, body: { login: 'big-org', type: 'Organization' } },
    'https://api.github.com/orgs/big-org/repos?type=all&per_page=100&page=1': {
      status: 200,
      body: [
        { full_name: 'big-org/big', fork: false, archived: false },
        { full_name: 'big-org/small', fork: false, archived: false },
      ],
    },
    // Code search returns at most 1000 of these 1200: `small` is past them. No more pages are asked for,
    // and no search of each repository: that would hit the search's own rate limit.
    'https://api.github.com/search/code?q=filename:SKILL.md+user:big-org&per_page=100&page=1': {
      status: 200,
      body: { total_count: 1200, incomplete_results: false, items: hits },
    },
    ...repository('big', ['README.md', 'skills/s0/SKILL.md']),
    ...repository('small', ['.claude/skills/tiny/SKILL.md']),
    [`https://raw.githubusercontent.com/big-org/big/${OWNER_COMMIT}/skills/s0/SKILL.md`]: { status: 200, body: skillText('s0') },
    [`https://raw.githubusercontent.com/big-org/small/${OWNER_COMMIT}/.claude/skills/tiny/SKILL.md`]: { status: 200, body: skillText('tiny') },
  });
  assert.equal(scanned.code, 0, scanned.stderr);
  assert.equal(scanned.stderr, '');
  assert.equal(
    scanned.stdout,
    [
      'big-org/big · 1 skill',
      's0 — The s0 skill.',
      `  https://github.com/big-org/big/blob/${OWNER_COMMIT}/skills/s0/SKILL.md`,
      'big-org/small · 1 skill',
      'tiny — The tiny skill.',
      `  https://github.com/big-org/small/blob/${OWNER_COMMIT}/.claude/skills/tiny/SKILL.md`,
      'big-org · 2 skills in 2 repositories',
    ].join('\n'),
  );
});

test('without a token: each repository of the organization through its tree, no code search', async () => {
  const tree = (paths: string[]) => ({ status: 200, body: { truncated: false, tree: paths.map((path) => ({ path, mode: '100644', type: 'blob', sha: path })) } });
  const raw = (repo: string, path: string) => `https://raw.githubusercontent.com/JetBrains-example/${repo}/${OWNER_COMMIT}/${path}`;
  const repository = (name: string) => ({
    [`https://api.github.com/repos/JetBrains-example/${name}`]: { status: 200, body: { full_name: `JetBrains-example/${name}`, default_branch: 'main' } },
    [`https://api.github.com/repos/JetBrains-example/${name}/commits/main`]: { status: 200, body: { sha: OWNER_COMMIT } },
  });
  const fetch = replay({
    'https://api.github.com/users/JetBrains-example': { status: 200, body: { login: 'JetBrains-example', type: 'Organization' } },
    'https://api.github.com/orgs/JetBrains-example/repos?type=all&per_page=100&page=1': {
      status: 200,
      body: [
        { full_name: 'JetBrains-example/beta', fork: false, archived: false },
        { full_name: 'JetBrains-example/alpha', fork: false, archived: false },
        { full_name: 'JetBrains-example/old', fork: false, archived: true },
      ],
    },
    ...repository('alpha'),
    ...repository('beta'),
    [`https://api.github.com/repos/JetBrains-example/alpha/git/trees/${OWNER_COMMIT}?recursive=1`]: tree(['README.md', '.agents/skills/shared/SKILL.md']),
    [`https://api.github.com/repos/JetBrains-example/beta/git/trees/${OWNER_COMMIT}?recursive=1`]: tree(['README.md']),
    [raw('alpha', '.agents/skills/shared/SKILL.md')]: { status: 200, body: SHARED_SKILL },
  });
  const owner = await openOwner('github.com/JetBrains-example', { fetch });
  assert.equal(owner.name, 'JetBrains-example');
  assert.deepEqual(owner.repositories.map((r) => r.id), ['JetBrains-example/alpha', 'JetBrains-example/beta']);
  const results = await Promise.all(owner.repositories.map(async (r) => scan(await r.open())));
  assert.deepEqual(results.map((r) => [r.repository.id, r.skills.map((s) => s.path)]), [
    ['JetBrains-example/alpha', ['.agents/skills/shared/SKILL.md']],
    ['JetBrains-example/beta', []],
  ]);
});

test('an organization or a user that does not exist → a clear message, exit code 1', async () => {
  const missing = await atlas(['scan', 'github.com/no-such-owner'], {
    'https://api.github.com/users/no-such-owner': { status: 404, body: { message: 'Not Found' } },
  });
  assert.equal(missing.code, 1);
  assert.equal(missing.stdout, '');
  assert.equal(missing.stderr, 'Organization or user not found: https://github.com/no-such-owner');
});

test('rate limit on the repository list → the rate-limit message, exit code 1', async () => {
  const limited = await atlas(['scan', 'github.com/busy'], {
    'https://api.github.com/users/busy': { status: 200, body: { login: 'busy', type: 'Organization' } },
    'https://api.github.com/orgs/busy/repos?type=all&per_page=100&page=1': {
      status: 403,
      body: { message: 'API rate limit exceeded for user ID 1.' },
    },
  });
  assert.equal(limited.code, 1);
  assert.equal(limited.stdout, '');
  assert.equal(limited.stderr, 'GitHub rate limit reached; try again in a minute');
});

test('a repository URL and a directory print exactly what they did before, with organizations supported', async () => {
  // The same commands with no way to open an organization: the output does not change.
  const without = async (args: string[]) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await run(args, { open: (input) => open(input), print: (t) => stdout.push(t), error: (t) => stderr.push(t) });
    return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  };
  assert.deepEqual(await without(['scan', 'github.com/JetBrains/example']), example);
  assert.deepEqual(await without(['scan', FIXTURE]), fixture);
  assert.doesNotMatch(example.stdout + fixture.stdout, / in \d+ repositor/);
});
