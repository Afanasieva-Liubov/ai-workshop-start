# Open questions go to Slack: the choices #36 left open
Task: #36, 2026-11-27

- "Wait for the reply" had no limit: read as up to an hour, checked about every 5 minutes, like the
  wait after the pull request in issue-to-pr.
- No reply, no `SLACK_BOT_TOKEN`, or a Slack error → the old way: the question as an issue comment, stop.
- `SLACK_BOT_TOKEN` was not set in the Air run of #36; the bot needs `chat:write` and `channels:history`.
- slack.com was unreachable from that run (curl exit 35, TLS error), and `jq` is not installed:
  the skill's curl calls use form fields, not JSON, so they need no `jq`.
