## MODIFIED Requirements

### Requirement: New Task Broadcast

The system SHALL send one Telegram message to the configured chat when a task is
recorded, formatted with Telegram's HTML parse mode, with `&`, `<`, and `>` escaped
in every user-supplied value. Link previews SHALL be disabled, so Telegram does not
fetch the Drive folder on every notification.

#### Scenario: Task created with a Drive folder

- **WHEN** a task is recorded and its Drive folder was provisioned
- **THEN** an HTML message is sent to `TELEGRAM_CHAT_ID` announcing a new WDS task,
  naming the task, linking the Drive folder, and stating the creation date as an
  ISO `YYYY-MM-DD` value

#### Scenario: Task created without a Drive folder

- **WHEN** a task is recorded but Drive provisioning failed
- **THEN** the message is still sent, with the folder line reading
  `Drive creation unavailable`

#### Scenario: Only a trusted URL becomes a link

- **WHEN** the Drive URL does not begin with `https://`
- **THEN** no anchor is emitted and the folder line falls back to
  `Drive creation unavailable`, so only a Google-issued URL is ever rendered as a
  link

#### Scenario: Task name containing markup

- **WHEN** a task name contains `<`, `>`, or `&`
- **THEN** those characters are escaped and the message renders them as text rather
  than as HTML tags

### Requirement: Dispatch Failures Are Non-Fatal

The system SHALL never allow a notification failure to propagate, so an unreachable
Telegram API or a bot removed from the chat cannot discard a recorded task. The
dispatch SHALL be bounded by a timeout, and its logs SHALL NOT include the provider's
response body.

#### Scenario: Telegram API rejects the message

- **WHEN** the send call returns a non-success status
- **THEN** the HTTP status alone is logged, never the response body, which can echo
  the bot token
- **AND** the caller still receives a successful response

#### Scenario: Telegram API does not respond

- **WHEN** the send call has not completed within 8 seconds
- **THEN** the request is aborted and the failure is logged
- **AND** the caller still receives a successful response

#### Scenario: Dispatch throws

- **WHEN** the send call throws for any reason
- **THEN** the error name alone is logged and the task still succeeds
