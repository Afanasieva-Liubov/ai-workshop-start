# A merge of main changes the demo test count in docs/demo/README.md
Task: #53, 2026-11-27

- `docs/demo/README.md` shows the output of `npm run test:demo` (`N passed (time)`). Neither side of a merge
  updates it for the other's new specs: after #47 + #49 it was 19, the README said 13. Check it with
  `npx playwright test --list | tail -1` after every merge that brings in a demo spec.
- A fresh environment has no Chrome and no ttyd: every demo test fails with
  `Chromium distribution 'chrome' is not found`. `npx playwright install --with-deps chrome` and
  `sudo apt-get install -y ttyd ffmpeg` fix it; then 19 pass in 1.3m, with and without `CI=1`.
