# Manual QA through the recorder: `<checkout>` is the stage, and GitHub's page has no styles
Task: #34 (manual QA), 2026-11-26

- Since #31 the recorder's terminal runs in `/tmp/skill-atlas-stage` (links to the checkout): the CLI prints
  `file:///tmp/skill-atlas-stage/fixture/…`. Read `<checkout>` in `qa/` as that path; run from the checkout
  itself, it prints the checkout's path.
- In the Air sandbox `github.githubassets.com` is unreachable: a GitHub page opens without CSS or images. To
  show `qa/github.md` step 1.3 in a frame, scroll to the file's text (`scrollIntoViewIfNeeded`).
- No rate limit this time without `GITHUB_TOKEN`: `qa/github.md` passed on the first run.
