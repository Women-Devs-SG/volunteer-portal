# task-intake Specification

## Purpose

Defines the HTTP contract volunteers use to create an event task, and the order
and failure semantics of the automations that a submission triggers. This is the
single write path into the portal.

## Requirements

### Requirement: Task Creation Endpoint

The system SHALL expose `POST /api/create-task`, accepting a JSON body with the
fields `taskName`, `formUrl`, `eventDate`, `eventLocation`, and `eventOneLiner`,
and SHALL respond with JSON carrying a `status` field of `success` or `error`.

#### Scenario: Valid submission

- **WHEN** a request supplies a non-empty `taskName`
- **THEN** the system responds `200` with `status: "success"`, the generated
  `taskId`, `createdAt`, `qrCodeUrl`, `driveUrl`, and a human-readable `message`

#### Scenario: Missing task name

- **WHEN** a request omits `taskName` or supplies an empty one
- **THEN** the system responds `400` with `status: "error"` and the message
  `Task name is required.`
- **AND** no Sheet row, Drive folder, or Telegram message is created

#### Scenario: Optional fields omitted

- **WHEN** a request supplies only `taskName`
- **THEN** the task is created with the remaining fields stored as empty strings

### Requirement: Task Identifier And Creation Timestamp

The system SHALL assign every task an identifier of the form `TASK-<epoch-millis>`
and an ISO-8601 UTC `createdAt` timestamp, both generated server-side.

#### Scenario: Identifier is generated server-side

- **WHEN** a task is created
- **THEN** its `taskId` is `TASK-` followed by the current epoch time in
  milliseconds
- **AND** any client-supplied identifier is ignored

### Requirement: Feedback Form QR Code

The system SHALL derive a QR code image URL that encodes the event's form link,
so operators can print or share a scannable link without a separate tool.

#### Scenario: Form URL supplied

- **WHEN** a submission includes `formUrl`
- **THEN** `qrCodeUrl` points at the QR service with the percent-encoded
  `formUrl` as its data payload and a size of `150x150`

#### Scenario: Form URL omitted

- **WHEN** a submission omits `formUrl`
- **THEN** the QR code encodes the default `https://forms.google.com`

### Requirement: Persistence Is The Only Must-Succeed Step

The system SHALL treat recording the task as the sole condition for success, and
SHALL treat Drive provisioning and Telegram notification as best-effort side
effects that cannot fail the request. Automations SHALL run in the order:
record the task, provision Drive, copy the template, notify Telegram.

#### Scenario: Task cannot be recorded

- **WHEN** appending the task to the datastore fails
- **THEN** the system responds `500` with the message
  `Could not save the task to the sheet database.`
- **AND** no Drive folder is provisioned and no Telegram message is sent

#### Scenario: Drive provisioning fails after the task is recorded

- **WHEN** the task is recorded but the Drive folder cannot be created
- **THEN** the system still responds `200` with `status: "success"`
- **AND** `driveUrl` is an empty string
- **AND** `message` states that the task was saved but Drive folder creation hit
  a storage quota issue

#### Scenario: Telegram notification fails after the task is recorded

- **WHEN** the task is recorded but the Telegram dispatch throws
- **THEN** the system still responds `200` with `status: "success"`
- **AND** the failure is logged server-side only

### Requirement: Unexpected Error Handling

The system SHALL catch unhandled errors in the create path and respond `500`
with `status: "error"` rather than terminating the process.

#### Scenario: Unanticipated exception

- **WHEN** an error escapes the individual automation steps
- **THEN** the system logs it and responds `500` with `status: "error"` and a
  message
