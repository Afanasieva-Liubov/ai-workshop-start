# A re-review after a memory-only push: read the manual QA comment, it can hold a defect of the PR
Task: review of #43, 2026-11-27

- The push that triggered this review held only a `memory/` note, but the manual-qa comment on the PR reported
  a fail in a QA script the PR itself added (`qa/cli-scan.md` case 4). Reproduced, commented inline, and the
  `Ready to Merge` label an earlier review added was removed (`gh pr edit <n> --remove-label`).
- `git diff <before>..<after>` from the push event fails in the shallow clone; `gh pr diff <n>` works.
