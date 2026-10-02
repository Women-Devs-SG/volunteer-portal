## ADDED Requirements

### Requirement: Accessible Inline Field Validation

The creation form SHALL validate using the existing backend rules before sending
requests, preserve entered values on failure, and show understandable inline errors
with visible invalid styling, aria-invalid and aria-describedby associations.

#### Scenario: Required name missing

- **WHEN** an operator submits an empty or whitespace-only event name
- **THEN** no request is sent and an inline error marks the name control
- **AND** focus moves to that control and other values remain unchanged

#### Scenario: Invalid optional link

- **WHEN** a nonempty link fails existing backend URL rules
- **THEN** no request is sent and associated guidance describes an accepted URL
- **AND** an empty link remains valid

#### Scenario: Existing HTTP compatibility pending HTTPS-only approval

- **WHEN** a form URL is a valid HTTP or HTTPS URL within existing backend limits
- **THEN** frontend validation and the API accept it consistently
- **AND** HTTPS-only rejection remains an explicitly pending test until maintainers
  approve a coordinated backend rule change for issue #2

#### Scenario: Invalid date or excessive length

- **WHEN** an entered date is incomplete, not YYYY-MM-DD or not a real date, or a
  normalized field exceeds the backend length limit
- **THEN** the corresponding field displays an associated inline error
- **AND** a real past date remains valid

#### Scenario: Field corrected

- **WHEN** an invalid field becomes valid during editing
- **THEN** its error and aria-invalid state clear while its value is retained
- **AND** focus remains where the operator is typing

### Requirement: Persistent Request Error Guidance

The creation form SHALL display failed requests in a persistent accessible error
region and preserve the draft. It SHALL distinguish server and connection failures.

#### Scenario: Server rejects submission

- **WHEN** a server response rejects creation
- **THEN** its message is displayed as text when available, or a server fallback
- **AND** recognized validation messages mark and focus the affected control
- **AND** malformed JSON or a server status is not described as connectivity failure

#### Scenario: Network failure and retry

- **WHEN** the creation request cannot reach the API
- **THEN** connection-specific guidance appears and the draft survives
- **AND** the operator can retry after the request settles

#### Scenario: Field corrected after an API rejection

- **WHEN** the operator corrects a server-rejected field
- **THEN** its inline error clears independently of the previous request outcome
- **AND** the banner identifies the last failed submission and explains how to retry
- **AND** the submit button offers retry while the error outcome remains
- **AND** a valid retry clears the old banner when sent and replaces it with the
  new outcome, while a locally invalid retry retains the last API outcome

### Requirement: Guarded Creation Submission

The creation form SHALL prevent duplicate requests while saving and SHALL retain
the existing successful creation and demo behavior without external validation calls.

#### Scenario: Request pending

- **WHEN** creation is in progress
- **THEN** the submit control is disabled and indicates progress
- **AND** repeated submit events send no additional requests

#### Scenario: Creation succeeds

- **WHEN** the API reports successful creation
- **THEN** success guidance appears, the draft clears and the dashboard refreshes
- **AND** demo mode retains its synthetic local behavior without Google or Telegram
