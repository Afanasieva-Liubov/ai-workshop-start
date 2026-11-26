# `gh issue view <n> --comments` prints nothing in an Air run
Task: #27, 2026-11-26

- With no terminal it exits 0 and prints nothing: the issue looks empty, but it is not.
  Use `gh issue view <n> --json title,body,state,labels,comments` instead.
- `./skill-atlas scan ./fixture` warns about `release-checklist` (malformed front matter): that is
  a fixture case on purpose, not a failure; it still exits 0.
- "Never review these notes" (#27) was read as: a code review skips `memory/`.
