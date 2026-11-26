# CLI: help and wrong input

Checks that the CLI explains itself, and that every mistake gets a clear message and the exit code `1`.
Run `echo $?` after each command.

## 1. Help
**Steps**
1. Run `./skill-atlas help`.
2. Run `./skill-atlas` with no command.

**Should see**
- Both print the same usage: `Usage: skill-atlas <command>`, then the lines for `scan`, `serve` and `help`.
- The exit code is `0`.

## 2. An unknown command
**Steps**
1. Run `./skill-atlas bogus`.

**Should see**
- `Unknown command: bogus`, an empty line, then the usage of case 1.
- The exit code is `1`.

## 3. `scan` with no repository
**Steps**
1. Run `./skill-atlas scan`.

**Should see**
- `Usage: skill-atlas scan <GitHub URL | directory> [words…]`
- The exit code is `1`.

## 4. An unreachable repository
**Steps**
1. Run `./skill-atlas scan ./nope`.

**Should see**
- `Not a GitHub URL or a readable directory: ./nope`
- The exit code is `1`; no stack trace.

## 5. A bad port
**Steps**
1. Run `./skill-atlas serve abc`.
2. Run `./skill-atlas serve 70000`.

**Should see**
- Both print `Usage: skill-atlas serve [port]` and return to the prompt: no server starts.
- The exit code is `1`.

## 6. A port in use
**Steps**
1. Run `./skill-atlas serve 4199` and leave it running.
2. In a second terminal, run `./skill-atlas serve 4199`.
3. Stop the first one with `Ctrl+C`.

**Should see**
- Step 1: `Skill Atlas web view: http://127.0.0.1:4199/`, and it keeps running.
- Step 2: `Port 4199 is in use; try another: skill-atlas serve <port>`; the exit code is `1`.
