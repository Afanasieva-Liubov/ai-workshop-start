---
name: demo-video
description: Record a short demo video of a feature of this repository, in the CLI, the web view or both, into docs/demo/, and attach it to the pull request. Use when a change is visible to the user, or when asked to record, re-record or attach a demo video.
---

# Demo video

A video shows the real thing: the real `./skill-atlas` in a real terminal
([ttyd](https://github.com/tsl0922/ttyd)) and the real `./skill-atlas serve`, driven by
[Playwright](https://playwright.dev) in Google Chrome; ffmpeg makes the MP4. Nothing staged, nothing edited.
[docs/demo/recorder.mjs](../../../docs/demo/recorder.mjs) is that plumbing;
[docs/demo/filter.mjs](../../../docs/demo/filter.mjs) is a finished video made with it.

## When
- The change is **visible to the user**: the CLI's output, a message, an exit code, the web view → a video.
- Nothing to see (a refactor, tests, the spec, docs, a skill) → no video; say so in the PR.
- The behaviour of an existing video changed → record that one again, do not add a second.
- Only what is on the branch and in the [spec](../../../spec/): a video shows cases, it does not invent them.

## Before you start
- `npm ci && npx playwright install ffmpeg`: `npm ci` brings Playwright and the demo's fonts
- `ttyd`, `ffmpeg` and Google Chrome on the machine; the ports 7681 and 4173 free. Missing → install
  them (`apt-get install ffmpeg`, the ttyd release binary, Chrome's `.deb`).
- `npx playwright install ffmpeg` cannot download → the system one works. The trial run fails with
  `Executable doesn't exist at ~/.cache/ms-playwright/ffmpeg-<version>/ffmpeg-linux`; that folder does not
  exist yet, so make it, then link:
  `mkdir -p ~/.cache/ms-playwright/ffmpeg-<version> && ln -s "$(which ffmpeg)" ~/.cache/ms-playwright/ffmpeg-<version>/ffmpeg-linux`
- Cannot be recorded here → no video; say in the PR what is missing. Never a mock-up instead.

## The script
`docs/demo/<name>.mjs`, named after the feature; it records `docs/demo/<name>.mp4`:

```js
import { fixture, record } from './recorder.mjs';

await record('<name>', async ({ page, wait, caption, terminal, run, web }) => {
  // the scenes, in order: the cases below
});
```

- Plan it from the spec: one scene per case, the common one first, then the edge cases.
- On [fixture/](../../../fixture/README.md): no network, the same output every time.
- **Under a minute**, about 3 s on each result; `page` is Playwright's, for anything the helpers lack.

## Cases
Ready to copy; each one is recorded as written.

**A title card**: first, and between the parts. The second line is HTML (`&amp;`).
```js
await caption('Skill Atlas · <the feature>', '<what the user gets, one line>');
```

**A CLI command and its output.** `terminal()` once, then `run(command, pause)`. `2>/dev/null` hides the
fixture's malformed `release-checklist` warning, there on purpose, when it would push the output off the
screen; `clear` before a long output.
```js
await terminal();
await run('./skill-atlas scan ./fixture mps 2>/dev/null', 3500);
await run('clear', 300);
```

**An error and its exit code.** Keep stderr: the message is the point.
```js
await run('./skill-atlas scan ./no-such-dir; echo "exit code $?"', 3500);
```

**The web view**: scan the fixture as a user would, wait for the result, then act. Type with a delay, so
it is seen.
```js
await web();
await page.locator('#repository').pressSequentially(fixture, { delay: 25 });
await page.click('#scan');
await page.waitForSelector('#skills li');
await wait(2000);
await page.locator('#skills li', { hasText: 'commits' }).click();
await wait(2000);
```

**State from the address**: what a link opens.
```js
await caption('?filter= in the address', '…/?repository=…/fixture&amp;filter=test');
await web({ repository: fixture, filter: 'test' });
await page.waitForSelector('#skills li:not([hidden])');
await wait(3000);
```

**The CLI and the web view**: a feature in both → one video, the CLI first, a title card, then the web
view: [filter.mjs](../../../docs/demo/filter.mjs).

## Record and check
- A trial run, to another path: `node docs/demo/<name>.mjs /tmp/<name>.mp4`
- **Look at it** before you keep it: `ffprobe` for the length, and a frame of each scene
  (`ffmpeg -ss <seconds> -i /tmp/<name>.mp4 -frames:v 1 /tmp/<seconds>.png`), read as an image. Cut off,
  scrolled away, or still typing when the scene ends → a longer pause, `clear`, or fewer lines.
- The real one: `node docs/demo/<name>.mjs` → `docs/demo/<name>.mp4`, about 0.5 MB. Record it last, after
  the code is final and the tests pass.
- A bug seen in the video and out of scope → leave it, and note it in the PR.

## Attach it
- [docs/demo/README.md](../../../docs/demo/README.md): a section for the video, its timeline (`Time`, `Shows`).
- Commit the script and the MP4 with the change.
- Its scenes as tests too, `tests/demo/<name>.spec.ts`, on the same stage: [Demo tests](../../../spec/analysis.md#demo-tests).
- In the PR body, after the push, a link that pins the commit; `gh` cannot upload a file to a PR:
  `https://github.com/<owner>/<repo>/blob/<commit>/docs/demo/<name>.mp4`, and what it shows, in a few lines.
- Under Air, also copy the MP4 to `$AIR_ARTIFACTS_DIR`.
