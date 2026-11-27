# Manual QA issues: blocking failures only, labeled `Delegated to AI`
Task: manual-qa skill change, 2026-11-27

- Decision: manual-qa files a GitHub issue only for a blocking failure (step cannot be done, result
  wrong or missing), labeled `Delegated to AI` so issue-to-pr picks it up. Non-blocking (cosmetic)
  failures and "not run" cases get no issue. Unsure → blocking. The label exists in the GitHub repo.
