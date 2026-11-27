# address-review: push the fix yourself, then check it is on the PR
Task: #37, 2026-11-27

- An earlier address-review run committed its fix (a4f5c77), replied "Fixed in a4f5c77" and posted
  FINISHED, but left the push to the platform. The commit never reached GitHub, so the thread said
  the problem was fixed when it wasn't.
- `git push` to the PR branch yourself. Before you reply "fixed in <sha>", check that
  `gh pr view <pr> --json commits` lists the sha.
