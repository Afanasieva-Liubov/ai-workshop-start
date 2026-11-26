---
name: address-review
description: Address the review comments and failing CI of an open pull request in this repository, on its branch, and reply to each comment. Use when a pull request opened for a "Delegated to AI" issue gets a review, a comment or a red CI, or when asked to address review feedback.
---

# Address review

## The pull request
Usually an automation starts you when a PR gets a review, a comment or a red CI; that PR is the one.
The [issue-to-pr](../issue-to-pr/SKILL.md) session watches its own PR for the first hour; after
that it has finished, and Air cannot continue it, so this is a new session.
- Given a number or a link (or the trigger's PR): `gh pr view <pr> --comments`.
- Given none: the open PRs whose issue is labeled `Delegated to AI` and that have unanswered review
  comments or a red CI. None → stop and say so; do not invent work.
- Closed, merged, or not linked to a `Delegated to AI` issue (`Closes #<n>` in the body) → stop:
  it is not yours.

## Before you start
- Read [spec/](../../../spec/), [AGENTS.md](../../../AGENTS.md) and the linked issue
  (`gh issue view <n> --comments`).
- `gh pr checkout <pr>`, `npm ci`, then `npm test`: note what already fails.

## The feedback
Collect what is not yet answered:
- Reviews and PR comments: `gh pr view <pr> --json reviews,comments`
- Inline comments: `gh api repos/{owner}/{repo}/pulls/<pr>/comments`
- CI: `gh pr checks <pr>`; a red check → `gh run view <run> --log-failed`

A comment is answered if you (or the earlier session) already replied to it and nothing came after.

Do not check minor problems.

For each comment:
- **Take it**: when you open the comment, reply in its thread that you are taking it (e.g. "Taking
  this one"), before you start work on it, so the reviewer knows it is being handled.
- **Reproduce it first** (the command, input or test it names). Not reproducible → reply with what
  you ran and what you saw; change nothing.
- **Valid** → fix it as [issue-to-pr](../issue-to-pr/SKILL.md) says: spec first, a test that fails
  before the fix, the smallest code change.
- **Contradicts the spec or the issue, or unclear** → do not guess: reply with the question.
- **Out of scope** → reply so, and suggest a separate issue.

## Done
- The same checks as [issue-to-pr](../issue-to-pr/SKILL.md): `npm run typecheck`, `npm test`,
  `./skill-atlas scan ./fixture` exits 0, `npm run test:e2e` if `GITHUB_TOKEN` is set.
- Commit: `<what changed> (review of #<pr>)`; `git push` to the PR's branch. No force-push.
- Reply to each comment you handled: inline ones in their thread
  (`gh api repos/{owner}/{repo}/pulls/<pr>/comments/<id>/replies -f body=...`), others with
  `gh pr comment <pr>`: what changed and the commit, or why nothing did.
- Watch CI (`gh pr checks <pr> --watch`). Red → fix it; done only when green.
- Do not merge, do not approve, do not resolve the reviewer's threads for them.
