import { google } from 'googleapis';

let clients = null;

/**
 * Builds the Sheets and Drive clients once per function instance.
 * Lazy so that a missing credential surfaces as a handled request error
 * rather than a crash at module load.
 */
export function getGoogleClients() {
  if (clients) return clients;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    throw new Error('GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY is not set.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      // Netlify stores the key with literal \n sequences; restore real newlines.
      private_key: rawKey.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      // Full drive scope is required to copy WDS_INTRO_DOC_ID and to write into
      // an existing parent folder. See DEPLOYMENT.md for how to limit the blast
      // radius by giving this service account its own dedicated Drive folder.
      'https://www.googleapis.com/auth/drive',
    ],
  });

  clients = {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };

  return clients;
}
