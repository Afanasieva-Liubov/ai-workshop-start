# Scan an organization

See every skill of a GitHub organization (or user) at once, not repository by repository.

## Spec
### Input
`./skill-atlas scan https://github.com/<owner>` — an organization or a user, no repository
### Output
- Every **public, non-archived, non-fork** repository of the owner, each scanned at its *default branch*
  like a single repository (the same find, parse, duplicates, product and test-data rules)
- Repositories sorted by **name**; each as today: `<owner>/<repo> · N skills`, then its skills;
  a repository with no skills is left out
- First line: `<owner> · N skills in M repositories (K scanned)`
- A repository that fails (unreachable, too large, rate limit) → a *warning* naming it, the scan goes on;
  every repository failing → exit code 1
- Owner not found → `Organization or user not found: https://github.com/<owner>`, exit code 1
### Limits
- **GitHub API**, no clone; repositories listed page by page, *never cut short*
- Repositories scanned concurrently, at most a few at a time; with `GITHUB_TOKEN`, code search
  (`org:<owner> filename:SKILL.md`) may find the candidate repositories first
- *Under 60 s* for JetBrains
### Web view
- The same field accepts `https://github.com/<owner>`; the skills grouped by repository, with its count
- `GET /api/scan?repository=https://github.com/<owner>` → `{ owner, repositories: [<the single-repository scan>…], warnings }`

## Examples
```console
$ ./skill-atlas scan https://github.com/JetBrains
JetBrains · 180 skills in 12 repositories (240 scanned)
JetBrains/android · 4 skills
…
$ ./skill-atlas scan https://github.com/no-such-owner-xyz
Organization or user not found: https://github.com/no-such-owner-xyz
```

## Tests
Integration tests with a replayed GitHub API (`src/core/replay.ts`): an owner of three repositories —
one with skills, one without, one failing → two scanned, one warning, exit 0; paging of the repository list;
archived and fork repositories skipped; all failing → exit 1; owner not found → exit 1; the web view's grouping.
End-to-end: a small real organization at fixed commits, in `e2e/expected/`.
