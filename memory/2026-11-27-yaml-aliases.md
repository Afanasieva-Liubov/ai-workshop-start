# 100 YAML aliases: a warning, not a higher limit; the web view's `null` text; the demo's own data
Task: #48, 2026-11-27

- The issue allowed "listed" or "at worst, a warning". Chosen: keep the `yaml` package's `maxAliasCount` (100, a
  YAML bomb guard) and turn what `document.toJS()` throws into the malformed front matter warning.
- A case outside ./fixture for a video: `docs/demo/stage.mjs` writes `/tmp/skill-atlas-stage/aliases` when it loads.
  Adding it to ./fixture would change the `· 6 skills` output, many tests and every web screenshot baseline.
- Seen, out of scope: the web view's detail shows `null` / `nullnull` (in `show()`, `replaceChildren` stringifies
  the `null` of a missing description, copies or product). It is in the baselines already (`web-scanned-linux.png`);
  a fix will change those screenshots.
- The e2e tests hit "GitHub rate limit reached" here even with `GITHUB_TOKEN`: its core limit was used up
  (`gh api rate_limit`); it resets within the hour.
