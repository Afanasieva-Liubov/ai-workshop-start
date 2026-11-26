# A real GitHub repository

Checks the scan of a GitHub repository at a [fixed commit](../spec/cli.md), so the result does not change.
It needs the network. Without a token GitHub allows few requests: on `GitHub rate limit reached; set
GITHUB_TOKEN`, set `GITHUB_TOKEN` to any GitHub token and run again.

## 1. Scan a fixed commit
**Steps**
1. Run `./skill-atlas scan github.com/JetBrains/koog/tree/709079e4a34d6c9234583352550e6a2b88a0bb85`.
2. Run `echo $?`.
3. Open the first link of the output in a browser.

**Should see**
```
JetBrains/koog · 2 skills
add-java-code-snippets-in-docs — Use when the user asks to add Java tabs/examples to mkdocs docs that already have Kotlin examples (files under docs/docs/**.md using === "Kotlin" / Knit INCLUDE+SUFFIX blocks).
  https://github.com/JetBrains/koog/blob/709079e4a34d6c9234583352550e6a2b88a0bb85/.claude/skills/add-java-code-snippets-in-docs/SKILL.md
split-jvm-nonjvm — Splits a class or several classes in the common source set commonMain into JVM and non-JVM parts into jvmCommonMain and nonJvmCommonMain.
  https://github.com/JetBrains/koog/blob/709079e4a34d6c9234583352550e6a2b88a0bb85/.claude/skills/split-jvm-nonjvm/SKILL.md
```
- It answers in a few seconds; the exit code is `0`.
- Both links have the scanned commit, `709079e…`, not a branch.
- Step 3: the link opens that skill's `SKILL.md` on GitHub.

## 2. Filter it
**Steps**
1. Run the command of case 1 with ` commonMain` at the end.

**Should see**
- `JetBrains/koog · 1 of 2 skills`, then `split-jvm-nonjvm` and its link: only its description has `commonMain`.

## 3. A repository that does not exist
**Steps**
1. Run `./skill-atlas scan https://github.com/JetBrains/nonexistent-repo-xyz`.
2. Run `echo $?`.

**Should see**
- `Repository not found: https://github.com/JetBrains/nonexistent-repo-xyz`
- The exit code is `1`.
