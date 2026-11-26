import { AtlasError } from './errors.ts';
import type { Source } from './scan.ts';

/** The part of `fetch` the core uses, so tests and the browser can pass their own. */
export type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

export type GitHubOptions = {
  fetch: Fetch;
  /** With a token, skills are found through code search; without it, through the tree. */
  token?: string;
  /** The files that may be skills, when they are already known (an organization's code search): no search of its own. */
  paths?: string[];
  /** Listed through the tree even with a token: an organization's code search was cut short, and one search per repository would hit its rate limit. */
  tree?: boolean;
};

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';

/**
 * `https://github.com/owner/repo`, with or without the scheme, a trailing slash or `.git`;
 * `…/tree/<ref>` scans a commit, a branch or a tag instead of the default branch.
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string; ref?: string } | undefined {
  const match = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^?#]+?))?\/?$/i.exec(input.trim());
  if (!match) return undefined;
  return { owner: match[1], repo: match[2], ...(match[3] && { ref: match[3] }) };
}

/** `https://github.com/<owner>`, an organization or a user, by the same rules as `parseGitHubUrl`. */
export function parseGitHubOwnerUrl(input: string): { owner: string } | undefined {
  const match = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/?$/i.exec(input.trim());
  return match ? { owner: match[1] } : undefined;
}

/** A repository of an organization or a user, to be opened when it is scanned. */
export type OwnedRepository = { id: string; open(): Promise<Source> };

/** An organization or a user, and its repositories to scan, sorted by name. */
export type Owner = { name: string; repositories: OwnedRepository[] };

/**
 * Lists an organization's or a user's repositories, forks and archived ones left out. With a token,
 * one code search over the owner finds the skills, and only the repositories it names are scanned;
 * without one, each repository is listed through its tree.
 */
export async function openOwner(input: string, options: GitHubOptions): Promise<Owner> {
  const name = parseGitHubOwnerUrl(input);
  if (!name) throw new AtlasError(`Not a GitHub organization or user URL: ${input}`);
  // All the repositories share one limit on requests at a time, not one each.
  const shared: GitHubOptions = { fetch: limitConcurrency(options.fetch, CONCURRENT_REQUESTS), token: options.token };
  const github = client(shared);
  const { login, repositories } = await listRepositories(github, name.owner);
  const found = options.token ? await searchOwnerPaths(github, login) : undefined;
  // Without the owner's search, or with one cut short, each repository is listed through its tree.
  const tree = !found;
  const scanned = found ? repositories.filter((id) => found.has(id.toLowerCase())) : repositories;
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const sorted = [...scanned].sort((a, b) => compare(a.toLowerCase(), b.toLowerCase()) || compare(a, b));
  return {
    name: login,
    repositories: sorted.map((id) => ({
      id,
      open: () => openGitHub(`https://github.com/${id}`, { ...shared, ...(found ? { paths: found.get(id.toLowerCase()) } : { tree }) }),
    })),
  };
}

/** `owner/repo` of every repository that is neither a fork nor archived, 100 a page. */
async function listRepositories(github: Client, owner: string): Promise<{ login: string; repositories: string[] }> {
  const { login, type } = await github.json<{ login: string; type: string }>(
    `${API}/users/${encodeURIComponent(owner)}`,
    `Organization or user not found: https://github.com/${owner}`,
  );
  const list =
    type === 'Organization'
      ? `${API}/orgs/${login}/repos?type=all`
      : // `/users/<user>/repos` lists only public repositories; the user's own token sees the private ones too.
        (await isAuthenticatedUser(github, login))
        ? `${API}/user/repos?affiliation=owner`
        : `${API}/users/${login}/repos?type=owner`;
  const repositories: string[] = [];
  for (let page = 1; ; page++) {
    const items = await github.json<{ full_name: string; fork: boolean; archived: boolean }[]>(`${list}&per_page=100&page=${page}`);
    for (const item of items) if (!item.fork && !item.archived) repositories.push(item.full_name);
    if (items.length < 100) return { login, repositories };
  }
}

/** Whether the token belongs to this user. Without a token, or with one that `/user` turns away (an app's), it does not. */
async function isAuthenticatedUser(github: Client, login: string): Promise<boolean> {
  if (!github.authenticated) return false;
  try {
    const user = await github.json<{ login: string }>(`${API}/user`);
    return user.login.toLowerCase() === login.toLowerCase();
  } catch (error) {
    if (error instanceof AtlasError) return false;
    throw error;
  }
}

/**
 * One code search over the whole owner: the files that may be skills, by lowercased `owner/repo`.
 * Undefined when GitHub cannot return them all (more than its 1000 results, or an incomplete answer).
 */
async function searchOwnerPaths(github: Client, owner: string): Promise<Map<string, string[]> | undefined> {
  const found = new Map<string, Set<string>>(); // pages can repeat a result
  // GitHub returns at most 1000 results: ten pages.
  for (let page = 1; page <= 10; page++) {
    const result = await github.json<{
      total_count: number;
      incomplete_results?: boolean;
      items: { path: string; repository: { full_name: string } }[];
    }>(`${API}/search/code?q=filename:SKILL.md+user:${owner}&per_page=100&page=${page}`);
    if (result.total_count > 1000 || result.incomplete_results) return undefined;
    for (const item of result.items) {
      const id = item.repository.full_name.toLowerCase();
      found.set(id, (found.get(id) ?? new Set()).add(item.path));
    }
    if (result.items.length < 100 || page * 100 >= result.total_count) break;
  }
  return new Map([...found].map(([id, paths]) => [id, [...paths]]));
}

