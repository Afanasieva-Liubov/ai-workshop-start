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
## Server
- Listens on `127.0.0.1` only; a request whose `Host` is not `127.0.0.1:<port>` or `localhost:<port>` → `403`
- `GET /api/scan?repository=<link>` → the scan as JSON: `repository`, `skills` (each with its `link` and
  `text`, the SKILL.md), `warnings`
- An empty field or an unreachable repository → `400` with `{ "error": <the CLI's message> }`
- A bad port (not only digits, or above 65535) → the usage, exit code 1; a port in use → a clear message, exit code 1
