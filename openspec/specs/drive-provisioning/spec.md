# drive-provisioning Specification

## Purpose

Defines how each event task gets its own Google Drive workspace: a project
folder under a shared parent, pre-seeded with a copy of the standard WDS intro
deck so volunteers start from the house template instead of a blank file.

## Requirements

### Requirement: Project Folder Per Task

The system SHALL create one Drive folder per task, named `Project - <taskName>`,
inside the configured parent folder, and SHALL return its web view link to the
caller.

#### Scenario: Folder is created

- **WHEN** a task named `MedCamp 2026` is recorded
- **THEN** a folder named `Project - MedCamp 2026` is created under the folder
  identified by `GOOGLE_DRIVE_PARENT_FOLDER_ID`
- **AND** the folder's `webViewLink` is returned as `driveUrl`

#### Scenario: No parent folder configured

- **WHEN** `GOOGLE_DRIVE_PARENT_FOLDER_ID` is unset
- **THEN** the folder is created without a parent rather than the request failing

### Requirement: Intro Template Duplication

The system SHALL copy the configured WDS intro document into the newly created
project folder, named `<taskName> - WDS Intro Slides`.

#### Scenario: Template configured and folder available

- **WHEN** `WDS_INTRO_DOC_ID` is set and the project folder was created
- **THEN** the template is copied into that folder under the derived name

#### Scenario: Template not configured

- **WHEN** `WDS_INTRO_DOC_ID` is unset
- **THEN** the copy step is skipped and the task still succeeds

#### Scenario: Folder creation already failed

- **WHEN** the project folder could not be created
- **THEN** the copy step is skipped, since there is no destination to copy into

### Requirement: Provisioning Failures Are Non-Fatal

The system SHALL log Drive failures and continue, because Drive errors — most
commonly a service-account storage quota or revoked folder sharing — must not
discard a task the operator already submitted.

#### Scenario: Folder creation is rejected

- **WHEN** the Drive API rejects the folder creation
- **THEN** the error message is logged and surfaced to the caller as
  `driveErrorMessage`
- **AND** the task remains recorded with an empty `driveUrl`

#### Scenario: Template copy is rejected

- **WHEN** the Drive API rejects the template copy
- **THEN** the error is logged and the task still succeeds with its folder link
  intact
