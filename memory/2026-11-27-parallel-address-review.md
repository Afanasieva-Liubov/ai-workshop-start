# Two address-review runs can answer the same inline comment: trust the remote, not the replies
Task: review of #43, 2026-11-27

- On #43 two address-review runs replied "Taking this one." to the same comment, and each said it fixed it
  differently (`8a2ab28` pushed; `04bd30e` "will show up" but never did). Check the head with
  `git ls-remote origin refs/heads/<branch>` and review only what is there.
- `git fetch --unshallow` brings the history back in this shallow clone; after it, `git diff <before> <after>` works.
