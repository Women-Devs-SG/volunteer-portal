## Context

The `lib/` helpers are written for a Fetch-API runtime — `auth.mjs` (timing-safe
password comparison, fail-closed), `google.mjs` (Sheets and Drive clients built
lazily and cached per instance), `http.mjs` (JSON responses, `405`, body parsing,
generic `500`), `validate.mjs` (per-field caps, control-character stripping,
`http(s)`-only URLs, `YYYY-MM-DD` dates), and `telegram.mjs` (one `sendMessage`
over `fetch`). The frontend in `public/` already sends `X-Portal-Password` and
re-locks on `401`. What was missing is the two handlers in between, and the removal
of the Express server they replace.

Constraints that shape the approach:

- Volunteers, not an ops team, operate this. One shared password in the Netlify UI
  is the realistic ceiling; per-user accounts are not.
- The Google service account holds Editor rights on a real operations Sheet and
  Drive folder, so an unauthenticated write path is the material risk.
- Records are read and edited by humans directly in the Sheet, so anything written
  there is later opened by a person with edit rights.
- No test framework exists, and adding one is not part of this change.

## Goals / Non-Goals

**Goals:**

- No request reaches Google or Telegram without a valid password.
- Reject malformed input before it can reach the Sheet, a Drive folder name, or a
  notification.
- Nothing a submitter types can execute — as a spreadsheet formula, as HTML in the
  Telegram message, or as markup in the dashboard.
- Keep both endpoint URLs and the entire `public/` contract unchanged.
- One runtime, one deployment target, no dead server code left behind.

**Non-Goals:**

- Per-user identity, sessions, roles, or an audit trail.
- Rate limiting or brute-force lockout.
- Editing or deleting tasks; the API stays create-and-list.
- A test suite, and any change to the Sheet's column layout.

## Decisions

**Netlify Functions v2 over keeping Express.** Each handler is an ESM module with a
default `(req) => Response` export, so `lib/`'s Fetch-API helpers mount directly with
no adapter. `netlify.toml` rewrites `/api/create-task` and `/api/tasks` onto the
functions with `status = 200`, so the browser keeps calling the same paths and stays
same-origin — which is what lets `cors` go. Netlify serves `public/` as the publish
directory, removing `express.static`, and injects environment variables, removing
`dotenv` from production (it stays as a dev dependency for `netlify dev`).
Alternative considered: mount the password check as Express middleware and deploy to
Render. Rejected because it means rewriting all four helpers against `req`/`res`, and
a long-running process earns nothing for two stateless handlers.

**Shared password in a header, compared timing-safely, failing closed.** An unset or
under-12-character `PORTAL_PASSWORD` returns `503` for every request rather than
defaulting to open — a misconfigured deploy must not be a public one. Rejected
alternatives: Netlify Identity (too much operational overhead for a handful of
volunteers) and HTTP Basic auth (browser-native, but the credential prompt cannot be
styled and the browser caches it past tab close, which is what `sessionStorage`
deliberately avoids).

**Validate to a clean value object, then use only that.** `validateTaskInput`
returns the sanitised fields; handlers never touch the raw body afterwards.
Rejecting non-strings matters because a nested object or array reaching a Sheet cell
corrupts the row, and stripping control characters stops a crafted `taskName` from
forging line breaks inside the notification message.

**`RAW` instead of `USER_ENTERED` for the Sheet append.** This is the formula
injection fix: under `USER_ENTERED`, a `taskName` of `=IMPORTDATA(...)` is stored as
a live formula that runs with the sheet owner's access. The trade-off is real —
`eventDate` and the QR URL land as plain text rather than a native date and a
clickable link — and it is accepted, because the alternatives (stripping a leading
`=`, `+`, `-`, `@`, or prefixing an apostrophe) all mangle legitimate input and are
easy to get subtly wrong.

**`502` for upstream Google failures, `500` only for our own bugs.** A rejected
Sheets call is an upstream dependency failing, not an internal error, and the
distinction is visible in Netlify's logs when triaging. The caller still gets a
message with no internal detail: `Could not save the task to the sheet database.` or
`Could not load tasks from the sheet database.`

**An unreadable Sheet becomes an error response.** Previously it returned `200` with
an empty array, so a revoked service account was indistinguishable from a brand-new
deployment. `public/app.js` already renders the message from a non-`ok` listing
response, so this needs no frontend change.

**`fetch` instead of `node-telegram-bot-api`.** The package depends on the
deprecated `request` library, which carries a CRLF-injection advisory in `form-data`
and an unsafe-random-boundary advisory — a large surface for one HTTP POST. The
replacement uses HTML parse mode with `&`, `<`, and `>` escaped in every
user-supplied value, and builds the folder link only from a Google-issued
`https://` URL. Link previews are disabled: with previews on, Telegram fetches the
Drive link server-side on every notification, which is noise the team did not ask
for. An 8-second `AbortController` timeout bounds the request so a hanging Telegram
API cannot stretch the function's billed duration, and failures log the HTTP status
only — never the response body, which can echo the bot token back.

**Drive errors are described, not quoted.** The old response returned
`driveErrorMessage` with the raw Google error string. The success message now says
the folder could not be created and stops there; the real error goes to the log.

**Site-wide headers in `netlify.toml`.** `Cache-Control: no-store` on `/api/*` at the
edge backs up the same header set by `lib/http.mjs`. The CSP is strict —
`default-src 'none'`, `script-src 'self'`, `frame-ancestors 'none'`, `form-action
'none'` — because the portal loads no third-party scripts, fonts, or images.
`style-src` keeps `'unsafe-inline'` only because `index.html` carries its CSS in a
`<style>` block; extracting that to a file is a follow-up, not part of this change.

## Risks / Trade-offs

- **A shared password is weak by construction.** No per-user attribution, and
  rotation means telling everyone at once. Accepted: it is a large improvement over
  none, and the fail-closed length floor blocks the worst misconfigurations.
- **No rate limiting.** A 12-character minimum plus timing-safe comparison is the
  only brute-force defence. Netlify rate limiting can be layered on later.
- **The password is only as private as the browser tab.** It lives in
  `sessionStorage` and is readable by any script on the page; the CSP forbidding
  third-party scripts is what keeps that acceptable.
- **`RAW` writes lose native date and link formatting** in the Sheet, as above.
- **Cold starts.** `getGoogleClients()` caches per instance, so the first request
  after a scale-to-zero pays the auth handshake. Fine for interactive use.
- **The QR URL still points at a third-party service** (`api.qrserver.com`). Nothing
  renders it as an image any more, so the CSP's `img-src 'self' data:` does not
  break the dashboard — but the link an operator opens does hand the form URL to
  that service. Unchanged from before; worth revisiting separately.
- **Local development changes shape.** `npm start` gives way to `netlify dev`, which
  requires the Netlify CLI and a linked site. Deleting `server.js` removes the
  fallback, which is why `DEPLOYMENT.md` is rewritten in the same change.
