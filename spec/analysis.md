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
- An organization → *under 60 s* for JetBrains, with GITHUB_TOKEN
- An organization with more than 1000 `SKILL.md` hits (code search's limit) → each repository listed through its tree, none left out
- A user scanned with their own GITHUB_TOKEN → their private repositories too (`/user/repos`); anyone else's token → public ones
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
