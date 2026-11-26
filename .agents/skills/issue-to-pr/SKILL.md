---
name: issue-to-pr
description: Implement a GitHub issue of this repository with its spec and integration tests, and open a pull request for it. Use when asked to implement, fix or pick up an issue, or when an automation hands you one.
---

# Issue to pull request

## The issue
- Given a number or a link: `gh issue view <n> --comments`.
- Given none: the oldest open issue with no linked pull request and no assignee
  (`gh issue list --state open --search "no:assignee -linked:pr sort:created-asc" --limit 1`).
  None → stop and say so; do not invent work.
- Unclear, or asks for something the [spec](../../../spec/) contradicts → do not guess: comment
  on the issue with the question (`gh issue comment`) and stop.

## Before you start
- Read [spec/](../../../spec/) and [AGENTS.md](../../../AGENTS.md).
- `npm ci`, then `npm test`: note what already fails, so you do not take the blame for it, or hide it.
- From an up-to-date `main`: `git switch -c issue-<n>-<short-slug>`.

## The change
1. **Spec first.** Update `spec/` for the new or changed behaviour, in its style: short lines, the
   case and its example path. A bug the spec already covers needs no spec change.
2. **Test.** An integration test in `tests/` for every case the issue adds or touches, using
   [fixture/](../../../fixture/README.md) (extend it if a case is missing). It must fail before the fix.
3. **Code.** The smallest change that makes it pass. Core stays fetch → find → parse; the CLI and
   the web view stay thin clients.
4. **Done** when all of these pass:
   - `npm run typecheck`
   - `npm test`
   - `./skill-atlas scan ./fixture` exits 0
   - `npm run test:e2e` if `GITHUB_TOKEN` is set; if the output changes on purpose, update
     `e2e/expected` with `UPDATE_EXPECTED=1` and say why in the PR.

Stay in scope: no unrelated refactors or drive-by fixes; note them in the PR instead.

## The pull request
- Commit: `<what changed> (#<n>)`.
- `git push -u origin HEAD`, then `gh pr create --base main`:
  - **Title**: what the user gets, not the file names.
  - **Body**: `Closes #<n>`; a few sentences on what and why; the spec cases added or changed;
    the tests that cover them; how to check it by hand (a `./skill-atlas` command and its output).
- Watch CI (`gh pr checks --watch`). Red → fix it on the branch; a PR is ready only when green.
- Do not merge.
