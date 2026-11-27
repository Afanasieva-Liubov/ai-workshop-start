# Air issue-to-pr runs get no SLACK_BOT_TOKEN: the env allowlist does not include it
Task: why "Make the skill list nicer" was asked on GitHub, not Slack, 2026-11-27

- `FLEET_WORKSPACE_AGENT_ENV_VARIABLES_ALLOWLIST` lists the env vars passed to the agent; in this run it
  was only `GITHUB_COPILOT_TOKEN,AIR_STARTUP_MODE`. `SLACK_BOT_TOKEN` must be added there (and the
  secret defined) in the Air environment that the "Delegated to AI" automation uses.
- slack.com was unreachable too (`curl https://slack.com/api/api.test` → exit 35, TLS error): the
  network egress for that environment must allow slack.com. The code-review run's environment had both.
