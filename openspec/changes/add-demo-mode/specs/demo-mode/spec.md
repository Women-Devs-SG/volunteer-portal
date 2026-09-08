## Purpose

Lets anyone run the portal with no credentials by serving fictional tasks from a
committed fixture, so the public repository is contributable and the portal can be
demonstrated without real community data on screen.

## ADDED Requirements

### Requirement: Demo Mode Activation

The system SHALL serve fixture-backed responses when the `DEMO_MODE` environment
variable is truthy, and SHALL make no Google or Telegram calls while it is active.

#### Scenario: Demo mode enabled

- **WHEN** `DEMO_MODE` is set to `1` or `true` outside the production context
- **THEN** both endpoints answer from the fixture-backed store
- **AND** no Sheets, Drive, or Telegram request is issued

#### Scenario: Demo mode absent

- **WHEN** `DEMO_MODE` is unset, empty, `0`, or `false`
- **THEN** both endpoints behave exactly as they do today, contacting Google and
  requiring the shared password

#### Scenario: Credentials present alongside demo mode

- **WHEN** `DEMO_MODE` is truthy and real Google credentials are also configured
- **THEN** demo mode still wins and the credentials go unused, so a machine that was
  working before does not start failing

### Requirement: Production Interlock

The system SHALL refuse to serve any request when `DEMO_MODE` is truthy in the
production deploy context, so fictional data can never reach the internal portal.

#### Scenario: Demo mode set in production

- **WHEN** `DEMO_MODE` is truthy and the deploy context is `production`
- **THEN** every request receives `503` with a message naming `DEMO_MODE` as the
  misconfiguration
- **AND** the misconfiguration is logged server-side

#### Scenario: Demo mode in a non-production context

- **WHEN** `DEMO_MODE` is truthy and the deploy context is anything other than
  `production`, including a local dev server where no context is set
- **THEN** demo mode activates normally

### Requirement: Demo Mode Needs No Password

The system SHALL skip the shared-password check while demo mode is active, so a
contributor needs no configuration at all, and SHALL NOT weaken that check on any
other path.

#### Scenario: Request without a password header

- **WHEN** demo mode is active and a request carries no `X-Portal-Password` header
- **THEN** the request is served normally

#### Scenario: Unlock screen in demo mode

- **WHEN** an operator submits any password on the unlock screen in demo mode
- **THEN** the listing request succeeds and the portal unlocks, because there is
  nothing behind the gate but fixtures

#### Scenario: Real path is unchanged

- **WHEN** demo mode is not active
- **THEN** the shared-password check applies in full, including its fail-closed
  behaviour for an unset or too-short password

### Requirement: Demo Mode Preserves The Real Contract

The system SHALL apply the same method restrictions, body parsing, and field
validation in demo mode as on the real path, and SHALL return the same response
shapes, so what a contributor exercises is the real contract.

#### Scenario: Validation still rejects bad input

- **WHEN** a demo-mode submission violates a validation rule, such as a
  `javascript:` form URL or an over-length task name
- **THEN** the system responds `400` with the same message the real path returns

#### Scenario: Method restrictions still apply

- **WHEN** a demo-mode request uses an unsupported method
- **THEN** the system responds `405` with the same `Allow` header

#### Scenario: Successful demo submission

- **WHEN** a valid demo-mode submission is made
- **THEN** the response carries `status: "success"`, a generated `taskId`,
  `createdAt`, `qrCodeUrl`, and a `driveUrl`, exactly as the real path does
- **AND** the `message` states that the task was stored in demo mode only

### Requirement: Fixture Data Contains Nothing Real

The system SHALL seed demo mode from a committed fixture file holding only
fictional events, with no real volunteer name, event, location, form link, or Drive
URL, so screenshots and demonstrations cannot leak community data.

#### Scenario: Fixture is the seed

- **WHEN** demo mode starts
- **THEN** the task list is seeded from the fixture file, whose entries use the same
  field names `GET /api/tasks` returns

#### Scenario: Drive URLs are visibly fake

- **WHEN** a fixture or demo-created task exposes a `driveUrl`
- **THEN** it is recognisably a placeholder rather than a real Drive link

### Requirement: Demo Writes Go To A Scratch File

The system SHALL store demo-created tasks in a scratch file outside the repository,
readable by both endpoints, and SHALL NOT write them to any datastore.

#### Scenario: Task created in demo mode

- **WHEN** a task is submitted in demo mode
- **THEN** it appears in the next listing, after the committed fixtures
- **AND** no Sheet row, Drive folder, or Telegram message is created

#### Scenario: The two endpoints are separate functions

- **WHEN** a task is created by one function and listed by the other
- **THEN** both see the same scratch file, because process memory is not shared
  between separate function invocations or between two deployed functions

#### Scenario: Scratch file is missing or corrupt

- **WHEN** the scratch file does not exist, or does not hold a JSON array
- **THEN** the listing falls back to the committed fixtures alone rather than
  failing, and deleting the file resets the demo

#### Scenario: Scratch file cannot be written

- **WHEN** the filesystem rejects the write
- **THEN** the request still succeeds with its demo-only message, and the failure is
  logged rather than surfaced as an error

### Requirement: Demo Mode Announces Itself

The system SHALL log a warning on every demo-mode request, so a maintainer who
leaves `DEMO_MODE` enabled beside real credentials can see why the portal is showing
unfamiliar data.

#### Scenario: Demo request is logged

- **WHEN** any request is served in demo mode
- **THEN** a warning naming `DEMO_MODE` is written to the server log
