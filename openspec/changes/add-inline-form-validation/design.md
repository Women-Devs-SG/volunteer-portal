## Context

The creation page in PR #5 collects event information using the existing task API.
The local proposal branch is based on `feature/react-typescript-migration` at
`965b7af`, as requested by the user, rather than waiting for that PR to merge.
Server validation strips controls, trims strings, caps four fields, accepts HTTP(S)
links, and checks YYYY-MM-DD calendar dates. It remains authoritative.

Current limits are 120 characters for taskName/event name, 120 for eventLocation,
280 for eventOneLiner and 500 for formUrl, measured after server normalization.
The date is optional; there is no minimum date or future-date requirement.

## Decisions

Share the existing pure validator with the browser instead of maintaining a second
rule set. Validate each field independently to show every error in one submission.
Use readable field labels in client guidance while displaying API messages verbatim.
Keep native date and URL input types but use noValidate for application messages;
inspect native badInput for incomplete dates. Keep limits in markup from the shared
constant. Do not validate unrelated fields or move focus while typing.

EventForm owns field validation. A dedicated useEventCreation hook owns request
state above the routes, so navigation cannot reset the pending-request guard. The
application keeps draft values so authentication redirects retain them. A
synchronous ref guard complements disabled button state. Disable fields while
saving so success cannot discard edits made after the submitted snapshot.

Persistent error banners use an alert region and plain text. Invalid controls use
aria-invalid, aria-describedby and visible border styling; field updates use polite
live regions. A 400 with a recognized backend field message also marks and focuses
that field. Unknown errors remain in the banner.

HTTP responses with missing/malformed JSON are server errors with status-aware
fallbacks, never connectivity errors. Only failed fetches use connection guidance.
Successful creation clears the draft and refreshes the dashboard.

## Verification

Unit tests exercise boundary lengths, normalized values, optional links and dates,
and backend parity. Component tests exercise focus, descriptions, preserved values,
correction, API failures, malformed responses, retry, and duplicate prevention.
Browser tests use a local demo API and synthetic fixtures only, including direct
server rejection and creation followed by dashboard refresh. External requests are
blocked during browser verification.

## Risks and Dependencies

The user authorized implementation using PR #5's current naming and backend parity.
HTTPS-only acceptance and final naming remain integration questions. Reconcile
upstream changes and revise the delta if maintainers approve different rules.
Do not archive until implemented and deployed.
