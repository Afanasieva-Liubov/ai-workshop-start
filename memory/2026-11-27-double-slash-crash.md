# A request target is a path: `new URL('//a', base)` reads `a` as a host
Task: #47, 2026-11-27

- `new URL(target, 'http://localhost')` treats `//x` as protocol-relative: `//` and `/\` throw, `//a` gives
  `/` (the page, 200). Fixed by parsing `http://localhost${target}`; decided: `//a` → 404, as any unknown path.
- A throw in the async `createServer` handler is an unhandledRejection: it stops `serve` and, in-process, the
  whole `node --test` file. Raw targets need `node:net` (fetch and curl without `--path-as-is` normalize them).
- `npm run test:e2e` fails here with "GitHub rate limit reached" even with `GITHUB_TOKEN` set, on main too.
- The selected skill in the web view shows `nullnull` under its link (in the `web-scanned` baseline): not fixed.
