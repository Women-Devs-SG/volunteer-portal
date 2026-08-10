# task-registry Specification

## Purpose

Defines the Google Sheet that serves as the portal's database — its column
layout and the read path that returns recorded tasks to the dashboard. Keeping
records in a Sheet is deliberate: administrators inspect and edit them directly.

## Requirements

### Requirement: Sheet Row Layout

The system SHALL persist each task as one appended row on the `Tasks` tab across
columns A through I, in the fixed order: `taskId`, `taskName`, `status`,
`driveUrl`, `qrUrl`, `createdAt`, `eventDate`, `eventLocation`, `eventOneLiner`.
Values SHALL be written with user-entered interpretation so dates and links
render natively in the spreadsheet.

#### Scenario: Task is appended

- **WHEN** a task is recorded
- **THEN** exactly one row is appended to the range `Tasks!A:I` with the nine
  values in the specified order

#### Scenario: New task status

- **WHEN** a task is first recorded
- **THEN** its `status` column is `Pending`

#### Scenario: Drive URL column at write time

- **WHEN** a task is recorded
- **THEN** the `driveUrl` column is written as an empty string, because the
  folder is provisioned after the row is appended

### Requirement: Task Listing Endpoint

The system SHALL expose `GET /api/tasks`, returning every recorded task as a
JSON array of objects keyed `taskId`, `taskName`, `status`, `driveUrl`, `qrUrl`,
`createdAt`, `eventDate`, `eventLocation`, and `eventOneLiner`.

#### Scenario: Tasks exist

- **WHEN** the `Tasks` tab holds data rows below the header
- **THEN** the system responds `200` with `status: "success"` and one object per
  row, read from the range `Tasks!A2:I`

#### Scenario: Short or blank rows

- **WHEN** a row has fewer than nine cells or is entirely empty
- **THEN** empty rows are skipped and missing cells become empty strings
- **AND** a missing `status` cell reads as `Pending`

#### Scenario: Datastore is unreachable

- **WHEN** the Sheet cannot be read
- **THEN** the system responds `200` with `status: "success"`, an empty `tasks`
  array, and an explanatory `message`, so a fresh or misconfigured deployment
  renders an empty dashboard rather than an error

### Requirement: Sheet Is Externally Provisioned

The system SHALL read the target spreadsheet from configuration and SHALL NOT
create, rename, or restructure the Sheet or its tabs.

#### Scenario: Sheet identity comes from configuration

- **WHEN** the portal starts
- **THEN** the spreadsheet is identified solely by the `GOOGLE_SHEET_ID`
  environment variable
- **AND** the `Tasks` tab and its header row are expected to already exist
