# WDS Operations Portal

A lightweight, event-driven web application and operational database engine for managing event lifecycles, automated Google Drive infrastructure provisioning, dynamic folder generation, and instant Telegram notification dispatches.

---

## Technical Overview & Architecture

The system utilizes an asynchronous **Node.js/Express** middleware layer that bridges a zero-dependency **Vanilla JavaScript/HTML5** frontend with a **Google Workspace** and **Telegram API** backend ecosystem. 

Data persistence is handled by **Google Sheets** via the official Google Sheets API v4, eliminating proprietary database hosting overhead while keeping records directly accessible to administrative stakeholders.

```text
┌─────────────────────────┐
│  Client Web Interface   │
│ (HTML5 / Vanilla JS API)│
└────────────┬────────────┘
             │ HTTP POST /api/create-task
             ▼
┌─────────────────────────┐
│ Node.js Express Server  │
│  (Service Account Auth) │
└──────┬──────┬──────┬────┘
       │      │      │
       │      │      └────────────────────────────────────────┐
       ▼      ▼                                               ▼
┌──────────────┐  ┌───────────────────────────────────┐  ┌──────────────┐
│ Google Sheet │  │        Google Drive API           │  │ Telegram Bot │
│   Database   │  │ • Provision Project Folder        │  │  API Alert   │
│  (Tasks Tab) │  │ • Copy WDS Intro File Template    │  │ Notification │
└──────────────┘  └───────────────────────────────────┘  └──────────────┘
```

---

## Key Capabilities

1. **Automated Directory Provisioning:** Creates project-specific sub-directories within a designated Google Drive parent folder upon task submission.
2. **Document Template Duplication:** Copies standardized operational templates (e.g., *WDS Intro & Overview*) into newly created project directories.
3. **Database Logging:** Appends structured event metadata (`Task_ID`, `Task_Name`, `Event_Date`, `Location`, `Description`, `Status`, `Drive_URL`, `Form_QR_URL`, `Created_At`) to the Google Sheet.
4. **QR Code Generation:** Constructs inline dynamic QR codes for optional feedback and registration forms.
5. **Real-time Event Broadcasting:** Dispatches formatted HTML notification payloads to designated Telegram channels or groups, with all user-supplied values escaped.

---

## Directory Structure

```text
wds-ops-portal/
├── .env.example              # Template for required environment variables
├── .gitignore                # Git exclusion rules (Enforces zero credential leak)
├── netlify.toml              # Netlify build, /api/* rewrites, and security headers
├── package.json              # Project dependencies and script definitions
├── lib/
│   ├── auth.mjs              # Shared-password check (timing-safe, fails closed)
│   ├── google.mjs            # Sheets and Drive service-account clients
│   ├── http.mjs              # JSON response and body-parsing helpers
│   ├── telegram.mjs          # Telegram sendMessage over fetch
│   └── validate.mjs          # Input validation and length caps
├── netlify/functions/
│   ├── create-task.mjs       # POST /api/create-task
│   └── tasks.mjs             # GET /api/tasks
├── openspec/                 # Specs and change proposals (see below)
│   ├── config.yaml           # Workflow schema and project context
│   ├── specs/                # Current behaviour, per capability
│   └── changes/              # Proposed work, per change
└── public/
    ├── index.html            # Event creation interface and dashboard UI
    └── app.js                # Client-side HTTP requests and DOM manipulation
```

---

## Prerequisites

* **Node.js:** `v18.x` or higher
* **npm:** `v9.x` or higher
* **Google Cloud Project:** Enabled **Google Sheets API** and **Google Drive API**
* **Google Service Account:** Generated key file (`JSON`) with **Editor** permissions granted to:
  * Target Google Sheet
  * Destination Google Drive Parent Folder
  * WDS Intro Template File
* **Telegram Bot:** Token generated via `@BotFather` with administrative posting rights in the target chat/channel.

---

## Environment Configuration

Create a `.env` file in the root directory. Populate it using the parameters specified below:

```env
# Google Service Account Credentials
GOOGLE_CLIENT_EMAIL="wds-ops-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_RSA_PRIVATE_KEY
-----END PRIVATE KEY-----
"

# Google Resource Identifiers
GOOGLE_SHEET_ID="1a2b3c4d5e6f7g8h9i0jKLMNOPQRSTUVWXYZ_12345"
GOOGLE_DRIVE_PARENT_FOLDER_ID="0B123456789abcdefGHIJKLMNopq"
WDS_INTRO_DOC_ID="1XyZ987654321_ABCdefGHIjklmnOPQRstUVwx"

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ-1234567"
TELEGRAM_CHAT_ID="-1001234567890"

# Shared portal password (minimum 12 characters).
# The API refuses every request if this is unset or too short.
PORTAL_PASSWORD="generate-a-long-random-value"
```

> ⚠️ **Strict Rule:** Never commit the `.env` file or raw JSON Service Account credentials to version control. Ensure `.gitignore` remains intact.

---

## Local Setup & Execution Procedure

1. **Clone repository:**
   ```bash
   git clone https://github.com/YOUR_ORGANIZATION/wds-ops-portal.git
   cd wds-ops-portal
   ```

2. **Install node dependencies:**
   ```bash
   npm install
   ```

3. **Validate configuration:**
   Ensure `.env` exists and contains valid IDs and RSA keys.

