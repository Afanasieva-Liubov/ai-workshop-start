# address-review: a manual-qa comment on the PR can report bugs the PR did not cause
Task: review of #43, 2026-11-27

- The manual-qa comment on #43 listed a blocking fail (stray `null` lines in the web view, `src/web.html`)
  that predates the PR. It asks for no change to this PR: replied out of scope and suggested its own issue.
- A QA-script-only fix (`qa/*.md`) has no test to write first: no test reads `qa/`. Reproduce the step instead.
