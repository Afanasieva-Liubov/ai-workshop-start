# Command line
`./skill-atlas scan <GitHub URL | directory> [words…]`
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
## Filter
`[words…]` after the repository: only the skills that match, filtered *after the scan*.
- No words → every skill, as above
- Words → the skills whose **name or description** contains **every** word (AND), *case-insensitive*, as a
  substring (`test` matches `mps-tests`); the same order, by name
- Case-insensitive in Greek too: σ and the final ς are one letter (`ΟΔΥΣ` matches `ΟΔΥΣΣΕΥΣ`)
- The header counts the matches: `JetBrains/kotlin · 2 of 6 skills`
- No match → the header, then `no skills match "<words>"`; exit code 0