4. **Launch application:**
   ```bash
   npm install -g netlify-cli   # once
   npm run dev
   ```

5. **Access client portal:**
   Open browser at `http://localhost:8888` and enter `PORTAL_PASSWORD`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for deploying to Netlify.

---

## API Specifications

Both endpoints require an `X-Portal-Password` header matching `PORTAL_PASSWORD`.
Requests without it return `401`; if the variable is unset or under 12
characters the API returns `503` and refuses all traffic.

### `POST /api/create-task`
Executes full automation sequence (Drive creation, template copy, GSheet log, Telegram notification).

* **Request Body (`application/json`):**
  ```json
  {
    "taskName": "WDS Tech Workshop 2026",
    "eventDate": "2026-09-15",
    "location": "Hall B",
    "description": "Hands-on tech workshop focusing on developer tooling.",
    "formUrl": "https://forms.google.com/sample"
  }
  ```

* **Response (`200 OK`):**
  ```json
  {
    "status": "success",
    "taskId": "TASK-1772421389000",
    "driveUrl": "https://drive.google.com/drive/folders/SAMPLE_ID",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=..."
  }
  ```

### `GET /api/tasks`
Retrieves logged task entries from the `Tasks` sheet tab.

* **Response (`200 OK`):**
  ```json
  {
    "status": "success",
    "tasks": [
      {
        "taskId": "TASK-1772421389000",
        "taskName": "WDS Tech Workshop 2026",
        "eventDate": "2026-09-15",
        "location": "Hall B",
        "description": "Hands-on tech workshop focusing on developer tooling.",
        "status": "Pending",
        "driveUrl": "https://drive.google.com/...",
        "qrUrl": "https://api.qrserver.com/...",
        "createdAt": "2026-08-01T14:30:00.000Z"
      }
    ]
  }
  ```

---

## Diagnostic Scripts

Three hand-run scripts sit at the repository root. They are not part of the test
suite, nothing imports them, and Netlify never deploys them — only `public/` is
published. Each one loads `.env`, so fill it in first.

| Script | What it does | Touches live data |
| --- | --- | --- |
| `node debug-google.mjs` | Checks the service account can reach `GOOGLE_SHEET_ID` and `GOOGLE_DRIVE_PARENT_FOLDER_ID`. Read-only. | No |
| `node test-sheet-write.mjs` | Appends one literal `TEST`/`DEBUG` row to the `Tasks` tab. | **Yes** — writes a row you must delete by hand |
| `node test-create-task.mjs` | Posts a task through a running `npm run dev` server, end to end. | **Yes** — creates a Drive folder, a Sheet row, and a Telegram message |

`test-create-task.mjs` needs `npm run dev` running in another terminal. It reads
`PORTAL_PASSWORD` from `.env` and sends it as `X-Portal-Password`; without it the
API answers `401`. Override the target with `PORTAL_URL` to point at a deployed
site instead of `http://localhost:8888`.

---

## Spec-Driven Development (OpenSpec)

This repository uses [OpenSpec](https://github.com/Fission-AI/OpenSpec): behaviour is
agreed in Markdown specs before it is coded, and those specs are the source of truth
for what the portal does.

```text
openspec/
├── config.yaml               # Schema + project context handed to AI assistants
├── specs/                    # Current behaviour, one folder per capability
│   ├── task-intake/          # POST /api/create-task contract & failure semantics
│   ├── task-registry/        # Google Sheet layout + GET /api/tasks
│   ├── drive-provisioning/   # Project folder + intro template duplication
│   ├── telegram-notifications/
│   └── portal-ui/            # Unlock screen, task form, dashboard
└── changes/                  # Proposed work, one folder per change
    └── <change-name>/        # proposal.md, design.md, specs/ deltas, tasks.md
```

`openspec/specs/` describes what is **built**. `openspec/changes/` describes what is
**proposed** — each change carries delta specs (`ADDED` / `MODIFIED` / `REMOVED`
requirements) that are merged into the main specs once the work ships.

The CLI needs Node.js 20.19+ and can be run without installing:

```bash
npx @fission-ai/openspec@latest list --specs   # what the portal does today
npx @fission-ai/openspec@latest list           # what is proposed
npx @fission-ai/openspec@latest show task-intake
npx @fission-ai/openspec@latest validate --all --strict
```

Install it globally (`npm install -g @fission-ai/openspec@latest`) to drop the `npx`
prefix. Claude Code users get the workflow as slash commands: `/opsx:propose`,
`/opsx:apply`, `/opsx:archive`.

### Contributing & PR Workflow

1. Branch from `main` (`git checkout -b feature/your-feature-name`).
2. **Propose first.** For anything that changes behaviour, add a change under
   `openspec/changes/<change-name>/` — or run `/opsx:propose "your idea"` — and get
   the proposal and delta specs agreed before writing code.
3. Implement against the agreed specs and tick off `tasks.md` as you go.
4. Run `npx @fission-ai/openspec@latest validate --all --strict` before opening a PR.
5. Once the work is merged and deployed, archive the change so its deltas fold into
   `openspec/specs/`: `/opsx:archive` or
   `npx @fission-ai/openspec@latest archive <change-name>`.
6. PRs require a descriptive title, a reference to a tracked GitHub Issue, and code
   review approval prior to merging into `main`.

> Fixes that change no requirements — refactors, tooling, docs — need no change
> folder. Only spec-level behaviour goes through `openspec/changes/`.
