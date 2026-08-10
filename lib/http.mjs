// Shared HTTP helpers for the Netlify Functions.

/**
 * JSON response with no-store caching (task data is private).
 * Every response the API produces goes through here, so the caching and
 * content-type rules cannot drift apart between success and failure paths.
 */
export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function methodNotAllowed(allowed) {
  return json(405, { status: 'error', message: 'Method not allowed.' }, { Allow: allowed });
}

/**
 * Parses a JSON body, rejecting anything that is not a plain object.
 * Returns { ok: true, value } or { ok: false, message }.
 */
export async function readJsonObject(req) {
  let parsed;
  try {
    parsed = await req.json();
  } catch {
    return { ok: false, message: 'Request body must be valid JSON.' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  return { ok: true, value: parsed };
}

/**
 * Logs the real error server-side and returns a generic message to the caller,
 * so internal details (file paths, Google API internals) never reach the client.
 */
export function serverError(context, error) {
  console.error(`${context}:`, error);
  return json(500, { status: 'error', message: 'Something went wrong. Please try again.' });
}
