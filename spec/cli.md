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
