# A review's own memory commit re-triggers the review: check what the push changed first
Task: #46 (re-review), 2026-11-27

- Under Air, a review run's memory note is pushed to the PR branch, and that push fires a new review.
  Compare the trigger's `before`..`after` (`git diff <before>..HEAD --stat`, after `git fetch --unshallow`):
  only `memory/` → nothing new to review. Open inline comments stay as they are, no label, then `code-review FINISHED`.
