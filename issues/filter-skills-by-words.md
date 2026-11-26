# Filter the skills by words

Find the skills you need among many: only those whose name or description has the given words.

## Spec
### Command line
`./skill-atlas scan <GitHub URL | directory> [words…]`
- No words → every skill, as today
- Words → only the skills whose **name** or **description** contains *every* word: case-insensitive,
  a part of a word matches (`test` matches `mps-tests`, `Testing`)
- The header counts what is shown, of all: `JetBrains/MPS · 3 of 42 skills`
- Nothing matches → the header `JetBrains/MPS · 0 of 42 skills`, exit code 0
- Copies and *part of the product* skills are filtered like any other; the copies' paths are not searched
- Warnings: all of them, as without words
### Web view
- A **filter field** above the skills; it filters the scanned skills as you type, *no new scan*
- The same rule as the CLI; the count `3 of 42`; nothing matches → `No skill matches "<words>"`
- `?repository=<link>&filter=<words>` in the address: scans and filters on load; the address follows the field
- `GET /api/scan` is unchanged: the filter is the page's

## Examples (fixture/)
```console
$ ./skill-atlas scan ./fixture test
fixture · 1 of 6 skills
mps-tests — …
$ ./skill-atlas scan ./fixture release CHECKLIST
fixture · 1 of 6 skills
release-checklist — …
$ ./skill-atlas scan ./fixture nothing-like-it
fixture · 0 of 6 skills
```

## Tests
An integration test per case above: no words; one word; several words, all required; case;
a part of a word; a match in the description only; nothing matches; the web field and `?filter=`.
