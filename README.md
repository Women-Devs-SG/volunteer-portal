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
5. **Real-time Event Broadcasting:** Dispatches formatted Markdown notification payloads to designated Telegram channels or groups.

---

## Directory Structure

```text
wds-ops-portal/
├── .env.example             # Template for required environment variables
├── .gitignore                # Git exclusion rules (Enforces zero credential leak)
├── package.json              # Project dependencies and script definitions
├── server.js                 # Main Express server bootstrapper
├── api/
│   └── create-task.js        # API endpoints and Google/Telegram integration logic
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

# Server Settings
PORT=3000
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
   npm start
   ```

5. **Access client portal:**
   Open browser at `http://localhost:3000`.

---

## API Specifications

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

## Contributing & PR Workflow

1. Fork or branch from `main` (`git checkout -b feature/your-feature-name`).
2. Verify all local tests pass before opening a Pull Request.
3. PRs require a descriptive title, reference to a tracked GitHub Issue, and code review approval prior to merging into `main`.
