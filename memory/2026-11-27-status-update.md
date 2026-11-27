# status-update: "your private channel" is C0CMGGBUN49, and how #51 was read
Task: #51, 2026-11-27

- `conversations.info` on `C0CMGGBUN49` says `ai-workshop_private`, `is_private: true`, bot a member:
  that is "your private channel". This issue-to-pr run had `SLACK_BOT_TOKEN` and slack.com reachable.
- "Resolved issues" was read as closed as completed (`reason:completed`), not not-planned or duplicate.
  A time with no zone → UTC, said in the message; no time at all → stop, no default.
- GitHub search takes a time in `merged:>=`/`closed:>=` (`2026-11-27T10:00:00+01:00` works). In a
  YAML `description`, a `: ` breaks the front matter (skill-atlas warns): reword it.
- The trial post was deleted with `chat.delete` right after it was read back.
