## ADDED Requirements

### Requirement: Request Body Must Be A JSON Object

The system SHALL accept only a syntactically valid JSON object as the create-task
body, rejecting arrays, `null`, and primitives.

#### Scenario: Body is not valid JSON

- **WHEN** the body cannot be parsed as JSON
- **THEN** the system responds `400` with the message
  `Request body must be valid JSON.`

#### Scenario: Body is not an object

- **WHEN** the body parses to an array, `null`, or a primitive
- **THEN** the system responds `400` with the message
  `Request body must be a JSON object.`

### Requirement: Request Input Validation

The system SHALL validate and normalise every submitted field before any of it
reaches the datastore, a Drive folder name, or a notification, and SHALL reject the
whole submission with `400` and a message naming the offending field when any rule
fails.

#### Scenario: Field is not a string

- **WHEN** any of `taskName`, `formUrl`, `eventDate`, `eventLocation`, or
  `eventOneLiner` is present and not a string
- **THEN** the system responds `400` stating that the field must be a string
- **AND** an absent or `null` field is instead treated as empty

#### Scenario: Field exceeds its length cap

- **WHEN** `taskName` or `eventLocation` exceeds 120 characters, `eventOneLiner`
  exceeds 280, or `formUrl` exceeds 500
- **THEN** the system responds `400` naming the field and its limit

#### Scenario: Control characters are stripped

- **WHEN** a field contains control characters
- **THEN** they are removed and the value is trimmed before use, so a crafted value
  cannot forge line breaks in the notification message or the datastore row

#### Scenario: Form URL scheme is restricted

- **WHEN** `formUrl` is present but is not a parseable `http:` or `https:` URL
- **THEN** the system responds `400`, rejecting `javascript:`, `data:`, and `file:`
  values before they can be encoded into a QR code

#### Scenario: Event date format

- **WHEN** `eventDate` is present but is not a real calendar date in `YYYY-MM-DD`
  form
- **THEN** the system responds `400` stating the required format, or that the date
  is not real

#### Scenario: Validated values are the only ones used

- **WHEN** validation succeeds
- **THEN** every downstream step uses the normalised values, never the raw body

## MODIFIED Requirements

### Requirement: Task Creation Endpoint

The system SHALL expose `POST /api/create-task`, accepting a JSON body with the
fields `taskName`, `formUrl`, `eventDate`, `eventLocation`, and `eventOneLiner`,
and SHALL respond with JSON carrying a `status` field of `success` or `error`. The
endpoint SHALL accept only the `POST` method.

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

#### Scenario: Unsupported method

- **WHEN** the endpoint is called with any method other than `POST`
- **THEN** the system responds `405` with an `Allow: POST` header

### Requirement: Persistence Is The Only Must-Succeed Step

The system SHALL treat recording the task as the sole condition for success, and
SHALL treat Drive provisioning and Telegram notification as best-effort side
effects that cannot fail the request. Automations SHALL run in the order:
record the task, provision Drive, copy the template, notify Telegram.

#### Scenario: Task cannot be recorded

- **WHEN** appending the task to the datastore is rejected
- **THEN** the system responds `502` with the message
  `Could not save the task to the sheet database.`
- **AND** no Drive folder is provisioned and no Telegram message is sent

#### Scenario: Drive provisioning fails after the task is recorded

- **WHEN** the task is recorded but the Drive folder cannot be created
- **THEN** the system still responds `200` with `status: "success"`
- **AND** `driveUrl` is an empty string
- **AND** `message` states that the task was saved to the sheet but the Drive folder
  could not be created, without quoting the provider's error

#### Scenario: Telegram notification fails after the task is recorded

- **WHEN** the task is recorded but the Telegram dispatch fails
- **THEN** the system still responds `200` with `status: "success"`
- **AND** the failure is logged server-side only

### Requirement: Unexpected Error Handling

The system SHALL catch unhandled errors in the create path, log them server-side
with their context, and respond `500` with `status: "error"` and a generic message
that discloses no internal detail.

#### Scenario: Unanticipated exception

- **WHEN** an error escapes the individual automation steps — for example the Google
  credentials are missing or malformed
- **THEN** the system logs the real error with its context and responds `500` with
  `status: "error"` and the message `Something went wrong. Please try again.`
