# Security Policy

The code in this repository is public. The instance Women Devs SG runs is not: it
holds real event records and is reachable only with a shared password. If you find a
way around that, we would very much like to hear from you.

## Reporting a vulnerability

**Please don't open a public issue.**

Use GitHub's private vulnerability reporting:
[**Report a vulnerability**](https://github.com/Women-Devs-SG/volunteer-portal/security/advisories/new).
It creates a private thread visible only to the maintainers.

We aim to acknowledge a report within a week. We're a small volunteer team, so please
be patient if it takes longer — and feel free to nudge the thread.

Please include what you'd expect: what you did, what happened, and what an attacker
could do with it. A proof of concept against your own demo-mode instance is ideal.

## Please don't test against the live portal

We won't publish its URL, and if you find it, please don't probe it. The service
account behind it has write access to a real Google Drive folder and a real
spreadsheet, and there is no rate limiting — a scan is indistinguishable from an
attack and can burn the team's API quota.

Run `DEMO_MODE=1` locally instead. It exercises the same handlers, the same
validation, and the same auth code, with fixtures behind it.

## What's in scope

The interesting parts, roughly in order:

- **`lib/auth.mjs`** — the shared-password check. It compares in constant time and
  fails closed when `PORTAL_PASSWORD` is unset or under 12 characters. A bypass, a
  timing oracle, or a way to make it fail *open* is the highest-value finding here.
- **`lib/demo.mjs`** — the demo-mode interlock. Demo mode drops the password check,
  so anything that lets it activate in the production context is a real
  vulnerability.
- **`lib/validate.mjs`** — input validation. Anything that gets an unexpected type,
  an over-long value, or a non-`http(s)` URL past it.
- **Injection into somewhere else.** Task fields are written to a spreadsheet, used
  as a Drive folder name, rendered in a Telegram message, and displayed in the
  dashboard. Sheet rows are written as `RAW` to stop formula injection, Telegram
  values are HTML-escaped, and the frontend builds DOM nodes rather than HTML
  strings. Holes in any of those count.
- **`netlify.toml`** — the CSP and the security headers.
- **Dependency vulnerabilities** that are actually reachable from this code.

## What's out of scope

- **The shared password model itself.** One password, no per-user accounts, no audit
  trail — we know. It is a deliberate trade-off for a volunteer team; see
  `openspec/changes/migrate-api-to-netlify-functions/design.md`.
- **Missing rate limiting.** Also known and documented. A concrete practical attack
  is still interesting; "you should add rate limiting" we already agree with.
- **Reports that the live URL is guessable**, or findings from scanning it.
- **Anything requiring a maintainer's Google account or Netlify login** to be
  compromised first.
- **Automated scanner output** with no analysis of whether it is reachable here.

## If a credential leaks

For maintainers, and worth knowing if you report one: `DEPLOYMENT.md` has the
rotation procedure for `PORTAL_PASSWORD`. A leaked Google service-account key means
revoking it in Google Cloud, then checking the `Tasks` sheet for unfamiliar rows and
the Drive parent folder for unexpected `Project - …` folders.
