# Demo: the filter

[filter.mp4](filter.mp4), under a minute, on [fixture/](../../fixture/README.md): the [filter](../../spec/cli.md#filter)
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

## Recording it again
The real `./skill-atlas` in a real terminal ([ttyd](https://github.com/tsl0922/ttyd)) and the real
`./skill-atlas serve`, driven by [Playwright](https://playwright.dev) in Google Chrome; ffmpeg makes the MP4.

```console
$ npm ci && npm i --no-save playwright
$ node docs/demo/record.mjs
…/docs/demo/filter.mp4
```

It needs `ttyd`, `ffmpeg` and Google Chrome on the machine, and the ports 7681 and 4173 free.
