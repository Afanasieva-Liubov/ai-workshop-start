# Slack fails in issue-to-pr runs because of the Air environment, not the skill
Task: Slack setup for issue-to-pr, 2026-11-27

- In the issue-to-pr sandbox, api.github.com answers but slack.com, hooks.slack.com and google.com
  all fail with curl exit 35 (TLS EOF): an egress allowlist, not a Slack outage.
- The fix is outside the repo: the `SLACK_BOT_TOKEN` secret and `slack.com` egress in the Air
  environment; the code-review environment of #37 already had both.
