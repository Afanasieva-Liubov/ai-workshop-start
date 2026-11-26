# Repository analysis
## Input
A **GitHub repository** URL, or a local directory
## Output
Every `SKILL.md`: **name**, **description**, **link**
## Architecture
Core: fetch → find → parse. CLI: a *thin client*.
Skill: id = `repo:path`, name, description, commit
## Details
- **GitHub API**, no clone; *under 5 s* for intellij-community
- The name: front matter, else the directory
- The link pins the *scanned commit*
- Malformed front matter → a *warning*, the scan goes on
- Unreachable repository → a clear message, exit code 1
## Edge cases
- **Duplicates**: the same skill in several agents' folders, *identical* files (`.agents/skills/mps-tests`, `.claude/skills/mps-tests`) → one skill, the first by `.agents`, `.claude`, `.github`, `agent`; the others are its `copies`; different files → separate skills
- **An unusual folder**: the repository's own skills outside `.agents` and `.claude` (`agent/skills/writing-lint-checks`) → a skill like any other
- **Part of the product**: shipped to users inside a plugin, under `resources` (`plugins/mcp-tools/resources/…/skills/mps-aspect-generator`) → a skill, marked as *part of the product*
- **Test data**: a fixture for the project's own tests (`integration-tests/src/jvmTest/resources/skills/weather-retrieval`) → *not a skill*, skipped: under `test`, `tests`, `testData`, `fixtures`, `__tests__` or a source set like `jvmTest`
