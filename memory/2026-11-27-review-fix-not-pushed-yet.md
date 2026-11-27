# A reply "Fixed in <sha>" can come before that commit is pushed
Task: #46 (re-review), 2026-11-27

- Address-review replies name their fix commit while their run is still going; the platform pushes it when the run ends.
  Check `git ls-remote origin <branch>` and `gh api repos/<owner>/<repo>/commits/<sha>` before you count the comment as fixed.
  Not there yet → the comment stays open, no label; the push of the fix triggers the next review.
