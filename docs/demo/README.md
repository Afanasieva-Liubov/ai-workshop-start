# Demo videos

Short videos of the features, each under a minute, on [fixture/](../../fixture/README.md) (or a repository of the stage).

## The filter
[filter.mp4](filter.mp4), recorded by [filter.mjs](filter.mjs): the [filter](../../spec/cli.md#filter)
in the CLI, then the [same filter](../../spec/web.md#filter) in the web view.

| Time | Shows |
| --- | --- |
| 0:03 | `scan ./fixture`: every skill, `fixture · 6 skills` |
| 0:11 | `scan ./fixture mps`: `fixture · 2 of 6 skills` |
| 0:16 | `scan ./fixture MPS tests`: every word, case-insensitive, `1 of 6 skills` |
| 0:24 | `scan ./fixture nothing`: `no skills match "nothing"`, exit code 0 |
| 0:31 | `serve`: the fixture scanned once, then filtered as you type, `mps` → `2 of 6 skills`; the selected `code-style` stops matching and is no longer shown |
| 0:41 | `repository` → `commits`, `writing-lint-checks`: the arrow key skips the three skills between them |
| 0:48 | `nothing` → `no skills match "nothing"` |
| 0:51 | `?filter=test` in the address fills the field on load and selects the first match |

The CLI commands send stderr to `/dev/null`: the fixture's malformed `release-checklist` warning, on purpose,
would push the output off the screen. The web view shows it under the field.

## Greek in the filter
[final-sigma.mp4](final-sigma.mp4), recorded by [final-sigma.mjs](final-sigma.mjs): an upper-case Greek
[filter](../../spec/cli.md#filter) that ends in `Σ`, on the stage's `./greek` (one skill, `ΟΔΥΣΣΕΥΣ`), not the
fixture (#49). `ΟΔΥΣ` lowers to `οδυς`, with the final `ς`; inside the name the `Σ` is a `σ`: one letter.

| Time | Shows |
| --- | --- |
| 0:06 | `scan ./greek ΟΔΥ`: `greek · 1 of 1 skill` |
| 0:10 | `scan ./greek ΟΔΥΣ`: still `1 of 1 skill` |
| 0:16 | `scan ./greek οδυς`: the lower case, with the final `ς`, too |
| 0:22 | `serve`: `./greek` scanned, `ΟΔΥ` typed in the filter: `1 of 1 skill` |
| 0:24 | then `Σ`: `ΟΔΥΣΣΕΥΣ` stays, `1 of 1 skill` |

## A request for // keeps the web view running
[double-slash.mp4](double-slash.mp4), recorded by [double-slash.mjs](double-slash.mjs): the requests that used to
stop `./skill-atlas serve` ([#47](https://github.com/Afanasieva-Liubov/ai-workshop-start/issues/47)) now get an
answer from the [server](../../spec/web.md#server), and it keeps running.

| Time | Shows |
| --- | --- |
| 0:02 | the web view at `/` |
| 0:04 | `http://127.0.0.1:4173//` in the browser: `Not found`, not a reset connection |
| 0:10 | `curl` `//` → `404 Not Found` |
| 0:17 | `//` with `Host: evil.com` → `403 Forbidden` |
| 0:24 | `/\` sent as is → `404 Not Found` |
| 0:28 | `/` after them → `200 OK`: the server still runs |
| 0:33 | the web view still scans the fixture, `fixture · 6 skills` |

## Recording
The real `./skill-atlas` in a real terminal ([ttyd](https://github.com/tsl0922/ttyd)) and the real
`./skill-atlas serve`, driven by [Playwright](https://playwright.dev) in Google Chrome; ffmpeg makes the MP4.
[recorder.mjs](recorder.mjs) is that plumbing; a video is a small script with its scenes, `<name>.mjs` →
`<name>.mp4`. [stage.mjs](stage.mjs) is the stage, the same for the videos and their tests: the fixture,
1280×720, and only the DejaVu fonts ([fonts.conf](fonts.conf)), whatever the machine has installed.

```console
$ npm ci && npx playwright install ffmpeg
$ node docs/demo/filter.mjs
…/docs/demo/filter.mp4
$ node docs/demo/filter.mjs /tmp/filter.mp4    # a trial run, to another path
```

It needs `ttyd`, `ffmpeg` and Google Chrome on the machine, and the ports 7681 and 4173 free.
A new video, and the cases ready for it: the [demo-video](../../.agents/skills/demo-video/SKILL.md) skill.

## Tests
The demo, as Playwright tests ([filter.spec.ts](../../tests/demo/filter.spec.ts),
[double-slash.spec.ts](../../tests/demo/double-slash.spec.ts), [final-sigma.spec.ts](../../tests/demo/final-sigma.spec.ts)): each scene of
[filter.mjs](filter.mjs), [double-slash.mjs](double-slash.mjs) and [final-sigma.mjs](final-sigma.mjs)
on the same stage, checked for what it shows, and recorded, every run: `test-results/<test>/video.webm`.
The end of each scene is a screenshot, compared pixel for pixel with its baseline in
[tests/demo/screenshots/](../../tests/demo/screenshots/), made on Linux, like CI: a changed pixel fails the test.
The stage runs in `/tmp/skill-atlas-stage`, so that the paths on screen are the same on every machine.
[Demo tests](../../spec/analysis.md#demo-tests) in the spec; in CI, the `demo-tests` artifact.

```console
$ npm ci && npx playwright install ffmpeg
$ npm run test:demo
  19 passed (1.3m)
$ ls test-results/*/video.webm
$ npx playwright test --update-snapshots    # the screenshots again, on purpose, on Linux
```

The same tools as a recording: `ttyd` and Google Chrome, the ports 7681 and 4173 free.
