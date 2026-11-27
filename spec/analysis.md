# Repository analysis
## Input
A **GitHub repository** URL, or a local directory
## Output
Every `SKILL.md`: **name**, **description**, **link**
## Architecture
Core: fetch → find → parse. CLI and [web view](web.md): *thin clients*.
Skill: id = `repo:path`, name, description, commit, its SKILL.md text
## Details
- **GitHub API**, no clone; *under 5 s* for intellij-community
- A tree too large for one answer → listed directory by directory, never cut short
- A fixed commit (`/tree/<commit>`) → listed through its tree: code search sees only the default branch
- The name: front matter, else the directory
- The link pins the *scanned commit*
- Malformed front matter → a *warning*, the scan goes on
- Unreachable repository → a clear message, exit code 1
## Edge cases
- **Duplicates**: the same skill in several agents' folders, *identical* files of the same name (`.agents/skills/mps-tests`, `.claude/skills/mps-tests`) → one skill, the first by `.agents`, `.claude`, `.github`, `agent`; the others are its `copies`; different files, or identical files of different names → separate skills
- **An unusual folder**: the repository's own skills outside `.agents` and `.claude` (`agent/skills/writing-lint-checks`) → a skill like any other
- **Part of the product**: shipped to users inside a plugin, under `resources` (`plugins/mcp-tools/resources/…/skills/mps-aspect-generator`) → a skill, marked as *part of the product*
- **Test data**: a fixture for the project's own tests (`integration-tests/src/jvmTest/resources/skills/weather-retrieval`) → *not a skill*, skipped: under `test`, `tests`, `testData`, `fixtures`, `__tests__` or a source set like `jvmTest`, `androidUnitTest`; the skill's own folder does not count (`.claude/skills/tests` is a skill)
## End-to-end tests
`npm run test:e2e`, with `GITHUB_TOKEN`: the real CLI on JetBrains/MPS, JetBrains/android and
JetBrains/koog, each at a fixed commit; its output must equal `e2e/expected/<repo>.txt`.
`UPDATE_EXPECTED=1` stores the new output instead.
## Demo tests
`npm run test:demo` (or `npm run e2e`): the [demo](../docs/demo/README.md) as Playwright tests, one per scene of `filter.mjs` and `final-sigma.mjs`:
the real CLI in a real terminal (ttyd) and the real web view, in Google Chrome; each checks what its scene shows.
- The demo's stage, `docs/demo/stage.mjs`: the same **data** (`./fixture`, and `./greek` with one skill, `ΟΔΥΣΣΕΥΣ`), **viewport** (1280×720) and **fonts**
  (DejaVu, from npm at a fixed version, the only fonts Chrome sees: `Arial` → DejaVu Sans)
- The same **paths** on every machine: the terminal and the web view run in `/tmp/skill-atlas-stage`, its
  `./skill-atlas` and `./fixture` link to the checkout (`file:///tmp/skill-atlas-stage/fixture/…`)
- *Deterministic*: one test at a time, in order, never retried; it waits for a result, never for a time
- **Every run recorded**: a video of each test, `test-results/<test>/video.webm`; in CI, the `demo-tests` artifact
- **Screenshots** of the key moments, the end of each scene (`scan ./fixture mps` → `cli-scan-mps`), compared
  *pixel for pixel* with the baselines, `tests/demo/screenshots/<moment>-linux.png`, made on Linux, like CI
- *A changed pixel fails the check*: no tolerance; a test changes one pixel of the scanned fixture and expects
  `1 pixels … are different`; in CI, the actual image and the diff in the `demo-tests` artifact
- A missing baseline: written here, a failure in CI (`CI` set); `npx playwright test --update-snapshots` makes
  them all again, on purpose, on Linux
