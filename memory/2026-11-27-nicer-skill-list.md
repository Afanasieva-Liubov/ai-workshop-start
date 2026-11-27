# "Make the skill list nicer" (#42): answered on Slack with one letter, and what the CLI layout touches
Task: #42, 2026-11-27

- Slack worked in this run (token on the allowlist, slack.com reachable); the answer came in ~5 min, just
  "A": offer options concrete enough that a letter is a full spec (here: columns, bold on a TTY, blank lines).
- A change to the CLI's output also changes `e2e/expected` (`UPDATE_EXPECTED=1`), the `qa/` samples, the README,
  the demo tests' CLI screenshots (`npx playwright test --update-snapshots=changed` keeps the rest) and filter.mp4.
- Bold on a real terminal in `node --test`: `script -qec "<cmd>" /dev/null` gives the CLI a TTY (util-linux,
  Linux only); output comes back with `\r\n`. ttyd in the demo tests is a TTY too: xterm's `getCell(x).isBold()`.
