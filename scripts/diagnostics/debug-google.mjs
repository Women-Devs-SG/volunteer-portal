import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

try {
  const res = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, ranges: ['Tasks!A1:A1'] });
  console.log('SPREADSHEET_OK', res.data.spreadsheetId);
} catch (err) {
  console.error('SPREADSHEET_ERR');
  console.error(err.response?.data || err.message);
}

try {
  const res = await drive.files.get({ fileId: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID, fields: 'id,name' });
  console.log('FOLDER_OK', res.data.id, res.data.name);
} catch (err) {
  console.error('FOLDER_ERR');
  console.error(err.response?.data || err.message);
}