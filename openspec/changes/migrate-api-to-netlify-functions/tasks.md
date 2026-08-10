## 1. Shared helpers

- [x] 1.1 Add `lib/auth.mjs`: timing-safe `X-Portal-Password` check that fails closed
      below 12 characters
- [x] 1.2 Add `lib/google.mjs`: lazily built, per-instance-cached Sheets and Drive
      clients
- [x] 1.3 Add `lib/http.mjs`: `json`, `methodNotAllowed`, `readJsonObject`, and a
      `serverError` that logs the real error and returns a generic message
- [x] 1.4 Add `lib/validate.mjs`: length caps, control-character stripping,
      `http(s)`-only URLs, and real `YYYY-MM-DD` dates
- [x] 1.5 Add `lib/telegram.mjs`: one `sendMessage` over `fetch`, HTML-escaped, under
      an 8-second abort timeout
- [x] 1.6 Track all five `lib/*.mjs` files in git — they are currently untracked

## 2. Netlify Functions

- [x] 2.1 Add `netlify/functions/create-task.mjs`: reject non-`POST`, then
      `requirePassword`, then `readJsonObject`, then `validateTaskInput`
- [x] 2.2 Append the Sheet row with `valueInputOption: 'RAW'`, then provision the
      Drive folder, copy the intro template, and notify Telegram — using only
      validated values
- [x] 2.3 Return `502` when the Sheet append is rejected; keep Drive and Telegram
      failures non-fatal and drop `driveErrorMessage` from the response
- [x] 2.4 Add `netlify/functions/tasks.mjs`: reject non-`GET`, then
      `requirePassword`, then read `Tasks!A2:I` and map rows to task objects
- [x] 2.5 Return `502` when the Sheet read is rejected, instead of an empty list
- [x] 2.6 Route every response through `json` so `no-store` and the JSON content type
      are applied uniformly
      — was ticked prematurely: `methodNotAllowed` and the `503` in `lib/auth.mjs`
      built their own `Response` and omitted `no-store`. Both now go through `json`,
      which takes an optional extra-headers argument for `Allow`

## 3. Deployment configuration

- [x] 3.1 Add `netlify.toml` with `publish = "public"`,
      `functions = "netlify/functions"`, and `NODE_VERSION = "22"`
- [x] 3.2 Rewrite `/api/create-task` and `/api/tasks` onto the functions with
      `status = 200`, keeping the browser same-origin
- [x] 3.3 Declare the site CSP and the framing, sniffing, referrer, permissions, and
      HSTS headers, plus `no-store` for `/api/*`
- [x] 3.4 Add `PORTAL_PASSWORD` to `.env.example` with the length rule and a
      generation command
- [ ] 3.5 Set `PORTAL_PASSWORD` (12+ characters) alongside the Google and Telegram
      variables in the Netlify site environment
- [ ] 3.6 Link the repository to a Netlify site and confirm the first deploy serves
      `public/`

## 4. Retire the Express server

- [x] 4.1 Delete `server.js` and `api/create-task.js`
- [x] 4.2 Delete the stale root-level `app.js` and `index.html`, which duplicated an
      older `public/` and were served by nothing
- [x] 4.3 Drop `express`, `cors`, and `node-telegram-bot-api`; move `dotenv` to
      dev dependencies; upgrade `googleapis`; replace `start`/`dev` with `netlify dev`
- [x] 4.4 Stop `.gitignore`'s `*.json` secret rule from excluding
      `package-lock.json`, and ignore `.netlify/`
- [x] 4.5 Confirm nothing still imports the deleted modules, and that
      `npm run audit` is clean

## 5. Verify end to end

Tasks 5.1–5.5 are verified by invoking the function handlers directly with no
Google credentials configured, so a skipped guard would surface as a `500`
instead of the expected status. 5.6–5.10 need live credentials and a browser.

- [x] 5.1 With `PORTAL_PASSWORD` unset, confirm both endpoints answer `503`
- [x] 5.2 With it set too short, confirm both endpoints still answer `503`
- [x] 5.3 Confirm a request with no or wrong header answers `401`, and that no row
      appears in the Sheet
- [x] 5.4 Confirm a wrong method answers `405` with the right `Allow` header, even
      without a password
- [x] 5.5 Confirm each validation rule rejects with `400`: non-string field,
      over-cap `taskName`, `javascript:` `formUrl`, and `eventDate` of `2026-13-01`
- [ ] 5.6 Submit `=IMPORTDATA("https://example.com")` as a task name and confirm the
      cell holds it as text, not as a formula
      — code verified to pass `valueInputOption: 'RAW'`; the cell itself is unchecked
- [ ] 5.7 Confirm a valid submission appends one row, creates
      `Project - <taskName>` with the intro copy inside it, and posts to Telegram
- [ ] 5.8 Submit a task name containing `<b>` and confirm the Telegram message shows
      it as text
      — code verified to HTML-escape every user value; the delivered message is unchecked
- [ ] 5.9 Revoke the service account's Sheet access and confirm `GET /api/tasks`
      answers `502`; restore access afterwards
- [ ] 5.10 In the browser, confirm the unlock screen accepts the password, the
      dashboard loads, a wrong password re-locks the portal, and the console reports
      no CSP violations

## 6. Documentation

- [x] 6.1 Rewrite `DEPLOYMENT.md` for Netlify, replacing the Render, Railway, and
      GitHub Pages sections
- [x] 6.2 Update `README.md`: directory tree, architecture, prerequisites, local run
      steps, and the `PORTAL_PASSWORD` requirement
- [x] 6.3 Document password rotation — change the Netlify variable, redeploy, tell
      the team
- [x] 6.4 Note in `README.md` that `debug-google.mjs`, `test-create-task.mjs`, and
      `test-sheet-write.mjs` are hand-run diagnostics, and check whether they still
      work against the new layout
      — `test-create-task.mjs` was broken (port 3000, no password header, undeclared
      `node-fetch`) and has been repaired; `test-sheet-write.mjs` moved to `RAW`
