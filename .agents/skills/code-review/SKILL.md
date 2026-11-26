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
Then the inline comments — nothing else.

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

## Skip
- Style nits the code already follows elsewhere
- Comments you cannot reproduce: check first, or leave them out
