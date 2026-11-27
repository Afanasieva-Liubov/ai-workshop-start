# A case a fixture count would break: test it on a temporary or a stage repository, and two bugs left open
Task: #49, 2026-11-27

- A new filter case (a Greek skill) went into a temporary directory in `tests/` and a `./greek` repository written by
  `docs/demo/stage.mjs`, not into `fixture/`: a 7th fixture skill changes `6 skills` in many tests and every demo screenshot.
- `npm run test:e2e` here: `GitHub rate limit reached` for all 3 tests even with `GITHUB_TOKEN` set, on `main` too.
- The demo screenshots made in the Air sandbox (Chrome stable `.deb`, DejaVu from npm) matched the committed ones: 11/11.
- Seen, not fixed (out of scope): the web view shows `nullnull` under the link of a skill with no copies and not in
  the product (`replaceChildren` in `show()` gets the `null`s); the bold Greek name in the list falls back to a serif font.
