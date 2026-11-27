---
name: issue-to-pr
description: Implement a GitHub issue of this repository with its spec and integration tests, and open a pull request for it. Use when an issue is labeled "Delegated to AI", or when asked to implement, fix or pick up an issue.
---

# Issue to pull request

## The issue
Usually an automation starts you when an issue is labeled **Delegated to AI**; that issue is the one.
- Given a number or a link (or the trigger's issue): `gh issue view <n> --comments`.
- Given none: the oldest open issue labeled `Delegated to AI` with no linked pull request
  (`gh issue list --state open --label "Delegated to AI" --search "-linked:pr sort:created-asc" --limit 1`).
  None → stop and say so; do not invent work.
- Not labeled `Delegated to AI`, closed, or already has an open PR → stop: it is not yours, or it is done.
- Unclear, leaves a decision open, or asks for something the [spec](../../../spec/) contradicts →
  do not guess: [ask on Slack](#ask-on-slack).

## Ask on Slack
One question, in Slack channel `C0CMGGBUN49`, with the bot token in `$SLACK_BOT_TOKEN`
(never print it or write it anywhere).

**Setup.** Slack works only when the Air environment of the run has both:
- the secret `SLACK_BOT_TOKEN`: a bot token with `chat:write` and `channels:history`, in the channel;
  Air passes the agent only the env vars named in `FLEET_WORKSPACE_AGENT_ENV_VARIABLES_ALLOWLIST`,
  so `SLACK_BOT_TOKEN` must be on that list too;
- network access to `slack.com` (the sandbox may allow only some hosts, such as GitHub).

Check both first, read-only:
```
curl -sS https://slack.com/api/auth.test -H "Authorization: Bearer $SLACK_BOT_TOKEN"
```
`"ok":true` → ask. Otherwise note which is missing: the token (unset), the network (curl exit 6,
7, 28 or 35, no JSON), or the token is bad (`"ok":false` and its `error`), and fall back below.

Say the issue link, what is open, and the options you see:
```
curl -s https://slack.com/api/chat.postMessage -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  --data-urlencode channel=C0CMGGBUN49 --data-urlencode "text=<issue url>: <the question>"
```
Keep the `ts` of Slack's answer: it is the thread. Then wait for the reply **in that thread**: check it
every few minutes (about 5), for up to an hour:
```
curl -s -G https://slack.com/api/conversations.replies -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  --data-urlencode channel=C0CMGGBUN49 --data-urlencode ts=<ts>
```
The reply is a message after the first one, from a person (no `bot_id`).
- A reply → follow it and go on; say the question and the answer in the PR body.
- No reply after the hour, `$SLACK_BOT_TOKEN` not set, curl fails or prints no JSON (Slack not
  reached: a DNS, TLS or connection error), or Slack answers `"ok": false` → comment on the issue
  with the question (`gh issue comment`) and stop. In the comment, and in your final message, say
  why Slack was not used and what to set up (see **Setup**), e.g. "Slack not used: `SLACK_BOT_TOKEN`
  is not set and slack.com is blocked (curl exit 35); add the secret and allow `slack.com` in the
  Air environment".

## Before you start
- Read [spec/](../../../spec/) and [AGENTS.md](../../../AGENTS.md).
- `npm ci`, then `npm test`: note what already fails, so you do not take the blame for it, or hide it.
- From an up-to-date `main`: `git switch -c issue-<n>-<short-slug>`.

## The change
1. **Spec first.** Update `spec/` for the new or changed behaviour, in its style: short lines, the
   case and its example path. A bug the spec already covers needs no spec change.
2. **Test.** An integration test in `tests/` for every case the issue adds or touches, using
   [fixture/](../../../fixture/README.md) (extend it if a case is missing). It must fail before the fix.
3. **Code.** The smallest change that makes it pass. Core stays fetch → find → parse; the CLI and
   the web view stay thin clients.
4. **Done** when all of these pass:
   - `npm run typecheck`
   - `npm test`
   - `./skill-atlas scan ./fixture` exits 0
   - `npm run test:e2e` if `GITHUB_TOKEN` is set; if the output changes on purpose, update
     `e2e/expected` with `UPDATE_EXPECTED=1` and say why in the PR.

Stay in scope: no unrelated refactors or drive-by fixes; note them in the PR instead.

## The pull request
- Commit: `<what changed> (#<n>)`.
- `git push -u origin HEAD`, then `gh pr create --base main`:
  - **Title**: what the user gets, not the file names.
  - **Body**: `Closes #<n>`; a few sentences on what and why; the spec cases added or changed;
    the tests that cover them; how to check it by hand (a `./skill-atlas` command and its output).
  - A demo video, when applicable: record it as [demo-video](../demo-video/SKILL.md) says, before
    the push, and link it in the body. Not applicable → say so.
- Watch CI (`gh pr checks --watch`). Red → fix it on the branch; a PR is ready only when green.
- Comment on the issue with the PR link (`gh issue comment <n> --body "<pr url>"`).
- [Finished](#finished): the comment `issue-to-pr FINISHED` on the PR.
- Do not merge.

## After the pull request
Stay in the same session **for an hour**, and check the PR **every few minutes** (about 5):
- `gh pr view <pr> --json state,reviewDecision,comments,reviews` and
  `gh api repos/{owner}/{repo}/pulls/<pr>/comments` for inline comments; `gh pr checks <pr>` for CI.
- New review comments or a red CI → handle them as [address-review](../address-review/SKILL.md) says,
  on the same branch; once the update is pushed and CI is green, [Finished](#finished) again; then
  keep checking.
- Merged or closed → stop.
- After the hour, stop: Air cannot continue a finished session; later reviews are picked up by a
  separate automation that follows [address-review](../address-review/SKILL.md).

## Finished
Each time the PR is opened or updated (a push to its branch) and its CI is green, one comment on
the PR, with exactly this text and nothing else:

```
gh pr comment <pr> --body "issue-to-pr FINISHED"
```
