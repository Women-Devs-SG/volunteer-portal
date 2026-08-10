# portal-ui Specification

## Purpose

Defines the single-page operator interface: the unlock screen, the task creation
form, and the dashboard of recorded tasks. It is deliberately dependency-free
static HTML and JavaScript with no build step.

## Requirements

### Requirement: Static Single-Page Delivery

The system SHALL serve the portal as static files from `public/`, requiring no
build step, bundler, or frontend framework.

#### Scenario: Operator opens the portal

- **WHEN** an operator loads the site root
- **THEN** `index.html` and `app.js` are served as static assets
- **AND** the page requests no third-party scripts or stylesheets

#### Scenario: Portal is excluded from search engines

- **WHEN** a crawler fetches the page
- **THEN** a `robots` meta tag instructs it not to index or follow

### Requirement: Password Unlock Screen

The interface SHALL gate the portal behind a password prompt, holding the entered
password in `sessionStorage` only, so it is discarded when the tab closes.

#### Scenario: No password held

- **WHEN** the page loads with no password in session storage
- **THEN** the unlock screen is shown, the portal contents stay hidden, and the
  password field takes focus

#### Scenario: Password accepted

- **WHEN** the operator submits a password and the task listing request succeeds
- **THEN** the unlock screen is hidden and the portal contents are revealed

#### Scenario: Password rejected

- **WHEN** an API request answers `401`
- **THEN** the stored password is cleared, the portal is re-locked, and an error
  message is displayed

### Requirement: Authenticated API Requests

The interface SHALL attach the held password as the `X-Portal-Password` header on
every request it makes to the task API.

#### Scenario: Creating a task

- **WHEN** the form is submitted
- **THEN** the `POST` carries both `Content-Type: application/json` and the
  `X-Portal-Password` header

#### Scenario: Loading the dashboard

- **WHEN** the task list is fetched
- **THEN** the `GET` carries the `X-Portal-Password` header

### Requirement: Task Creation Form

The interface SHALL present a form collecting task name, event date, event
location, a one-line description, and an optional form link, with the task name
required and each free-text field length-capped in the markup to match the
server's limits.

#### Scenario: Field constraints

- **WHEN** the form is rendered
- **THEN** task name is `required` and capped at 120 characters, location at 120,
  the one-liner at 280, and the form link at 500
- **AND** the event date uses a native date input

#### Scenario: Submission in progress

- **WHEN** the operator submits the form
- **THEN** the submit button is disabled and relabelled to indicate work is
  running, and is restored when the request settles

#### Scenario: Submission outcome

- **WHEN** a submission succeeds
- **THEN** an inline success message is shown, the form is reset, and the
  dashboard is refreshed
- **AND** when it fails, an inline error message is shown and the entered values
  are left in place

### Requirement: Task Dashboard Rendering

The interface SHALL list recorded tasks newest-first as cards showing status,
name, and any event date, location, description, and Drive link.

#### Scenario: Tasks are rendered without markup injection

- **WHEN** task fields are rendered
- **THEN** each card is built with DOM element creation and text content rather
  than HTML string interpolation, so spreadsheet values can never be interpreted
  as markup

#### Scenario: Drive link is shown

- **WHEN** a task has a Drive URL beginning with `https://`
- **THEN** a link to the folder is rendered opening in a new tab with
  `rel="noopener noreferrer"`
- **AND** a Drive URL with any other scheme is not rendered as a link

#### Scenario: No tasks yet

- **WHEN** the listing returns no tasks
- **THEN** the dashboard shows a plain "No tasks created yet" message

#### Scenario: Listing fails

- **WHEN** the listing request errors or reports a non-success status
- **THEN** the dashboard shows an error message in place of the task list
