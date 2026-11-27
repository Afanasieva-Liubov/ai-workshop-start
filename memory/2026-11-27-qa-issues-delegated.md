# Manual QA issues are labeled `Delegated to AI`
Task: manual-qa skill change, 2026-11-27

- Decision: every issue manual-qa files (product bug or wrong script) gets `Delegated to AI`, so
  issue-to-pr picks it up; "not run" cases (no network, no token) get no issue. The label already
  exists in the GitHub repo.
