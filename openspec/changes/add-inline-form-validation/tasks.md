## 1. Proposal and dependencies

- [x] Inspect current instructions, issue assignment/criteria and PR #5 routing.
- [x] Document proposal, design and dependency/URL-rule gaps before behavior edits.
- [x] Validate OpenSpec deltas with strict validation (all 8 items passed).
- [x] Base the local proposal branch on PR #5 at 965b7af, as requested by the user.
- [x] Record user authorization to implement using current naming/backend parity.
- [ ] Resolve final naming and HTTPS-only acceptance with maintainers before integration.

## 2. Implementation

- [x] Share backend validator and length limits with typed browser validation.
- [x] Extract EventForm, FieldError and ErrorBanner on the existing creation route.
- [x] Add field errors, submit-time focus, correction and preserved drafts.
- [x] Add persistent API/network guidance and duplicate-request protection.

## 3. Verification

- [x] Run validation and component regression tests using synthetic inputs.
- [x] Run lint, type-check, production build and strict OpenSpec validation.
- [x] Exercise unlock, invalid submissions, API retry and successful creation/listing
  in a real browser against local demo functions; block external requests.
- [x] Inspect final diff and record remaining acceptance gaps.
- [x] Complete Sol High review/fix/re-review loop with no actionable findings.

## Verification (2026-10-02)

Base: PR #5's branch at 965b7af. Unit/component tests: 42 passed. Browser tests:
6 passed against the production build and actual demo handlers, including native
incomplete dates, API/network retry, authentication expiry/draft restoration,
Unicode URLs and backend rejection without frontend checks.

Lint, frontend/test type-check and Vite production build pass. Strict OpenSpec
validation: 8 passed. Production dependency audit: 0 vulnerabilities. Tests use
isolated synthetic demo data and do not load .env or contact Google/Telegram.

Review round 1 found URL double-normalization and description-label drift. Both
fixed; Unicode URL regression tests added. Round 2 (gpt-6.1-sol, high) reported no
actionable findings or new regressions and independently reran all 42 unit/component
tests and 6 browser tests successfully.

HTTPS-only acceptance remains deliberately unmet: both client and backend retain
existing HTTP(S) acceptance. No new date rules. Draft PR/push authorized on
2026-10-02. No merge or deployment.
