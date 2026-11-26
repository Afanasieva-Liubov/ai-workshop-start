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
  Work on the PR's own branch; do not create a new one.

## The feedback
Collect what is not yet answered:
- Reviews and PR comments: `gh pr view <pr> --json reviews,comments`
- Inline comments: `gh api repos/{owner}/{repo}/pulls/<pr>/comments`; which threads are resolved or
  outdated: `gh api graphql` on `pullRequest(number: <pr>) { reviewThreads(first: 100) { nodes {
  isResolved isOutdated comments(first: 1) { nodes { databaseId } } } } }`
- CI: `gh pr checks <pr>`; a red check → `gh run view <run> --log-failed`

A comment is answered if you (or the earlier session) already replied to it and nothing came after.
A resolved or outdated thread counts as answered: skip it, with no reply.

Do not check minor problems: reply that it is minor; change nothing; list it as skipped in the
summary.

For each comment:
- **Take it**: when you open the comment, reply in its thread that you are taking it (e.g. "Taking
  this one"), before you start work on it, so the reviewer knows it is being handled.
- **Reproduce it first** (the command, input or test it names). Not reproducible → reply with what
  you ran and what you saw; change nothing.
- **Valid** → fix it as [issue-to-pr](../issue-to-pr/SKILL.md) says: spec first, a test that fails
  before the fix, the smallest code change.
- **Contradicts the spec or the issue, or unclear** → do not guess: reply with the question.
- **Skip it, and say why in its thread** (do not guess, change nothing) when it:
  - is ambiguous;
  - conflicts with another comment (name the other one);
  - asks a question rather than for a change;
  - would need a design decision.
- **Out of scope** → reply so, and suggest a separate issue.

Only change what the review asks for: no refactors, no reformatting, no unrelated fixes.

## Done
- The same checks as [issue-to-pr](../issue-to-pr/SKILL.md): `npm run typecheck`, `npm test`,
  `./skill-atlas scan ./fixture` exits 0, `npm run test:e2e` if `GITHUB_TOKEN` is set.
- Commit: `<what changed> (review of #<pr>)`; `git push` to the PR's branch. No force-push, no
  rewriting history.
- Reply to each comment you handled: inline ones in their thread
  (`gh api repos/{owner}/{repo}/pulls/<pr>/comments/<id>/replies -f body=...`), others with
  `gh pr comment <pr>`: what changed and the commit, or why nothing did.
- Watch CI (`gh pr checks <pr> --watch`). Red → fix it; done only when green.
- Then one summary comment on the PR (`gh pr comment <pr>`), and the same summary in the run output:
  - each comment addressed, and how (the commit);
  - each comment skipped, and why (minor ones too: "minor");
  - the results of the checks above.
- Last, one comment on the PR, with exactly this text and nothing else:
  `gh pr comment <pr> --body "address-review FINISHED"`. Also when nothing needed a change.
- Do not merge, close or approve the PR, and do not resolve the reviewer's threads for them.
