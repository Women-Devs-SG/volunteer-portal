import express from 'express';
import { google } from 'googleapis';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 1. Authenticate with Google Service Account
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    // Fix newline formatting in private key when loaded from .env
    private_key: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// 2. Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// 3. POST Endpoint: Create Task & Run Automations
router.post('/create-task', async (req, res) => {
  try {
    const { taskName, formUrl, eventDate, eventLocation, eventOneLiner } = req.body;

    if (!taskName) {
      return res.status(400).json({ status: 'error', message: 'Task name is required.' });
    }

    const taskId = `TASK-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const targetFormUrl = formUrl || 'https://forms.google.com';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetFormUrl)}`;

    console.log('create-task: preparing task', { taskId, taskName, eventDate, eventLocation, eventOneLiner });

    let folderId = '';
    let driveUrl = '';
    let driveErrorMessage = '';

    const sheetRow = [
      taskId,
      taskName,
      'Pending',
      '',
      qrCodeUrl,
      createdAt,
      eventDate || '',
      eventLocation || '',
      eventOneLiner || '',
    ];

    try {
      console.log('create-task: appending sheet row');
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Tasks!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [sheetRow] },
      });
      console.log('create-task: sheet row appended');
    } catch (sheetError) {
      console.error('Sheets append failed:', sheetError.message);
      return res.status(500).json({ status: 'error', message: 'Could not save the task to the sheet database.' });
    }

    try {
      console.log('create-task: creating drive folder');
      const folderMetadata = {
        name: `Project - ${taskName}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ? [process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID] : [],
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, webViewLink',
      });

      folderId = folder.data.id;
      driveUrl = folder.data.webViewLink;
      console.log('create-task: drive folder created', { folderId, driveUrl });
    } catch (driveError) {
      driveErrorMessage = driveError.message;
      console.error('Drive folder creation failed:', driveErrorMessage);
    }

    if (process.env.WDS_INTRO_DOC_ID && folderId) {
      try {
        console.log('create-task: copying intro slides');
        await drive.files.copy({
          fileId: process.env.WDS_INTRO_DOC_ID,
          requestBody: {
            name: `${taskName} - WDS Intro Slides`,
            parents: [folderId],
          },
        });
        console.log('create-task: intro slides copied');
      } catch (copyError) {
        console.error('Intro slide copy failed:', copyError.message);
      }
    }

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const telegramMessage = `🚀 *New WDS Task Created!*\n\n📌 *Task:* ${taskName}\n📁 *Drive Folder:* ${driveUrl ? `[Open Folder](${driveUrl})` : 'Drive creation unavailable'}\n📅 *Created:* ${new Date().toLocaleDateString()}`;

        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, telegramMessage, {
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        });
      } catch (telegramError) {
        console.error('Telegram message failed:', telegramError.message);
      }
    }

    return res.status(200).json({
      status: 'success',
      taskId,
      driveUrl,
      qrCodeUrl,
      createdAt,
      message: driveUrl ? 'Task created successfully.' : 'Task saved to sheet, but Drive folder creation hit a storage quota issue.',
      driveErrorMessage,
    });
  } catch (error) {
    console.error('Error in /create-task:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
});

// GET Endpoint: Fetch All Tasks from GSheet
router.get('/tasks', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tasks!A2:I',
    });

    const rows = response.data.values || [];
    const tasks = rows
      .filter((row) => Array.isArray(row) && row.length > 0)
      .map((row) => ({
        taskId: row[0] || '',
        taskName: row[1] || '',
        status: row[2] || 'Pending',
        driveUrl: row[3] || '',
        qrUrl: row[4] || '',
        createdAt: row[5] || '',
        eventDate: row[6] || '',
        eventLocation: row[7] || '',
        eventOneLiner: row[8] || '',
      }));

    return res.status(200).json({ status: 'success', tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(200).json({
      status: 'success',
      tasks: [],
      message: error.message || 'No tasks available yet.',
    });
  }
});

export default router;