## Context

Both functions currently follow the same order: method check, `requirePassword`,
then Google work via `getGoogleClients()`, which throws when credentials are absent.
`lib/auth.mjs` deliberately fails closed — an unset or short `PORTAL_PASSWORD`
returns `503` to everything — so a contributor with no `.env` gets a `503` before
any handler logic runs. Demo mode has to slot in ahead of that check without
weakening it for the real deployment.

The live site is the team's internal tool. Whatever switches demo mode on must be
incapable of switching on there, and that has to hold even if someone copies the
whole variable set from a local `.env` into Netlify by hand.

Netlify sets `CONTEXT` on every function invocation — `production`,
`deploy-preview`, `branch-deploy`, or `dev` — which gives a signal the deployment
controls and a local contributor does not need to think about.

## Goals / Non-Goals

**Goals:**

- `cp .env.example .env && npm run dev` yields a working portal with no credentials.
- Demo mode is structurally unreachable on the production site.
- A contributor exercising the demo exercises the real request contract: same
  validation, same status codes, same response shape.
- No fixture resembles a real event, volunteer, or Drive link.

**Non-Goals:**

- Persisting demo tasks across restarts, or between concurrent function instances.
- A public demo deployment. This change makes one possible; it does not create one.
- Faking Drive folder creation or Telegram delivery beyond the response fields.
- Any change to how the real path authenticates.

## Decisions

**Two conditions, not three.** An earlier sketch also required Google credentials to
be absent, so demo mode and real credentials could never coexist. That interacts
badly with a maintainer who keeps real credentials in `.env`: with a stale
`DEMO_MODE=1` they would get a hard refusal on a machine that was working
yesterday. The rule is therefore just: demo mode is on when `DEMO_MODE` is truthy,
except in the `production` context, where its presence is a fatal misconfiguration.
Credentials sitting unused alongside it are harmless, because demo mode never calls
Google. What covers the confusion case is a warning logged on every demo request,
not a refusal.

**`DEMO_MODE` in production is a `503`, not an ignore.** Silently ignoring it would
be defensible — the site would keep working — but it would also mean the one
variable that must never appear in production could appear there indefinitely with
nobody noticing. Failing loudly matches how `lib/auth.mjs` already treats a missing
password: a portal that is misconfigured should stop, not guess. The blast radius is
a variable no deployment needs, and the error message names it directly.

**Demo mode skips the password rather than shipping a demo password.** There is
nothing behind the gate but fixtures, and a documented shared demo password is worse
than none: it trains contributors to expect a password that works, and it is exactly
the kind of string that gets pasted into a real Netlify variable. The frontend needs
no change — its unlock screen calls `GET /api/tasks`, which succeeds in demo mode,
so any typed password unlocks the portal. The README says so plainly.

**Validation still runs.** Demo mode branches after `readJsonObject` and
`validateTaskInput`, not before. A contributor working on validation, or on the
frontend's error rendering, is exercising the real rules. Only the three side
effects — Sheet, Drive, Telegram — are replaced.

**Fixtures are a committed JSON file, not inline literals.** `fixtures/tasks.demo.json`
holds the same shape `GET /api/tasks` returns, so it doubles as a reference for the
response contract and as a place to add a case (a task with no Drive URL, a long
description) without touching code.

**Demo writes go to a scratch file, not memory.** A module-level array was the first
attempt and it does not work: `create-task` and `tasks` are separate functions —
separate invocations under `netlify dev`, and two separate lambdas in production — so
an array populated by one is invisible to the other. A created task returned `200`
and then never appeared in the dashboard, which is worse than not supporting writes
at all. Both functions now read and append to one JSON file in the OS temp
directory, which is the simplest thing two isolated processes on one machine can
share. Deleting the file resets the demo. A missing, corrupt, or unwritable file
degrades to "fixtures only" and is logged, never raised.

This was caught only by driving the running dev server over HTTP. A unit check that
imports both handlers into one Node process shares a module instance and passes
against the broken design, so the HTTP path is the one that counts here.

## Risks / Trade-offs

- **A stale `DEMO_MODE=1` in a maintainer's `.env` shows fake data.** Mitigated by a
  per-request warning log, not by refusing to run. Accepted: the alternative broke
  working machines.
- **Demo mode is unauthenticated by design.** Safe only because it is confined to
  non-production contexts. If someone deploys a branch context with `DEMO_MODE` set,
  that URL serves fixtures to anyone who finds it — which is the intended behaviour
  for a demo, and leaks nothing real.
- **The interlock trusts `CONTEXT`.** It is set by Netlify, not by the request, so a
  caller cannot forge it; but a non-Netlify host would not set it at all, and demo
  mode would then be reachable wherever `DEMO_MODE` is set. Netlify is the only
  supported target, and `netlify.toml` is the deployment contract.
- **Fixtures drift.** If the Sheet's column layout changes, the fixture file is a
  second place to update. `task-registry`'s spec is the shared reference for both.
- **`portal-access` is not yet in the main specs.** Its requirements live in the
  unarchived `migrate-api-to-netlify-functions` change, so this change states the
  password-skip inside its own capability instead of filing a delta against it.
  When that change is archived, the two should be read together.
