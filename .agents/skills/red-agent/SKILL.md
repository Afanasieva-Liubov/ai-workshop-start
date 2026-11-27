---
name: red-agent
description: Try to break the web view of this repository (./skill-atlas serve) on purpose, as an attacker or a careless user would, and open one GitHub issue per bug found, with the steps and a video, labeled "Delegated to AI". Use when asked to break, attack or stress the web view, or to hunt for its bugs.
---

# Red agent

The [manual QA](../manual-qa/SKILL.md) follows the scripts of [qa/](../../../qa/README.md); the red agent
goes where they do not: odd input, odd repositories, odd timing, odd requests. Its target is the web view,
[spec/web.md](../../../spec/web.md): the page and its server. Each bug it finds becomes one issue, with the
steps, a video, and the label **`Delegated to AI`**, so that [issue-to-pr](../issue-to-pr/SKILL.md) fixes it.

## The target
- Given a pull request → `gh pr checkout <pr>` first: its branch is what you attack.
- Given none → `main`, as it is.
- The web view only. A bug seen in the CLI on the way → in the report, no issue.

## Before you start
- Read [spec/web.md](../../../spec/web.md), to the end: it is the only judge of a bug. The
  [CLI's filter](../../../spec/cli.md#filter) too: the page follows its rule.
- Read [qa/web-view.md](../../../qa/web-view.md) and [qa/web-filter.md](../../../qa/web-filter.md): what is
  already checked; go elsewhere.
- Read [src/web.html](../../../src/web.html) and [src/web.ts](../../../src/web.ts): aim at the code, not at
  random.
- The known bugs: `gh issue list --state all --limit 100`; read the ones about the web view.
- The tools, as [demo-video](../demo-video/SKILL.md#before-you-start) says: `npm ci`, `playwright`, `ttyd`,
  `ffmpeg`, Google Chrome; the ports 7681 and 4173 free.

## What is a bug
- **A bug**: the web view does what [spec/web.md](../../../spec/web.md) says it does not, or does not do
  what it says; or it breaks, whatever the spec says:
  - an error the user should not see (`Unexpected error: …`, a `500`, a raw stack), a page that hangs,
    a **Scan** button that stays disabled, a script error on the page (`pageerror`);
  - a wrong result: a missing, extra or stale skill, a wrong count, a wrong skill shown or selected,
    an address that does not open what is on the screen;
  - a hole: text from a `SKILL.md` or the address runs as HTML or a script, a request with another
    `Host` is answered, a method other than `GET` does something.
- **Not a bug**:
  - What the spec does not decide (a very long name: cut or wrapped?) → an **open question** in the
    report, no issue: issue-to-pr cannot fix what nobody decided.
  - Only the look is off, and the spec says nothing of it (spacing, a color, a wrapped line) → in the
    report, as **non-blocking**, no issue, as [qa/README.md](../../../qa/README.md#reporting) says.
  - What needs the network, when there is none: a GitHub rate limit, an unreachable host.
- Not sure that the spec decides it → an open question, not an issue.

## The attack
`./skill-atlas serve` on its own, in the root of the checkout, to explore; the browser by Playwright, or
`curl` for the server. Write down every attempt and what it did: the report lists what held, too.

**Your own repositories** for the odd cases, **outside the checkout**: `/tmp/red-agent/repos/<case>/`.
Each one is a few lines of shell, so that the issue can give them as a step:
```console
$ mkdir -p /tmp/red-agent/repos/html/.agents/skills/html
$ printf -- '---\nname: <img src=x onerror=alert(1)>\ndescription: <b>bold</b>. Second.\n---\n<script>alert(2)</script>\n' \
    > /tmp/red-agent/repos/html/.agents/skills/html/SKILL.md
```
Never in `fixture/`: it is the data of the tests.

**Angles**, from the spec; each a starting point, not a script:
- **The repository field**: empty, spaces only, a very long text, `~`, `..`, `.`, a path with spaces or
  non-ASCII letters, a file instead of a directory, a directory with no skills, a GitHub URL with a
  `/tree/` that does not exist or has a `/` in it, `http://localhost`, `javascript:alert(1)`.
- **The repositories**: HTML and quotes in a name, a description or the text; no description; a
  description with no full stop, or only `.`; a name of 300 letters; emoji and RTL text; 500 skills; the
  same name in two folders; a 5 MB `SKILL.md`; a binary or empty `SKILL.md`; a symlink loop; a folder
  you cannot read (`chmod 000`).
- **The filter**: regex characters (`.*`, `(`, `\`), quotes, many spaces, a word in the name and one in
  the description, case beyond ASCII (`İ`, `ß`, `ΣΑ`), a filter that hides the selected skill, then
  clears it; the arrow keys at the first and the last skill, and when every skill is hidden.
- **The address**: `?filter=` with no `?repository=`, the same parameter twice, `%` and `+` and `&`
  in a value, a value that is not UTF-8 (`%ff`); back and forward; a reload after a filter.
- **Timing**: **Scan** twice quickly; a second repository while the first still scans (does the slow
  one win?); typing in the filter while it scans; a scan that fails after one that worked (what stays
  on the screen?).
- **The server** (`curl -i`): another `Host` (`LOCALHOST:4173`, `127.0.0.1:4173.evil.com`, `127.0.0.1`
  with no port, none), `POST`, `HEAD`, `OPTIONS`, `/api/scan/`, `//`, `/%2e%2e/`, `?repository=` twice;
  `serve` with a bad port (`0`, `-1`, `65536`, `4173x`, `' 80'`) or one in use.

To explore in the browser, a Playwright script **in the checkout**, where `playwright` resolves
(`./.red-agent.mjs`; delete it after), and read the console too:
```js
import { chromium } from 'playwright';
const page = await (await chromium.launch({ channel: 'chrome' })).newPage();
const seen = [];
page.on('console', (m) => seen.push(`console ${m.type()}: ${m.text()}`)); // a 404 for the favicon, a 400 for a bad repository: not bugs
page.on('pageerror', (e) => seen.push(`pageerror: ${e.message}`));
page.on('dialog', (d) => { seen.push(`dialog: ${d.message()}`); d.dismiss(); }); // a script that ran
```
About an hour for the whole attack; stop sooner when the angles are done.

## A bug, confirmed
Before an issue, for each bug:
1. **Again, from nothing**: a new `./skill-atlas serve`, a new page; the bug comes back. Not every time
   → say how often (2 of 5), and the issue says so.
2. **The fewest steps**: cut each step that is not needed to see it.
3. **Against the spec**: the line of [spec/web.md](../../../spec/web.md) it breaks, or why it breaks
   whatever the spec says (a crash, a hole).
4. **Already known?** `gh issue list --state all --search "<words>"`. Open → no second issue: the
   report links it. Closed as fixed and back → a new issue, "back after #<n>".
5. **One cause, one issue**: two symptoms of the same line of code → one issue with both.

## The video
One for each bug, **outside the repository**: `/tmp/red-agent/<bug>.mjs` → `/tmp/red-agent/<bug>.mp4`,
made with [docs/demo/recorder.mjs](../../../docs/demo/recorder.mjs), as a
[demo video](../demo-video/SKILL.md#cases) is: the real page, the real server, the steps of the issue,
in order, typed and clicked as a user would.

```js
import { record } from '<checkout>/docs/demo/recorder.mjs';

await record('<bug>', async ({ page, wait, caption, terminal, run, web }) => {
  await caption('Red agent · <the bug, in a few words>', '<expected> → <seen instead>');
  await web();
  await page.locator('#repository').pressSequentially('/tmp/red-agent/repos/<case>', { delay: 25 });
  await page.click('#scan');
  await wait(3000); // the bug, on screen
});
```
```console
$ node /tmp/red-agent/<bug>.mjs /tmp/red-agent/<bug>.mp4
```
Always with the path: without it the video lands in `docs/demo/`.

- The recorder runs its own `./skill-atlas serve` on 4173: stop yours first. It runs it in
  `/tmp/skill-atlas-stage` ([docs/demo/stage.mjs](../../../docs/demo/stage.mjs)), not in the checkout, so a
  relative path (`.`, `..`, `fixture`) scans from there. In a video, type absolute paths only. A bug that
  needs a relative path → the issue's step 2 is `node -e "import('./docs/demo/stage.mjs')"`, then
  `cd /tmp/skill-atlas-stage && ./skill-atlas serve`, so that the steps and the video scan the same thing.
- A bug of the server: `terminal()`, then the `curl -i` command and its answer, typed with `run()`.
- **A step that fails is the bug**: an error inside `record()` ends it with no video. A step that may
  throw (a page of a server that has stopped) → `await web().catch(() => {});`, then the pause.
- Under a minute; about 3 s on the bug itself.
- **Look at it**: a frame where the bug is (`ffmpeg -ss <s> -i /tmp/red-agent/<bug>.mp4 -frames:v 1
  /tmp/red-agent/<bug>.png`), read as an image. The bug is not in the frame → a longer pause, and record
  again. Not in the video at all → it is not confirmed.
- Under Air, copy the videos to `$AIR_ARTIFACTS_DIR/red-agent/`. `gh` cannot upload a video: the issue
  names the file and where it is.
- **Do not commit them**, nor the scripts, nor the repositories of `/tmp/red-agent/`.

## The issue
One for each bug, **in English**, labeled for issue-to-pr:
```console
$ gh issue create --label "Delegated to AI" --title "<what the user sees go wrong>" --body-file /tmp/red-agent/<bug>.md
```

```markdown
Found by the red agent on `<branch>` at `<commit>`.

## Steps
1. <the shell lines that make the repository, if any>
2. `./skill-atlas serve` in the root of the checkout (a relative path in the bug → in `/tmp/skill-atlas-stage`, as under **The video**)
3. Open http://127.0.0.1:4173/ … <each step, as the video does it>

## Expected
<what spec/web.md says, quoted, with a link to its section>

## Seen instead
<what happened: the text on the page, the console's error, the HTTP answer>
<how often, if not every time>

## Video
`<bug>.mp4`, at 0:<seconds>: <where it is: in the artifacts of the Air run, with its link; or its path>
```
- The title says the bug, not the fix: "A second scan shows the skills of the first", not "Cancel fetch".
- Only what you saw. No guess at the cause in the title; a line of code you suspect → under **Seen
  instead**, as a guess.
- Under Air, end the body with the run's signature.
- Do not fix it: that is issue-to-pr's job. **Change nothing** in the repository: no commit, no branch.

## The report
Short: the totals first, then the bugs, then the rest.

```
Red agent on <branch> at <commit>: 3 bugs (3 issues), 1 already known, 2 open questions, 41 attempts held

| Bug | Issue | Video |
| --- | --- | --- |
| A second scan shows the skills of the first | #51 | stale-scan.mp4 |
| `%ff` in the address leaves a blank page | #52 | bad-address.mp4 |
| The arrow keys stop at a hidden skill | #47 (already open) | — |

Open questions (no issue): a name of 300 letters overflows the list: cut or wrapped?
Non-blocking (no issue): …
Held: <the angles tried that did not break, in a line or two>
```
- Asked about a pull request → the report as its comment (`gh pr comment <pr>`); then, last, one more
  comment with exactly this text and nothing else: `gh pr comment <pr> --body "red-agent FINISHED"`;
  also when nothing broke. No pull request → no comment.
- Nothing broke → say so, with what was tried: that is a result too.
