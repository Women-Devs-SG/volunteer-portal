## Purpose

Controls who may reach the task API. A single shared password, held by the
volunteer team, guards both endpoints, and the rules here govern how authenticated
responses are cached and how much internal detail they may disclose.

## ADDED Requirements

### Requirement: Shared Password Authentication

The system SHALL require a shared password on every task API request, supplied in
the `X-Portal-Password` header, and SHALL reject any request that does not carry
the configured value before contacting Google or Telegram.

#### Scenario: Correct password

- **WHEN** a request carries an `X-Portal-Password` header matching
  `PORTAL_PASSWORD`
- **THEN** the request proceeds to the handler

#### Scenario: Incorrect password

- **WHEN** a request carries a non-matching `X-Portal-Password` header
- **THEN** the system responds `401` with the message `Incorrect password.`
- **AND** no Sheet read or write, Drive call, or Telegram message occurs

#### Scenario: Missing header

- **WHEN** a request omits the `X-Portal-Password` header
- **THEN** the system responds `401` with the message `Incorrect password.`

### Requirement: Password Comparison Resists Timing Analysis

The system SHALL compare the supplied password against the configured one in
constant time with respect to content, comparing byte lengths separately so that
multi-byte characters are handled correctly.

#### Scenario: Same-length mismatch

- **WHEN** a supplied password has the same byte length as the configured one but
  different content
- **THEN** the comparison takes time independent of how many leading bytes match

#### Scenario: Different-length mismatch

- **WHEN** a supplied password has a different byte length
- **THEN** it is rejected without a byte-wise comparison, treating the configured
  password's length as not secret

### Requirement: Fail Closed On Misconfiguration

The system SHALL refuse all requests when `PORTAL_PASSWORD` is unset or shorter
than 12 characters, so an incomplete deployment is never an open one.

#### Scenario: Password not configured

- **WHEN** `PORTAL_PASSWORD` is unset or empty
- **THEN** every request receives `503` with a message directing the caller to
  contact an administrator
- **AND** the misconfiguration is logged server-side

#### Scenario: Password too short

- **WHEN** `PORTAL_PASSWORD` is set to fewer than 12 characters
- **THEN** requests are refused exactly as if it were unset

### Requirement: Authenticated Responses Are Not Cached

The system SHALL mark task API responses `Cache-Control: no-store`, both in the
handler and at the edge, because task records and authentication outcomes are
private.

#### Scenario: Task data returned

- **WHEN** the system returns any JSON task response
- **THEN** the response carries `Cache-Control: no-store` and
  `Content-Type: application/json; charset=utf-8`

#### Scenario: Edge configuration backs up the handler

- **WHEN** any response is served under `/api/*`
- **THEN** the deployment configuration applies `Cache-Control: no-store`
  independently of what the handler set

### Requirement: Internal Errors Are Not Disclosed

The system SHALL log real errors server-side with their context and return messages
to the caller that describe the situation without quoting internal detail, so file
paths and Google API internals never reach the browser.

#### Scenario: Failure inside our own code

- **WHEN** a handler fails for a reason other than a validated input problem or a
  rejected upstream call — for example missing Google credentials
- **THEN** the caller receives `500` with the message
  `Something went wrong. Please try again.`
- **AND** the underlying error is written to the server log with the failing context

#### Scenario: Upstream dependency rejects a call

- **WHEN** a Google API call is rejected
- **THEN** the caller receives a fixed message naming only the affected step, such
  as `Could not save the task to the sheet database.`
- **AND** the provider's own error text is logged rather than returned

#### Scenario: Best-effort step fails

- **WHEN** Drive provisioning or the Telegram dispatch fails
- **THEN** the response describes the outcome in prose and does not include the
  provider's error string

### Requirement: Method Restriction Precedes Authentication

The system SHALL reject an unsupported HTTP method before evaluating the password,
so an unauthenticated caller cannot distinguish a configured deployment from an
unconfigured one by probing methods.

#### Scenario: Wrong method without a password

- **WHEN** an endpoint is called with an unsupported method and no password header
- **THEN** the system responds `405` with an `Allow` header naming the supported
  method
