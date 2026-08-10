import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const row = [['TEST', 'DEBUG', 'Pending', '', '', new Date().toISOString(), '2026-08-15', 'London', 'Community meetup']];

try {
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Tasks!A:I',
    // Matches the production write path: values are stored as literal text.
    valueInputOption: 'RAW',
    requestBody: { values: row },
  });
  console.log('APPEND_OK', res.data.updates?.updatedCells);
} catch (err) {
  console.error('APPEND_ERR');
  console.error(err.response?.data || err.message);
  process.exit(1);
}
