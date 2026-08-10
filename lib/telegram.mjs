// Minimal Telegram client over fetch.
//
// This replaces node-telegram-bot-api, which pulls in the deprecated `request`
// package and with it two critical advisories (form-data CRLF injection and an
// unsafe random boundary). All we need is a single sendMessage call.

const TIMEOUT_MS = 8000;

/** Escapes the three characters that are significant in Telegram's HTML parse mode. */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a task notification. Never throws — a Telegram outage must not fail
 * a request whose Sheet write already succeeded.
 */
export async function notifyTaskCreated({ taskName, driveUrl }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  // User-supplied values are escaped; only the Google-issued driveUrl becomes a link.
  const folderLine =
    driveUrl && driveUrl.startsWith('https://')
      ? `<a href="${escapeHtml(driveUrl)}">Open Folder</a>`
      : 'Drive creation unavailable';

  const text = [
    '🚀 <b>New WDS Task Created!</b>',
    '',
    `📌 <b>Task:</b> ${escapeHtml(taskName)}`,
    `📁 <b>Drive Folder:</b> ${folderLine}`,
    `📅 <b>Created:</b> ${escapeHtml(new Date().toISOString().slice(0, 10))}`,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Log the status only — the response body can echo the bot token.
      console.error('Telegram sendMessage failed with status', response.status);
    }
  } catch (error) {
    console.error('Telegram sendMessage error:', error.name);
  } finally {
    clearTimeout(timer);
  }
}
