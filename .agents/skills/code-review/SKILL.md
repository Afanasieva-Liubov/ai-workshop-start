---
name: code-review
description: Review a change in this repository with a short summary and inline comments, each with where and how to reproduce. Use when asked to review a diff, a branch or a pull request.
---

# Code review

## Before you start
- Read [spec/](../../../spec/) first: the change must match it, and the spec must be updated with the code.
- Read [AGENTS.md](../../../AGENTS.md): every case in the spec needs an integration test; `npm test` must pass.

## The review
**Short.** A few sentences at the top: what the change does, and whether it is ready.
Then the inline comments — nothing else. A [simple fix](#a-simple-fix) gets none; a pull request
with nothing broken gets the label [`Ready to Merge`](#ready-to-merge).

## Inline comments
One problem per comment, attached to the line it is about. Each comment has:
- **Where**: `path/to/file.ts:line`
- **What**: the problem in one sentence
- **How to reproduce**: the exact command, input or test that shows it, and what happens versus what should

```
src/find.ts:42
A skill under `src/test/resources` is listed: `test` is checked only as the last folder.
Reproduce: `./skill-atlas scan fixture` → `weather-retrieval` is printed; the spec says it is skipped.
```

## A simple fix
A simple fix (a typo, a rename, a one-line change) gets no inline comments: the short summary is
the whole review. If it breaks something, say so there, with how to reproduce.

## Ready to Merge
When the target is a pull request and nothing in it is broken (it matches the spec, `npm test`
passes, and you have no problem to report), add the label `Ready to Merge`:

```
gh pr edit <pr> --add-label "Ready to Merge"
```

- The label is missing in the repository → create it first: `gh label create "Ready to Merge"`.
- Something is broken → no label.
- The label is all: do not approve, do not merge.

## Finished
When the target is a pull request and this review adds no new inline comments (nothing broken, a
simple fix, or every problem already commented), end with one comment on the PR, with exactly this
text and nothing else:

```
gh pr comment <pr> --body "code-review FINISHED"
```

- New inline comments added → no `code-review FINISHED`: the review is not done until they are addressed.
- Not a pull request (a diff, a branch, a path) → no comment: there is no PR to put it on.

## Skip
- Style nits the code already follows elsewhere
- Comments you cannot reproduce: check first, or leave them out
- Notes in `memory/`: they are never reviewed ([update-memory](../update-memory/SKILL.md))
