---
name: status-update
description: Post a status update of this repository to the private Slack channel ai-workshop_private, with the pull requests merged and the issues resolved since a given date and time. Use when asked for a status update, a digest or a report of what was merged or done since a date.
---

# Status update

What happened in this repository since a date and time: the pull requests **merged** and the issues
**resolved**, as one message in the private Slack channel `ai-workshop_private` (`C0CMGGBUN49`),
posted with the bot token in `$SLACK_BOT_TOKEN` (never print it or write it anywhere).

## The start
The date and time come with the request ("since 2026-11-27 09:00", "since Monday 14:00 CET").
- With a time zone → as given. Without one → UTC; the message says "UTC", so it can be seen.
- A date with no time → 00:00 of that day.
- A scheduled run with no date → the previous scheduled time of the trigger.
- None of these → stop and say so; do not pick one.

Write it as ISO 8601, `<since>`, e.g. `2026-11-27T09:00:00Z` or `2026-11-27T10:00:00+01:00`
(GitHub search takes both). "Since" includes that moment; the end is now.

## Before you start
Check Slack first, read-only, as [issue-to-pr](../issue-to-pr/SKILL.md#ask-on-slack) does:
```
curl -sS https://slack.com/api/auth.test -H "Authorization: Bearer $SLACK_BOT_TOKEN"
```
`"ok":true` → go on. Otherwise stop, post nothing elsewhere, and say which is missing: the token
(unset), the network (curl exit 6, 7, 28 or 35, no JSON), or the token is bad (`"ok":false` and its
`error`); what to set up is in issue-to-pr's **Setup**. The bot needs `chat:write` and must be a
member of the channel.

## What counts
- **Merged pull requests**: merged at or after `<since>`. Closed without a merge → not counted.
- **Resolved issues**: closed as *completed* at or after `<since>`. Closed as *not planned* or as a
  duplicate → not counted. Still open, even with a merged PR → not counted.

## Collect
From the checkout (`gh` picks the repository from it); no `jq` needed, `gh -q` is enough:
```
gh pr list --state merged --search "merged:>=<since> sort:created-asc" --limit 200 \
  --json number,title,url \
  -q '.[] | "• <\(.url)|#\(.number)> \(.title | gsub("&";"&amp;") | gsub("<";"&lt;") | gsub(">";"&gt;"))"'
gh issue list --state closed --search "closed:>=<since> reason:completed sort:created-asc" --limit 200 \
  --json number,title,url \
  -q '.[] | "• <\(.url)|#\(.number)> \(.title | gsub("&";"&amp;") | gsub("<";"&lt;") | gsub(">";"&gt;"))"'
```
Each line is a Slack link to the PR or issue, then its title; `&`, `<` and `>` are escaped, as Slack
needs. 200 lines in a list → there may be more: say "200 or more" and give the GitHub search link.

## The message
One message, in Slack's markup:
```
*<repository>: status update since <since, as the user gave it, with its zone>*

*Merged pull requests (<count>)*
• <https://github.com/…/pull/46|#46> A red-agent skill: …

*Resolved issues (<count>)*
• <https://github.com/…/issues/45|#45> .agents/skills/red-agent/SKILL.md

Produced by Air Automations. Name: <automation> / Run: <run link>
```
- `<repository>` is `owner/name` (`gh repo view --json nameWithOwner -q .nameWithOwner`).
- An empty list → its heading with `(0)` and the line `• none`. Both empty → still post: "nothing
  since" is a status too.
- Facts only: no opinion, no summary of what is not in GitHub.
- The signature line only under Air (an automation name and a run link exist); otherwise leave it out.

Write it to a file outside the checkout (`/tmp/status-update.txt`: no shell quoting of titles), and post it:
```
curl -s https://slack.com/api/chat.postMessage -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  --data-urlencode channel=C0CMGGBUN49 --data-urlencode "text@/tmp/status-update.txt"
```
The answer must be `"ok":true`; keep its `ts`. `"ok":false` → say its `error` (e.g. `not_in_channel`,
`missing_scope`) and stop; do not post it anywhere else.

## The report
Your final message: `<since>` as used, the two counts, the `ts` of the Slack message (or why it was not
posted), and the message text itself.
Post once: a second run for the same `<since>` posts a second message; to fix a wrong one, delete it
with `chat.delete` (channel + `ts`), then post again.