/** Resolves the ref, or the default branch, to a commit and lists the files that may be skills. */
export async function openGitHub(input: string, options: GitHubOptions): Promise<Source> {
  const name = parseGitHubUrl(input);
  if (!name) throw new AtlasError(`Not a GitHub repository URL: ${input}`);
  const github = client(options);
  const info = await github.json<{ full_name: string; default_branch: string }>(
    `${API}/repos/${name.owner}/${name.repo}`,
    `Repository not found: https://github.com/${name.owner}/${name.repo}`,
  );
  const id = info.full_name;
  const { sha } = await github.json<{ sha: string }>(
    `${API}/repos/${id}/commits/${encodePath(name.ref ?? info.default_branch)}`,
    `Not found in https://github.com/${id}: ${name.ref ?? info.default_branch}`,
  );
  // Code search sees only the default branch as it is now, so a ref is listed through its tree.
  const paths =
    options.paths && !name.ref
      ? options.paths
      : options.token && !options.tree && !name.ref
        ? await searchPaths(github, id)
        : await treePaths(github, id, sha);
  const [organization, repo] = id.split('/');
  return {
    repository: { id, organization, name: repo, url: `https://github.com/${id}`, commit: sha },
    paths,
    warnings: [],
    read: (path) => github.raw(`${RAW}/${id}/${sha}/${encodePath(path)}`),
  };
}

/** Code search looks at the whole default branch, 100 results a page. */
async function searchPaths(github: Client, id: string): Promise<string[]> {
  const paths = new Set<string>(); // pages can repeat a result
  // GitHub returns at most 1000 results: ten pages.
  for (let page = 1; page <= 10; page++) {
    const result = await github.json<{ total_count: number; items: { path: string }[] }>(
      `${API}/search/code?q=filename:SKILL.md+repo:${id}&per_page=100&page=${page}`,
    );
    for (const item of result.items) paths.add(item.path);
    if (result.items.length < 100 || page * 100 >= result.total_count) break;
  }
  return [...paths];
}

type Tree = { truncated: boolean; tree: { path: string; mode: string; type: string; sha: string }[] };

/**
 * The whole tree at once. GitHub cuts a large one short: then each directory is asked for
 * on its own, and so on down, until every answer is whole.
 */
async function treePaths(github: Client, id: string, sha: string, prefix = ''): Promise<string[]> {
  const whole = await github.json<Tree>(`${API}/repos/${id}/git/trees/${sha}?recursive=1`);
  if (!whole.truncated) return files(whole).map((path) => prefix + path);
  const level = await github.json<Tree>(`${API}/repos/${id}/git/trees/${sha}`);
  const directories = level.tree.filter((item) => item.type === 'tree');
  const below = await Promise.all(directories.map((item) => treePaths(github, id, item.sha, `${prefix}${item.path}/`)));
  return [...files(level).map((path) => prefix + path), ...below.flat()];
}

/** Regular files only: a symbolic link's content is its target, not a SKILL.md. */
function files(tree: Tree): string[] {
  return tree.tree.filter((item) => item.type === 'blob' && item.mode !== '120000').map((item) => item.path);
}

type Client = ReturnType<typeof client>;

const CONCURRENT_REQUESTS = 8;

/** At most `limit` requests at a time: GitHub turns away too many at once (its secondary rate limit). */
function limitConcurrency(fetch: Fetch, limit: number): Fetch {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async (url, init) => {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await fetch(url, init);
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}

function client({ fetch, token }: GitHubOptions) {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const answers = new Map<string, Promise<unknown>>(); // the root tree is asked for once per skill root
  const limited = limitConcurrency(fetch, CONCURRENT_REQUESTS);

  async function get(url: string, init?: { headers: Record<string, string> }): Promise<Response> {
    try {
      return await limited(url, init);
    } catch (error) {
      throw new AtlasError(`Cannot reach GitHub: ${describe(error)}`);
    }
  }

  async function request(url: string, notFound: string): Promise<unknown> {
    const response = await get(url, { headers });
    if (response.ok) return response.json();
    const body: unknown = await response.json().catch(() => undefined);
    const message = (body as { message?: unknown } | undefined)?.message;
    const text = typeof message === 'string' ? message : '';
    if (response.status === 404) throw new AtlasError(notFound);
    if ((response.status === 403 || response.status === 429) && /rate limit/i.test(text)) {
      throw new AtlasError(`GitHub rate limit reached; ${token ? 'try again in a minute' : 'set GITHUB_TOKEN'}`);
    }
    if (response.status === 401) throw new AtlasError('GitHub rejected the token in GITHUB_TOKEN');
    throw new AtlasError(`GitHub answered ${response.status} for ${url}${text && `: ${text}`}`);
  }

  return {
    /** Whether the requests carry a token. */
    authenticated: Boolean(token),
    /** A GitHub API answer; `notFound` explains a 404. */
    json<T>(url: string, notFound = `Not found on GitHub: ${url}`): Promise<T> {
      if (!answers.has(url)) answers.set(url, request(url, notFound));
      return answers.get(url) as Promise<T>;
    },
    /** A file's bytes at the scanned commit, or undefined if it is not there. */
    async raw(url: string): Promise<Uint8Array | undefined> {
      const response = await get(url);
      if (response.status === 404) return undefined;
      if (!response.ok) throw new AtlasError(`GitHub answered ${response.status} for ${url}`);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}
