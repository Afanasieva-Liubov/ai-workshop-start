// Runs the commands the way the CLI does, with GitHub answering from EXAMPLE and JETBRAINS_EXAMPLE below.
import { fileURLToPath } from 'node:url';
import { run } from '../src/commands.ts';
import { openGitHub, openOwner, parseGitHubUrl } from '../src/core/github.ts';
import { replay, type Recording } from '../src/core/replay.ts';
import { openDirectory } from '../src/local.ts';

export const FIXTURE = fileURLToPath(new URL('../fixture', import.meta.url));
export const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

/** The commit GitHub answers for JetBrains/example. */
export const EXAMPLE_COMMIT = '5ab6270ab772d113e8ad52ebfcaa0109c522ae00';

/** What GitHub answers for a small repository, JetBrains/example, with one skill. */
const EXAMPLE: Recording = {
  'https://api.github.com/repos/JetBrains/example': { status: 200, body: { full_name: 'JetBrains/example', default_branch: 'main' } },
  'https://api.github.com/repos/JetBrains/example/commits/main': { status: 200, body: { sha: EXAMPLE_COMMIT } },
  'https://api.github.com/search/code?q=filename:SKILL.md+repo:JetBrains/example&per_page=100&page=1': {
    status: 200,
    body: { total_count: 1, items: [{ path: '.claude/skills/commits/SKILL.md' }] },
  },
  [`https://raw.githubusercontent.com/JetBrains/example/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`]: {
    status: 200,
    body: '---\nname: commits\ndescription: Write commit messages the way this repository does. Use for every commit.\n---\n# Commits\n',
  },
};

/** A SKILL.md with this name and description. */
export const skillText = (name: string, description = `The ${name} skill.`) => `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n`;

/** The SKILL.md that JetBrains-example/alpha and JetBrains-example/beta both have, byte for byte. */
export const SHARED_SKILL = skillText('shared', 'The same skill in two repositories.');

/** The commit GitHub answers for each repository of JetBrains-example. */
export const OWNER_COMMIT = 'c0ffee0000000000000000000000000000000000';

/** What GitHub answers for one repository found through the owner's code search: its info, its commit, its files. */
function ownedRepository(id: string, files: Record<string, string>): Recording {
  return {
    [`https://api.github.com/repos/${id}`]: { status: 200, body: { full_name: id, default_branch: 'main' } },
    [`https://api.github.com/repos/${id}/commits/main`]: { status: 200, body: { sha: OWNER_COMMIT } },
    ...Object.fromEntries(
      Object.entries(files).map(([path, text]) => [`https://raw.githubusercontent.com/${id}/${OWNER_COMMIT}/${path}`, { status: 200, body: text }]),
    ),
  };
}

const repo = (name: string, extra: { fork?: boolean; archived?: boolean } = {}) => ({
  full_name: `JetBrains-example/${name}`,
  fork: false,
  archived: false,
  ...extra,
});
const found = (name: string, path: string) => ({ path, repository: { full_name: `JetBrains-example/${name}` } });

/**
 * What GitHub answers for an organization, JetBrains-example: `alpha` (2 skills), `beta` (1), `empty` (0),
 * `old` (archived) and `forked` (a fork), each with a skill, and `broken`, whose skill the search lists
 * but whose repository answers 500.
 */
const JETBRAINS_EXAMPLE: Recording = {
  'https://api.github.com/users/JetBrains-example': { status: 200, body: { login: 'JetBrains-example', type: 'Organization' } },
  'https://api.github.com/orgs/JetBrains-example/repos?type=all&per_page=100&page=1': {
    status: 200,
    body: [repo('beta'), repo('old', { archived: true }), repo('alpha'), repo('forked', { fork: true }), repo('empty'), repo('broken')],
  },
  'https://api.github.com/search/code?q=filename:SKILL.md+user:JetBrains-example&per_page=100&page=1': {
    status: 200,
    body: {
      total_count: 6,
      items: [
        found('beta', '.claude/skills/shared/SKILL.md'),
        found('alpha', '.agents/skills/deploy/SKILL.md'),
        found('alpha', '.agents/skills/shared/SKILL.md'),
        found('old', '.claude/skills/legacy/SKILL.md'),
        found('forked', '.claude/skills/borrowed/SKILL.md'),
        found('broken', '.claude/skills/lost/SKILL.md'),
      ],
    },
  },
  ...ownedRepository('JetBrains-example/alpha', {
    '.agents/skills/deploy/SKILL.md': skillText('deploy', 'Deploy the service. Then check it.'),
    '.agents/skills/shared/SKILL.md': SHARED_SKILL,
  }),
  ...ownedRepository('JetBrains-example/beta', { '.claude/skills/shared/SKILL.md': SHARED_SKILL }),
  'https://api.github.com/repos/JetBrains-example/broken': { status: 500, body: { message: 'Server Error' } },
};

const github = replay({ ...EXAMPLE, ...JETBRAINS_EXAMPLE });

/** Opens what the CLI would: GitHub answering from EXAMPLE, with a token, through code search; or a directory. */
export const open = (input: string, fetch = github) =>
  parseGitHubUrl(input) ? openGitHub(input, { fetch, token: 'test' }) : openDirectory(input);

/** `skill-atlas <args>`, as the CLI runs it, with GitHub answering from EXAMPLE, JETBRAINS_EXAMPLE and `more`. */
export async function atlas(args: string[], more: Recording = {}) {
  const fetch = Object.keys(more).length > 0 ? replay({ ...EXAMPLE, ...JETBRAINS_EXAMPLE, ...more }) : github;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await run(args, {
    open: (input) => open(input, fetch),
    openOwner: (input) => openOwner(input, { fetch, token: 'test' }),
    print: (text) => stdout.push(text),
    error: (text) => stderr.push(text),
  });
  return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}
