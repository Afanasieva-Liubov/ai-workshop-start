# Skill Atlas

Every agent skill in a repository: `./skill-atlas scan` finds each `SKILL.md` and prints its name,
description and link.

```console
$ npm ci
$ ./skill-atlas scan https://github.com/JetBrains/kotlin
JetBrains/kotlin · 6 skills
…
build-tools-bump-gradle-api — Bumps the Gradle API version that Kotlin Gradle plugins are compiled against in the Kotlin compiler repository.
  https://github.com/JetBrains/kotlin/blob/5ab6270ab772d113e8ad52ebfcaa0109c522ae00/.claude/skills/build-tools-bump-gradle-api/SKILL.md
…
```

Words after the repository filter the skills: `./skill-atlas scan ./fixture mps` prints only those whose
name or description contains every word, `fixture · 2 of 6 skills`.

`./skill-atlas serve` opens the same scan in a local web view, http://127.0.0.1:4173/: a field for the
repository link, its skills, a filter field over them, and their `SKILL.md`.

Set `GITHUB_TOKEN` for a higher GitHub rate limit. `npm test` runs the tests; `npm run test:e2e`, with
`GITHUB_TOKEN`, runs the CLI on real repositories at fixed commits and compares with [e2e/expected](e2e/expected/).
`npm run test:demo` plays [the demo](docs/demo/README.md#tests) as Playwright tests, in a real terminal and
browser, records a video of every test, and compares its key moments with screenshots, pixel for pixel
(`npm run e2e` too).

- [spec/](spec/): what it does. [AGENTS.md](AGENTS.md): the definition of done.
- [fixture/](fixture/README.md): a small repository for the tests.
- [qa/](qa/README.md): the test scripts for a check by hand, each with its steps and what a tester should see.
- [docs/demo/](docs/demo/README.md): a short video of the filter, in the CLI and the web view.
  [demo-video](.agents/skills/demo-video/SKILL.md): how to record one.
