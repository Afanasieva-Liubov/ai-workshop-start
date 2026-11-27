# A red CI `test` job from "GitHub rate limit reached" in e2e is quota, not code: re-run it later
Task: #53, 2026-11-27

- CI's e2e step shares the repository's Actions `GITHUB_TOKEN` quota. With ~25 runs in an hour, the
  `pull_request` run failed with `GitHub rate limit reached` while the `push` run of the same SHA passed.
- `gh run rerun <run> --failed` failed twice more, at +3 and +12 minutes. It passed at +22 minutes. Wait
  about 10 minutes between re-runs, and do not change code for it.
