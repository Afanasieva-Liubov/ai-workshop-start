# Manual QA in an Air run: Chrome and ffmpeg are missing, GitHub is rate-limited
Task: #28 (manual QA), 2026-11-26

- No Chrome, no ffmpeg, no `wget`: `apt-get install ffmpeg`; Chrome with
  `curl -sSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb && sudo apt-get install -y /tmp/chrome.deb`.
  `npx playwright install ffmpeg` fails; link the system one into `~/.cache/ms-playwright/ffmpeg-1013/ffmpeg-linux`.
- No `GITHUB_TOKEN`, and the shared IP's limit is used up: `qa/github.md` hits the rate limit on some
  commands and not others. Run it twice; each case passed in one of the runs.
- The step's `at` runs 2–3 s ahead of the video late in a long recording: look at a frame or two earlier.
- In the web view, wait for `#skills li:not([hidden])` after a filter: the first `li` may be hidden.
