# CLI: scan a repository

Checks that `scan` prints every skill of [fixture/](../fixture/README.md), with the
[edge cases](../spec/analysis.md#edge-cases) handled.

## 1. Every skill
**Steps**
1. Run `./skill-atlas scan ./fixture`.
2. Run `echo $?`.

**Should see**
```
fixture · 6 skills
code-style — Follow the project's code style.
  file://<checkout>/fixture/.github/skills/code-style/SKILL.md
commits — Write commit messages the way this repository does.
  file://<checkout>/fixture/.claude/skills/commits/SKILL.md
mps-aspect-generator — Generate an MPS language aspect.
  file://<checkout>/fixture/plugins/mcp-tools/resources/skills/mps-aspect-generator/SKILL.md
  part of the product: plugins/mcp-tools/resources
mps-tests — Run the MPS tests for the module you changed.
  file://<checkout>/fixture/.agents/skills/mps-tests/SKILL.md
  also in .claude/skills/mps-tests/SKILL.md
release-checklist
  file://<checkout>/fixture/.agents/skills/release-checklist/SKILL.md
writing-lint-checks — Write a lint check the way this repository does.
  file://<checkout>/fixture/agent/skills/writing-lint-checks/SKILL.md
warning: .agents/skills/release-checklist/SKILL.md: malformed front matter: …; using the directory name
```
- The exit code is `0`.

## 2. What to check in that output
**Steps**
1. Read the output of case 1 again, line by line.

**Should see**
- The header counts **6** skills, and they are sorted by name.
- Each description is its first sentence only: `code-style` ends at `style.`, although its `SKILL.md`
  goes on with `Use before committing…`.
- **Duplicates**: `mps-tests` is there once, from `.agents`, with `also in .claude/skills/mps-tests/SKILL.md`.
- **An unusual folder**: `writing-lint-checks`, from `agent/skills`, is a skill like any other.
- **Part of the product**: `mps-aspect-generator` has `part of the product: plugins/mcp-tools/resources`.
- **Test data**: `weather-retrieval` is **not** in the list.
- **Malformed front matter**: `release-checklist` has its directory's name and no description, and a
  `warning:` line says why; the scan went on.

## 3. Warnings go to stderr
**Steps**
1. Run `./skill-atlas scan ./fixture 2>/dev/null`.
2. Run `./skill-atlas scan ./fixture >/dev/null`.

**Should see**
- Step 1: the header and the six skills, and **no** `warning:` line.
- Step 2: **only** the `warning:` line.
