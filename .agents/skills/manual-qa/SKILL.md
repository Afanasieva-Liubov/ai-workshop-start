---
name: manual-qa
description: Run the manual QA scripts of this repository (qa/) as a tester would, each one in a browser and on video, and report pass or fail for every case with the video. Use when asked to run the QA scripts, to check a branch or a pull request by hand, or to re-check a failed case.
---

# Manual QA

A tester's run of [qa/](../../../qa/README.md): every step done as written, in a real browser, on video.
The CLI scripts run in a real terminal ([ttyd](https://github.com/tsl0922/ttyd)) inside that browser, the
web scripts on the real `./skill-atlas serve`; [docs/demo/recorder.mjs](../../../docs/demo/recorder.mjs)
is the plumbing, the same as for a [demo video](../demo-video/SKILL.md).
The result is a report: pass or fail for each case, and the video that shows it.

## The scripts
- Given a script or a case (`qa/web-filter.md`, "case 3 of cli-scan") → that one.
- Given none → every script of the table in [qa/README.md](../../../qa/README.md), in its order.
- Given a pull request → `gh pr checkout <pr>` first: the scripts and the product of that branch.
- No `qa/` in the checkout → stop and say so; do not invent the checks.

## Before you start
- Read [qa/README.md](../../../qa/README.md), and the script, to the end.
- The tools, as [demo-video](../demo-video/SKILL.md#before-you-start) says: `npm ci`, `playwright`,
  `ttyd`, `ffmpeg`, Google Chrome; the ports 7681 and 4173 free.
- The recorder already runs `./skill-atlas serve` on 4173, in the root of the checkout: a script's
  **Before** that asks for it is done; do not start a second one.

## The run
One run script and one video for each QA script, **outside the repository**:
`/tmp/manual-qa/<script>.mjs` → `/tmp/manual-qa/<script>.mp4`.

```js
import { record } from '<checkout>/docs/demo/recorder.mjs';

const seen = [];
await record('<script>', async ({ page, wait, caption, terminal, run, web }) => {
  const start = Date.now();
  page.setDefaultTimeout(5000);
  // The second of the video that shows the result: the middle of its pause.
  const at = () => Math.round((Date.now() - start) / 1000) - 1;
  // One step: do it, leave the result on screen, write down what is there and when.
  const step = async (id, act, look) => {
    try {
      await act();
      await wait(2500);
      seen.push({ step: id, at: at(), ...await look() });
    } catch (error) {
      seen.push({ step: id, at: at(), error: error.message });
    }
  };
  await caption('QA · qa/<script>.md', '<what it checks, one line>');
  // the cases, in order: the steps below
});
console.log(JSON.stringify(seen, null, 1));
```

```console
$ node /tmp/manual-qa/<script>.mjs /tmp/manual-qa/<script>.mp4
```
Always with the path: without it the video lands in `docs/demo/`.

- **Every case, every step, in order, as written**: type what it says to type, click what it says to
  click, open the address it gives. No shortcut through the address or the API for a step that types.
- **A step never throws**: an error ends the recording with no video, and a failure needs one. `step()`
  writes the error down and goes on.
- **One title card, first**: `caption()` replaces the page, and the cases of a script share its state.
- About 2.5 s on each result; a script is a minute or two.
- A step the recorder cannot do as written (a second terminal) → the nearest thing (`… &`, then
  `kill %1`), and say so in the report.
- Needs what is not there (the network, a token for `qa/github.md`) → **not run**, with the reason;
  never a pass.

**A step in the web view**: act as a user, then read the page.
```js
const text = (selector) => page.locator(selector).innerText();
// `.name` also holds the badges: the name is its first text node, the badges its `.badge`s.
const names = (selector) => page.locator(selector).evaluateAll((els) => els.map((e) => e.firstChild.textContent));
const badges = (selector) => page.locator(selector)
  .evaluateAll((els) => els.map((e) => [...e.querySelectorAll('.badge')].map((b) => b.textContent)));
const look = async () => ({
  status: await text('#status'),
  skills: await names('#skills li:not([hidden]) .name'),
  badges: await badges('#skills li:not([hidden]) .name'), // the badges of each skill, in the same order
  selected: await names('#skills li[aria-selected="true"] .name'),
  shown: await text('#skill'),
  address: decodeURIComponent(new URL(page.url()).search),
});
await step('before', () => web({ repository: './fixture' }), look);
await step('1.1', () => page.locator('#filter').pressSequentially('mps', { delay: 180 }), look);
```

**A step in the CLI**: `terminal()` once, then each command typed into it; read the screen back.
```js
// What the terminal shows, as text; a line too long for the screen is joined again.
const screen = () => page.evaluate(() => {
  const buffer = window.term.buffer.active, lines = [];
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i), text = line.translateToString(true);
    if (line.isWrapped) lines[lines.length - 1] += text; else lines.push(text);
  }
  return lines.join('\n').trimEnd();
});
await terminal();
await step('1.1', () => run('./skill-atlas scan ./fixture', 500), async () => ({ screen: await screen() }));
await step('1.2', () => run('echo $?', 500), async () => ({ screen: await screen() }));
await run('clear', 300); // before the next case
```

## The verdict
For each step, what was seen against its **Should see**:
- **Pass**: exactly that. `…` in the script stands for any text; `<checkout>` is the path of the checkout.
- **Fail**: anything else: a different text, a missing or an extra line, a wrong exit code, a step that
  could not be done. Write down what was there instead.
- A case passes when all its steps do.
- **Look at the video** before the verdict: a frame of each step
  (`ffmpeg -ss <at> -i /tmp/manual-qa/<script>.mp4 -frames:v 1 /tmp/manual-qa/<step>.png`), read as an
  image. The text read back is what you asked for; the frame is what a tester sees: something extra on
  the page, a line cut off or scrolled away. They disagree → the frame wins. Still typing in the frame →
  a longer pause, and record again.
- Only what you saw. Not sure → run the step again; do not guess a pass.
- **Change nothing**: not the product, not the script, to make a step pass. The script looks wrong and
  the product matches the [spec](../../../spec/) → still a fail, and say that the script is the one to fix.

## The report
Short: the totals first, then a table for each script, then the videos.

```
Manual QA of <branch> at <commit>: 10 passed, 1 failed, 3 not run

qa/web-view.md — web-view.mp4
| Case | Result | Video | Seen instead |
| --- | --- | --- | --- |
| 1. The empty page | pass | 0:04 | |
| 3. A selected skill | **fail**, step 1 | 0:17 | a line `null` under the link |

qa/github.md — not run: GitHub rate limit reached, no GITHUB_TOKEN
```

- `Video` is the step's `at`: where to look.
- The videos are the evidence of this run, not a part of the repository: **do not commit them**, nor
  the run scripts. Give their paths; under Air, copy them to `$AIR_ARTIFACTS_DIR/manual-qa/`, and say
  that they are in the run's artifacts.
- Asked about a pull request → the report as its comment (`gh pr comment <pr>`); `gh` cannot upload a
  video, so name the file and where it is.
- A failed step → an issue, as [qa/README.md](../../../qa/README.md#reporting) says, **only when asked
  to file them**: the script and the step, the command, what was seen instead, the video. First check
  that there is none open for it (`gh issue list --search`).
- Do not fix what failed here: that is another task.
