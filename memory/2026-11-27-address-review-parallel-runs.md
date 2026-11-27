# Parallel address-review runs race on the same comment: fetch the branch right before you commit
Task: #46, 2026-11-27

- Each review (and each push) starts a new address-review run, so several worked on one comment at once.
  One pushed its fix (e9b97c0) while this run was still editing the same lines.
- Before you commit, `git ls-remote origin <branch>`; it moved → `git fetch`, and diff it. Already fixed
  there → drop your copy (`git reset --hard FETCH_HEAD`), and reply that the comment is fixed in their sha.
- Under the push-to-source output, do not `git push` yourself, even though address-review-push-yourself.md
  says to: the platform pushes after the run. So never reply "fixed in <sha>" for an unpushed sha of your own.
