import { timingSafeEqual } from 'node:crypto';
import { json } from './http.mjs';

const HEADER = 'x-portal-password';

/**
 * Compares two strings without leaking length or content via timing.
 * Encodes first so multi-byte characters are handled correctly.
 */
function safeEquals(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // timingSafeEqual throws on length mismatch, so compare lengths separately.
  // The length of the expected password is not secret enough to matter here.
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}

/**
 * Checks the shared portal password on a request.
 * Returns null when authorised, or a Response to return immediately.
 */
export function requirePassword(req) {
  const expected = process.env.PORTAL_PASSWORD;

  // Fail closed: an unset or trivially short password must never mean "open".
  if (!expected || expected.length < 12) {
    console.error('PORTAL_PASSWORD is unset or shorter than 12 characters; refusing all requests.');
    return json(503, {
      status: 'error',
      message: 'Portal is not configured. Contact an administrator.',
    });
  }

  const supplied = req.headers.get(HEADER);

  if (!supplied || !safeEquals(supplied, expected)) {
    return json(401, { status: 'error', message: 'Incorrect password.' });
  }

  return null;
}
