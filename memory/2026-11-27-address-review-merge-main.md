# Updating a PR branch from `main` here: unshallow first, and merge, do not rebase
Task: #53, 2026-11-27

- `origin/main` is fetched shallow (1 commit): `git merge-tree` and `git merge` say "refusing to merge unrelated
  histories". `git fetch --unshallow origin main` first; then the conflicts are the real ones.
- A conflict comment from Code Review was fixed with a merge commit (`git merge origin/main`), not a rebase:
  address-review forbids rewriting the PR branch's history.
- Two PRs that both move the demo's terminal helpers to `tests/demo/terminal.ts` differ only in its header
  comment: take `main`'s. The docs conflicts (`docs/demo/README.md`, `spec/analysis.md`) are lists: keep both.
- `npm run test:demo` needs Chrome (`apt-get install -y /tmp/chrome.deb` fails once on `fonts-liberation`;
  `apt-get update`, then again) and ffmpeg linked as in manual-qa-setup.md.
