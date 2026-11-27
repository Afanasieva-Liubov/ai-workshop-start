# serve on a port below 1024 (#50): the wording chosen, and tests that need a closed port
Task: #50, 2026-11-27

- The issue left the message open: chosen `Port 80 is not allowed for this user; try another: skill-atlas serve <port>`,
  the in-use message's form. Only `EACCES` is mapped; other `listen` errors still throw as before, not guessed.
- Port 80 is closed both here (user `workspace`) and on CI's `ubuntu-latest` (`ip_unprivileged_port_start` 1024):
  the tests ran in both. They probe port 80 first and skip where it opens (root, a lower start).
- `npm run test:e2e` here: `GitHub rate limit reached` even with `GITHUB_TOKEN` set, on main too; CI's passes.
- The recorder always starts `serve 4173`: a video or demo test of the in-use case needs no server of its own.
