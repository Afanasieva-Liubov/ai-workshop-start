# CLI: filter the skills by words

Checks the [filter](../spec/cli.md#filter): the words after the repository. Every command sends stderr to
`/dev/null`, to leave out the fixture's `warning:` line.

## 1. One word
**Steps**
1. Run `./skill-atlas scan ./fixture mps 2>/dev/null`.

**Should see**
```
fixture · 2 of 6 skills
mps-aspect-generator — Generate an MPS language aspect.
  file://<checkout>/fixture/plugins/mcp-tools/resources/skills/mps-aspect-generator/SKILL.md
  part of the product: plugins/mcp-tools/resources
mps-tests — Run the MPS tests for the module you changed.
  file://<checkout>/fixture/.agents/skills/mps-tests/SKILL.md
  also in .claude/skills/mps-tests/SKILL.md
```
- The header counts the matches, `2 of 6`; the skills are still sorted by name.

## 2. Every word, in any case
**Steps**
1. Run `./skill-atlas scan ./fixture MPS test 2>/dev/null`.

**Should see**
```
fixture · 1 of 6 skills
mps-tests — Run the MPS tests for the module you changed.
  file://<checkout>/fixture/.agents/skills/mps-tests/SKILL.md
  also in .claude/skills/mps-tests/SKILL.md
```
- Only the skill with **both** words: `mps-aspect-generator` has `mps`, but no `test`.
- `MPS` matches `mps`, and `test` matches inside `mps-tests`.

## 3. A word of the description
**Steps**
1. Run `./skill-atlas scan ./fixture repository 2>/dev/null`.

**Should see**
```
fixture · 2 of 6 skills
commits — Write commit messages the way this repository does.
  file://<checkout>/fixture/.claude/skills/commits/SKILL.md
writing-lint-checks — Write a lint check the way this repository does.
  file://<checkout>/fixture/agent/skills/writing-lint-checks/SKILL.md
```
- Neither name has `repository`: the descriptions do.

## 4. No match
**Steps**
1. Run `./skill-atlas scan ./fixture zzz 2>/dev/null`.
2. Run `echo $?`.

**Should see**
```
fixture · 0 of 6 skills
no skills match "zzz"
```
- The exit code is `0`: no match is not an error.
