# In a code-review run, SLACK_BOT_TOKEN is set and slack.com is reachable
Task: review of #37, 2026-11-27

- Unlike the issue-to-pr run of #36, this review run had `SLACK_BOT_TOKEN` set, and slack.com answered.
  So a "test" curl to `chat.postMessage` posts for real. Delete your own test message with
  `chat.delete` (channel + ts), or test with `conversations.replies` (read-only) instead.
- To show a network-level curl failure without breaking anything: `curl --resolve slack.com:443:127.0.0.1 ...`
  prints nothing and exits 7.
