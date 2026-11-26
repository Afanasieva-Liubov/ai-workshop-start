---
name: update-memory
description: Add a note to memory/ with what a task learned, for the next agent that works in this repository. Use at the end of every task, or when asked to remember something.
---

# Update memory

[memory/](../../../memory/README.md) is the shared memory of the agents of this repository: one short
note for each task, with what it learned. The next agent searches it before it starts.

## When
At the end of a task, before the last commit: the note goes in the same commit, branch and pull
request as the work. A task that ends with no change (declined, nothing to do) still learned
something: add the note if there is one worth keeping, and say where it went.

## What to write
Only what the next agent cannot see in the code, the spec, the skills or the git history:
- a trap you fell into, and how you got out (a command that fails here, and the one that works)
- a fact about the environment (a tool that is missing, a token that is not set, a slow step)
- a decision the issue or the review left open, and what you chose and why

Not the diff, not a summary of the pull request, not what [spec/](../../../spec/) or
[AGENTS.md](../../../AGENTS.md) already says. Nothing learned → no note.
Never a secret: no token, no password, no private URL.

## The note
A new file, `memory/<yyyy-mm-dd>-<short-slug>.md`; do not edit or delete the notes of other tasks.

```markdown
# <what was learned, in one line>
Task: #<issue or PR>, <yyyy-mm-dd>

- <the fact, the trap or the decision; and why it matters>
```

Short lines, a few bullets at most. One note for each task; a second thing learned is a second bullet.

## Never reviewed
The notes are not reviewed: a [code review](../code-review/SKILL.md) skips `memory/`.
Do not ask for a review of a note, and do not hold a pull request back for one.
