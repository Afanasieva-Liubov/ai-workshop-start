#!/usr/bin/env node
// The Node client: a GitHub repository, or each of an organization's, through the GitHub API, or a
// local directory; stdout and stderr, or the local web view. Nothing is stored.
import { run } from './commands.ts';
import { openGitHub, openOwner, parseGitHubUrl } from './core/github.ts';
import { openDirectory } from './local.ts';
import { serve } from './web.ts';

const token = process.env.GITHUB_TOKEN || undefined;

const open = (input: string) => (parseGitHubUrl(input) ? openGitHub(input, { fetch, token }) : openDirectory(input));

process.exitCode = await run(process.argv.slice(2), {
  open,
  openOwner: (input) => openOwner(input, { fetch, token }),
  print: (text) => console.log(text),
  error: (text) => console.error(text),
  // The process stays up while the server listens.
  serve: async (port) => (await serve({ open, port })).url,
});
