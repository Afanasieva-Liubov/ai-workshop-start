# Web view: the filter

Checks the [filter field](../spec/web.md#filter) of the web view: the same rule as the
[CLI filter](cli-filter.md).

**Before**: run `./skill-atlas serve` in the root of the checkout and leave it running, then open
http://127.0.0.1:4173/?repository=./fixture: `fixture · 6 skills`, `code-style` selected.

## 1. Filter as you type
**Steps**
1. Type `mps` in the filter field above the skills.

**Should see**
- The list shrinks as you type, with no `Scanning…` message: there is no new scan.
- Only `mps-aspect-generator` and `mps-tests` are left; the count is `fixture · 2 of 6 skills`.
- The right side is empty: the selected `code-style` no longer matches.
- The address ends with `?repository=.%2Ffixture&filter=mps`.

## 2. Every word, in any case
**Steps**
1. Replace the filter with `MPS test`.

**Should see**
- Only `mps-tests`; the count is `fixture · 1 of 6 skills`.

## 3. The arrow keys skip the hidden skills
**Steps**
1. Replace the filter with `repository`.
2. Click `commits`, then press `↓`.

**Should see**
- Step 1: only `commits` and `writing-lint-checks`; `fixture · 2 of 6 skills`.
- Step 2: the focus moves straight to `writing-lint-checks`, over the three skills hidden between them.

## 4. No match
**Steps**
1. Replace the filter with `zzz`.
2. Clear the filter field.

**Should see**
- Step 1: `no skills match "zzz"` in place of the list; the count is `fixture · 0 of 6 skills`.
- Step 2: all six skills are back; the count is `fixture · 6 skills`; the address has no `filter=`.

## 5. A filter in the address
**Steps**
1. Open http://127.0.0.1:4173/?repository=./fixture&filter=test.

**Should see**
- The filter field is filled with `test`; the count is `fixture · 1 of 6 skills`.
- Only `mps-tests` is in the list, and it is selected and shown on the right.
