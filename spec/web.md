# Web view
`./skill-atlas serve [port]` → a local web view at `http://127.0.0.1:<port>/`, 4173 by default; it prints the URL
and runs until stopped. *Nothing is stored*.
## Page
- A **field for a repository link**: a GitHub URL (`/tree/<commit | branch | tag>` too) or a local directory
- Its **skills**: the same scan as the CLI, the same order; name, the description's *first sentence*, a
  `product` badge, the number of copies
- A selected skill: name, description, link (the *scanned commit*), `also in`, `part of the product`, and its
  **SKILL.md** as it is in the repository
- Warnings under the field; an error → its clear message in place of the result
- `?repository=<link>` in the address scans it on load
## Filter
- A **filter field** above the skills; it filters as you type, *with no new scan*
- The same rule as the [CLI](cli.md#filter): every word, in the name or the description, case-insensitive
- The count shows `<n> of <total> skills`; no match → `no skills match "<words>"`
- `?filter=<words>` in the address fills it on load (with `?repository=`); typing updates the address
- The selected skill stays shown only while it matches
- On load, the first *matching* skill is selected; the arrow keys skip the skills it hides
## Server
- Listens on `127.0.0.1` only; a request whose `Host` is not `127.0.0.1:<port>` or `localhost:<port>` → `403`
- `GET /api/scan?repository=<link>` → the scan as JSON: `repository`, `skills` (each with its `link` and
  `text`, the SKILL.md), `warnings`; *never filtered*: the page filters it
- An empty field or an unreachable repository → `400` with `{ "error": <the CLI's message> }`
- A bad port (not only digits, or above 65535) → the usage, exit code 1; a port in use → a clear message, exit code 1
- A port this user may not open (below 1024, not root) → a clear message, exit code 1: `serve 80`
