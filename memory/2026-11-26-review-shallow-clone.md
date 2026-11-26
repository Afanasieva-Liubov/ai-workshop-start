# In a review run, `git diff main...HEAD` fails: the clone has no `main`
Task: #28, 2026-11-26

- The checkout is shallow and has only the PR branch. `git diff main...HEAD` fails (unknown revision), and
  after `git fetch origin main` it fails with "no merge base". Use `gh pr diff <n>` (or `--name-only`).
- `git show HEAD` is no substitute: in this fork the branch's single commit holds the whole repository.
