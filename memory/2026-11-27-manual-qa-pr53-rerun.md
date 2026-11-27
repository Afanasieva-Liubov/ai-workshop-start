# Manual QA rerun of PR #53: same result; to wait for a slow CLI command, watch for the prompt in screen()
Task: PR #53 (manual QA, "Ready to Merge" label), 2026-11-27

- To wait for a slow command (the GitHub scan), poll until `screen()` ends with `\n$`. `translateToString(true)`
  trims the prompt's trailing space, so a check for `"$ "` never matches and times out.
- `qa/web-filter.md` case 5 opens an address that already has a filter: the first `li` is hidden, so wait for
  `#skills li:not([hidden])`, not for `#skills li`.
- Result at `a1b0c0e`: the same as at `be612bf`. 26 passed; only web-view case 3 failed (`null`, blocking). Chrome and ffmpeg
  had to be installed again, and `npx playwright install ffmpeg` downloaded fine.
