// Input validation. Every field is length-capped so a caller cannot push
// megabytes into the Sheet or a Drive folder name.

export const LIMITS = {
  taskName: 120,
  formUrl: 500,
  eventLocation: 120,
  eventOneLiner: 280,
};

class ValidationError extends Error {}

/** Rejects non-strings outright — a JSON object or array here would corrupt the Sheet row. */
function asString(value, field) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string.`);
  }
  // Strip control characters, which have no legitimate use in these fields
  // and can be used to forge line breaks in the Telegram message.
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function capped(value, field) {
  const str = asString(value, field);
  if (str.length > LIMITS[field]) {
    throw new ValidationError(`${field} must be ${LIMITS[field]} characters or fewer.`);
  }
  return str;
}

/** Only http(s) URLs — blocks javascript:, data:, and file: schemes. */
function optionalHttpUrl(value, field) {
  const str = capped(value, field);
  if (!str) return '';

  let parsed;
  try {
    parsed = new URL(str);
  } catch {
    throw new ValidationError(`${field} must be a valid URL.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError(`${field} must start with http:// or https://.`);
  }

  return parsed.toString();
}

function optionalDate(value, field) {
  const str = asString(value, field);
  if (!str) return '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new ValidationError(`${field} must be in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(str)) {
    throw new ValidationError(`${field} is not a real date.`);
  }

  return str;
}

/**
 * Validates a create-task payload.
 * Returns { ok: true, value } or { ok: false, message }.
 */
export function validateTaskInput(body) {
  try {
    const taskName = capped(body.taskName, 'taskName');

    if (!taskName) {
      return { ok: false, message: 'Task name is required.' };
    }

    return {
      ok: true,
      value: {
        taskName,
        formUrl: optionalHttpUrl(body.formUrl, 'formUrl'),
        eventDate: optionalDate(body.eventDate, 'eventDate'),
        eventLocation: capped(body.eventLocation, 'eventLocation'),
        eventOneLiner: capped(body.eventOneLiner, 'eventOneLiner'),
      },
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
