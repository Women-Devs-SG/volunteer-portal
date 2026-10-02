## Why

Issue #2 asks for consistent, accessible field guidance and persistent API errors.
Native browser validation provides inconsistent guidance and failed requests do
not identify the affected field.

## Status

Implementation authorized on PR #5's branch on 2026-10-01. Preserve that branch's
event labels, task API names and existing backend rules. Its merge is not a
prerequisite for local work. A draft PR was authorized on 2026-10-02; do not merge
or deploy.

## What Changes

- Extract validation and submission into an EventForm component on the creation
  route introduced by PR #5, with reusable FieldError and ErrorBanner components.
- Reuse the backend's validator and limits without changing accepted inputs.
- Associate errors with controls, focus the first invalid control only on submit,
  preserve values on failure, and clear errors as values become valid.
- Distinguish HTTP failures from connectivity failures, retain server messages,
  and guard against duplicate submissions while a request is pending.
- Identify persistent banners as the last failed submission and offer a clear
  retry label independently of corrected field errors.
- Add synthetic validation, API, and browser regression tests plus lint and
  explicit type-check scripts.
- Run these checks in GitHub Actions on pull requests and pushes, with demo data.
- Make existing HTTP compatibility and the pending HTTPS-only decision visible
  as an active browser regression and an explicitly pending contract test.

## Capabilities

### Modified Capabilities

- `portal-ui`: accessible field validation, persistent errors and submission state.

## Impact

Frontend components, shared validation exports/types, and development checks.
No API replacement, datastore, Google/Telegram, or authentication rule changes.

## Dependencies and Open Decisions

- Use PR #5's `feature/react-typescript-migration` branch at `965b7af` as the base,
  including its routed creation page. Reconcile later upstream changes before
  integration; this local change does not merge or modify PR #5.
- Preserve PR #5's event labels and task API names; final terminology remains an
  integration question for maintainers.
- Issue #2 asks for HTTPS-only URLs but prohibits backend rule changes. The current
  validator accepts both HTTP and HTTPS. This implementation preserves HTTP(S)
  parity. HTTPS-only acceptance remains a documented issue gap until maintainers
  approve a coordinated rule change.
- Date validation must check format and real calendar dates only; past dates remain
  valid. No new event-date business rule is proposed.

## Non-goals

Editing events, search/filtering, status workflows, changing validation rules,
production data/credentials, deployment, merging, and external comments.
