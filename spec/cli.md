# Command line
`./skill-atlas scan <GitHub URL | directory>`
Prints the result **at once**; *nothing is stored*.
`github.com/<owner>/<repo>/tree/<commit | branch | tag>` scans that commit instead of the default branch.
`github.com/<org | user>` scans each of its repositories: forks and archived ones skipped; private ones if `GITHUB_TOKEN` sees them.
`GITHUB_TOKEN`, optional: a higher GitHub rate limit.
## Output
```
JetBrains/kotlin · 6 skills
build-tools-bump-gradle-api — Bumps the Gradle API…
  https://github.com/JetBrains/kotlin/blob/<commit>/…
```
- Sorted by **name**; the description's *first sentence*
- `also in <paths>` for copies; `part of the product: <folder>` for product skills; warnings go to *stderr*
- An organization: one section per repository with skills, sorted by name; then `<org> · N skills in M repositories`
- A repository that fails → a *warning*, the scan goes on; the organization not found → exit code 1
- Identical skills in different repositories stay separate
