import { requirePassword } from '../../lib/auth.mjs';
import { demoStatus, listDemoTasks } from '../../lib/demo.mjs';
import { getGoogleClients } from '../../lib/google.mjs';
import { json, methodNotAllowed, serverError } from '../../lib/http.mjs';

export default async function handler(req) {
  if (req.method !== 'GET') return methodNotAllowed('GET');

  const demo = demoStatus();
  if (demo.refusal) return demo.refusal;

  if (!demo.active) {
    const unauthorized = requirePassword(req);
    if (unauthorized) return unauthorized;
  }

  if (demo.active) return json(200, { status: 'success', tasks: listDemoTasks() });

  let sheets;
  try {
    ({ sheets } = getGoogleClients());
  } catch (error) {
    return serverError('tasks: Google credentials', error);
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tasks!A2:I',
    });

    const rows = response.data.values ?? [];
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

    return json(200, { status: 'success', tasks });
  } catch (error) {
    // The previous version returned 200 with an empty list here, which made a
    // broken Sheets connection look identical to "no tasks yet".
    console.error('tasks: sheets read failed:', error.message);
    return json(502, { status: 'error', message: 'Could not load tasks from the sheet database.' });
  }
}
