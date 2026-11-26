# Web view: the page

Checks the [page](../spec/web.md#page) of `./skill-atlas serve`.

**Before**: run `./skill-atlas serve` in the root of the checkout and leave it running. It prints
`Skill Atlas web view: http://127.0.0.1:4173/`. Stop it with `Ctrl+C` after the last case.

## 1. The empty page
**Steps**
1. Open http://127.0.0.1:4173/ in a browser.

**Should see**
- The title **Skill Atlas**, an empty field for a repository link, and a **Scan** button.
- No skills, no filter field, no message.

## 2. Scan a repository
**Steps**
1. Type `./fixture` in the field.
2. Press **Scan** (or `Enter`).

**Should see**
- Under the field: `fixture · 6 skills`.
- Under it, the warning: `warning: .agents/skills/release-checklist/SKILL.md: malformed front matter: …`.
- On the left, six skills in this order: `code-style`, `commits`, `mps-aspect-generator`, `mps-tests`,
  `release-checklist`, `writing-lint-checks`; each with the first sentence of its description, except
  `release-checklist`, which has none.
- `mps-aspect-generator` has a `product` badge; `mps-tests` has a `+1 copy` badge.
- `weather-retrieval` is **not** in the list.
- The first skill, `code-style`, is selected and shown on the right.
- The address ends with `?repository=.%2Ffixture`.

## 3. A selected skill
**Steps**
1. Look at `code-style` on the right.
2. Click `mps-tests`.
3. Click `mps-aspect-generator`.

**Should see**
- Step 1: the name; the **whole** description, `Follow the project's code style. Use before committing
  Kotlin or Java changes.`; the link `.github/skills/code-style/SKILL.md`; and the text of its `SKILL.md`,
  from the `---` of its front matter.
- Step 2: `mps-tests` is highlighted in the list; on the right, `also in .claude/skills/mps-tests/SKILL.md`.
- Step 3: on the right, `part of the product: plugins/mcp-tools/resources`.
- In every step, the right side has only those lines and the `SKILL.md` text: no empty or stray line
  (such as `null`) where a skill has no copies or is not part of the product.

## 4. The keyboard
**Steps**
1. Click `code-style`, then press `↓` twice.
2. Press `Enter`.

**Should see**
- Step 1: the focus moves to `commits`, then to `mps-aspect-generator`; the right side still shows `code-style`.
- Step 2: `mps-aspect-generator` is selected and shown on the right.

## 5. A repository in the address
**Steps**
1. Open http://127.0.0.1:4173/?repository=./fixture.

**Should see**
- The field is filled with `./fixture`, and the scan of case 2 is there with no click.

## 6. An unreachable repository
**Steps**
1. Type `./nope` in the field and press **Scan**.

**Should see**
- In place of the result, in red: `Not a GitHub URL or a readable directory: ./nope`.
- No skills and no filter field.
