---
name: issue-to-pr
description: Implement a GitHub issue of this repository with its spec and integration tests, and open a pull request for it. Use when an issue is labeled "Delegated to AI", or when asked to implement, fix or pick up an issue.
---

# Issue to pull request

## The issue
Usually an automation starts you when an issue is labeled **Delegated to AI**; that issue is the one.
- Given a number or a link (or the trigger's issue): `gh issue view <n> --comments`.
- Given none: the oldest open issue labeled `Delegated to AI` with no linked pull request
  (`gh issue list --state open --label "Delegated to AI" --search "-linked:pr sort:created-asc" --limit 1`).
  None → stop and say so; do not invent work.
- Not labeled `Delegated to AI`, closed, or already has an open PR → stop: it is not yours, or it is done.
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
- Comment on the issue with the PR link (`gh issue comment <n> --body "<pr url>"`).
- Do not merge.

## After the pull request
Stay in the same session **for an hour**, and check the PR **every few minutes** (about 5):
- `gh pr view <pr> --json state,reviewDecision,comments,reviews` and
  `gh api repos/{owner}/{repo}/pulls/<pr>/comments` for inline comments; `gh pr checks <pr>` for CI.
- New review comments or a red CI → handle them as [address-review](../address-review/SKILL.md) says,
  on the same branch, then keep checking. **Claim each one first**
  ([Claim before you answer](../address-review/SKILL.md#claim-before-you-answer)): the address-review
  automation may already be running on the same PR; whatever it claimed is not yours.
- Merged or closed → delete the PR's claims, then stop.
- After the hour, stop: Air cannot continue a finished session; later reviews are picked up by a
  separate automation that follows [address-review](../address-review/SKILL.md). Before you stop,
  delete any claim you made but did not answer, so that automation picks it up.
