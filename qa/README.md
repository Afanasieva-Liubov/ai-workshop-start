# QA test scripts

The standard manual checks of Skill Atlas: each script has its steps and what a tester should see.
[spec/](../spec/) says what the product does; these scripts are how to check it by hand.

| Script | Checks | Spec |
| --- | --- | --- |
| [cli-scan.md](cli-scan.md) | `scan`: every skill of a repository, and the edge cases | [analysis](../spec/analysis.md), [cli](../spec/cli.md#output) |
| [cli-filter.md](cli-filter.md) | `scan … [words…]`: the filter | [cli](../spec/cli.md#filter) |
| [cli-errors.md](cli-errors.md) | `help`, wrong commands, wrong input | [cli](../spec/cli.md), [web](../spec/web.md#server) |
| [web-view.md](web-view.md) | `serve`: the page and a selected skill | [web](../spec/web.md#page) |
| [web-filter.md](web-filter.md) | `serve`: the filter field | [web](../spec/web.md#filter) |
| [github.md](github.md) | a real GitHub repository at a fixed commit | [analysis](../spec/analysis.md#details) |

## Before you start
- Node 24 or newer; a terminal in the root of the checkout; a browser for the web scripts.
- `npm ci`, once.
- The scripts run on [fixture/](../fixture/README.md), a small repository with one skill per case, so
  they need no network; only [github.md](github.md) does.
- The exit code of the last command: `echo $?`.
- `<checkout>` in the expected output is the absolute path of your checkout.

## Reporting
A step passes when you see exactly what its **Should see** says. Otherwise it fails: open an issue with
the script and the step number, the command, and what you saw instead.
Label it `Delegated to AI`, so that an agent picks it up and fixes it.
Only for a **blocking** failure (the step cannot be done, or its result is wrong or missing); a
non-blocking one (the result is right, only the look is off) goes in the report, with no issue.
