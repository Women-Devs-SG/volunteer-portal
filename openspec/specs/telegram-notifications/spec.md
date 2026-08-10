# telegram-notifications Specification

## Purpose

Defines the Telegram broadcast that tells the volunteer team a new event task
exists, so coordination happens in the chat the team already uses rather than by
polling the portal.

## Requirements

### Requirement: New Task Broadcast

The system SHALL send one Telegram message to the configured chat when a task is
recorded, formatted as Markdown, and SHALL allow link previews so the Drive
folder renders as a preview card.

#### Scenario: Task created with a Drive folder

- **WHEN** a task is recorded and its Drive folder was provisioned
- **THEN** a Markdown message is sent to `TELEGRAM_CHAT_ID` announcing a new WDS
  task, naming the task, linking the Drive folder, and stating the creation date

#### Scenario: Task created without a Drive folder

- **WHEN** a task is recorded but Drive provisioning failed
- **THEN** the message is still sent, with the folder line reading
  `Drive creation unavailable`

### Requirement: Notification Requires Full Configuration

The system SHALL send a notification only when both the bot token and the target
chat identifier are configured, and SHALL skip the step silently otherwise.

#### Scenario: Credentials incomplete

- **WHEN** `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is unset
- **THEN** no message is attempted and the task still succeeds

### Requirement: Dispatch Failures Are Non-Fatal

The system SHALL log a failed dispatch and continue, so an unreachable Telegram
API or a bot removed from the chat cannot discard a recorded task.

#### Scenario: Telegram API rejects the message

- **WHEN** the send call throws
- **THEN** the error is logged server-side
- **AND** the caller still receives a successful response
