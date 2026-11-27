# The recorder's web view scans from `/tmp/skill-atlas-stage`: `.` there finds no skills
Task: #46 (review), 2026-11-27

- `stage.mjs` starts `node src/cli.ts serve 4173` in `/tmp/skill-atlas-stage`, whose entries are links; the scan
  does not follow them, so `?repository=.` gives `skill-atlas-stage` with 0 skills (7 from the checkout root).
  A relative path typed in a recorded video means the stage, not the checkout.
- To try the stage server without the recorder: `node -e "import('./docs/demo/stage.mjs')"` creates the stage.
