## ADDED Requirements

### Requirement: Browser Hardening Headers

The system SHALL serve the portal under a Content-Security-Policy that permits only
same-origin resources, together with framing, MIME-sniffing, referrer, permissions,
and transport-security headers.

#### Scenario: Content-Security-Policy is applied

- **WHEN** any page under the site is served
- **THEN** the response carries a policy defaulting to `'none'` that allows scripts
  only from `'self'`, images from `'self'` and `data:`, connections to `'self'`, and
  no framing, form submission, or alternate base URI
- **AND** inline styles are permitted solely because the page carries its CSS in a
  `<style>` block

#### Scenario: Third-party script is blocked

- **WHEN** a script from another origin is injected into the page
- **THEN** the browser refuses to execute it, which is what keeps the portal
  password in `sessionStorage` out of reach

#### Scenario: Framing and sniffing are refused

- **WHEN** the page is served
- **THEN** the response denies framing, forbids MIME-type sniffing, sends no
  referrer, disables camera, microphone, geolocation, and interest-cohort access,
  and requests HTTPS for a year including subdomains
