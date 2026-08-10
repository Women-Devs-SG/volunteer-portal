// Hand-run diagnostic: posts one task through the local netlify dev server.
// Creates a real Drive folder, Sheet row, and Telegram message.
//
//   npm run dev            # in another terminal
//   node test-create-task.mjs

import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:8888';
const password = process.env.PORTAL_PASSWORD;

if (!password) {
  console.error('PORTAL_PASSWORD is not set. Add it to .env first.');
  process.exit(1);
}

const payload = {
  taskName: 'Debug Task',
  eventDate: '2026-08-15',
  eventLocation: 'London',
  eventOneLiner: 'Community meetup',
};

const res = await fetch(`${BASE_URL}/api/create-task`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Portal-Password': password,
  },
  body: JSON.stringify(payload),
});

console.log('status', res.status);
console.log(await res.text());
