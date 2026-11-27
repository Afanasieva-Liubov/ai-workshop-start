# A non-blocking review "note" that the spec overstates the code: fix the spec wording, not the code
Task: #53, 2026-11-27

- Code Review flagged "Case-insensitive in every script" as saying more than the filter does (`STRASSE` ≠ `straße`,
  `istanbul` ≠ `İSTANBUL`). Full Unicode case folding would be a design decision, so only the spec line was narrowed
  to "in Greek too", the wording the tests already use. Real folding → a separate issue.
- Manual QA's `null` failure (web-view case 3) is on `main` too: out of scope for a PR that does not touch `show()`.
