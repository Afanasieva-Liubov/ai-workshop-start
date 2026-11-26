# Command line
`./skill-atlas scan <GitHub URL | directory>`
Prints the result **at once**; *nothing is stored*.
`github.com/<owner>/<repo>/tree/<commit | branch | tag>` scans that commit instead of the default branch.
`GITHUB_TOKEN`, optional: a higher GitHub rate limit.
## Output
```
JetBrains/kotlin · 6 skills
build-tools-bump-gradle-api — Bumps the Gradle API…
  https://github.com/JetBrains/kotlin/blob/<commit>/…
```
- Sorted by **name**; the description's *first sentence*
- `also in <paths>` for copies; `part of the product: <folder>` for product skills; warnings go to *stderr*
## Help
- `./skill-atlas help`, or no command → every command and what it does
- `./skill-atlas help <command>` → the usage of that command alone, the line its wrong arguments print
  (`help scan` → `Usage: skill-atlas scan <GitHub URL | directory>`), exit code 0
- An unknown command (`help nope`), or more than one → the error and the full help on *stderr*, exit code 1
