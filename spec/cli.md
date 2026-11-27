# Command line
`./skill-atlas scan <GitHub URL | directory> [words…]`
Prints the result **at once**; *nothing is stored*.
`github.com/<owner>/<repo>/tree/<commit | branch | tag>` scans that commit instead of the default branch.
`GITHUB_TOKEN`, optional: a higher GitHub rate limit.
## Output
```
JetBrains/kotlin · 6 skills

build-tools-bump-gradle-api  Bumps the Gradle API…
  https://github.com/JetBrains/kotlin/blob/<commit>/…

kotlin-tests                 Runs the Kotlin tests…
  https://github.com/JetBrains/kotlin/blob/<commit>/…
```
- Sorted by **name**; the description's *first sentence*
- **Aligned columns**: each name padded to the longest one shown, then two spaces, then the sentence;
  no description → the name alone
- Under the name, indented by two: the link, `also in <paths>` for copies, `part of the product: <folder>`
  for product skills
- **A blank line** after the header and between the skills
- Names in **bold** when stdout is a terminal; plain text when piped, or with `NO_COLOR` set
- Warnings go to *stderr*
## Filter
`[words…]` after the repository: only the skills that match, filtered *after the scan*.
- No words → every skill, as above
- Words → the skills whose **name or description** contains **every** word (AND), *case-insensitive*, as a
  substring (`test` matches `mps-tests`); the same order, by name
- The header counts the matches: `JetBrains/kotlin · 2 of 6 skills`
- No match → the header, then `no skills match "<words>"`, no blank line; exit code 0
