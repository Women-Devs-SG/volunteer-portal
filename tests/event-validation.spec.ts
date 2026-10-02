import { test, expect } from './fixtures';
import { validateTaskInput } from '../lib/validate.mjs';
import { LIMITS, validateField, validateForm } from '../src/validation';
import type { TaskInput } from '../src/types';

const valid: TaskInput = {
  taskName: 'Synthetic workshop', formUrl: '', eventDate: '', eventLocation: '', eventOneLiner: '',
};

test.describe('validation rules', () => {
  for (const value of ['', '  ', '\u0000\n']) {
    test(`requires a normalized name: ${JSON.stringify(value)}`, () => {
      expect(validateField('taskName', value)).toBe('Enter an event name.');
      expect(validateTaskInput({ taskName: value }).ok).toBe(false);
    });
  }
  for (const formUrl of ['', 'https://example.com/form', 'http://example.com/form']) {
    test(`accepts optional HTTP(S) URL: ${JSON.stringify(formUrl)}`, () => {
      expect(validateForm({ ...valid, formUrl })).toEqual({});
      expect(validateTaskInput({ ...valid, formUrl }).ok).toBe(true);
    });
  }
  for (const formUrl of ['not a link', 'https://', 'ftp://example.com', 'javascript:alert(1)', '/form']) {
    test(`rejects URL: ${formUrl}`, () => {
      expect(validateField('formUrl', formUrl)).toContain('https://');
      expect(validateTaskInput({ ...valid, formUrl }).ok).toBe(false);
    });
  }
  for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    test(`matches ${field} length boundaries after normalization`, () => {
      const prefix = field === 'formUrl' ? 'https://example.com/' : '';
      const value = prefix + 'x'.repeat(LIMITS[field] - prefix.length);
      expect(validateField(field, value)).toBeUndefined();
      expect(validateTaskInput({ ...valid, [field]: value }).ok).toBe(true);
      expect(validateField(field, value + 'x')).toContain(`${LIMITS[field]} characters or fewer`);
      expect(validateTaskInput({ ...valid, [field]: value + 'x' }).ok).toBe(false);
      expect(validateField(field, ` \u0000${value}\n `)).toBeUndefined();
    });
  }
  for (const eventDate of ['', '2000-01-01', '2024-02-29']) {
    test(`accepts optional/past date: ${JSON.stringify(eventDate)}`, () => {
      expect(validateField('eventDate', eventDate)).toBeUndefined();
    });
  }
  for (const eventDate of ['2026-02-29', '2026-02-30', '2026-13-01', '01/02/2026', '2026-01-01T00:00:00Z']) {
    test(`rejects date: ${eventDate}`, () => {
      expect(validateField('eventDate', eventDate)).toBeDefined();
      expect(validateTaskInput({ ...valid, eventDate }).ok).toBe(false);
    });
  }
  test('reports all invalid fields', () => {
    expect(Object.keys(validateForm({ ...valid, taskName: '', formUrl: 'bad', eventLocation: 'x'.repeat(121) })))
      .toEqual(['taskName', 'eventLocation', 'formUrl']);
  });
});

test('keyboard validation, correction, native limits and successful demo creation/listing', async ({ eventPage: page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const requests: string[] = [];
  page.on('request', (req) => { if (req.method() === 'POST') requests.push(req.url()); });
  const name = page.getByLabel('Event Name');
  const location = page.getByLabel('Event Location');
  const url = page.getByLabel('Google Form Link');
  await location.fill('Synthetic room');
  await url.fill('not a URL');
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).focus();
  await page.keyboard.press('Enter');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription('Enter an event name.');
  await expect(url).toHaveAccessibleDescription(/https:\/\//);
  await expect(location).toHaveValue('Synthetic room');
  expect(requests).toEqual([]);
  await name.fill(' Synthetic browser workshop ');
  await expect(name).not.toHaveAttribute('aria-invalid');
  await url.fill('https://example.com/synthetic-form');
  await expect(url).not.toHaveAttribute('aria-invalid');
  await expect(url).toBeFocused();
  await expect(name).toHaveAttribute('maxlength', '120');
  await expect(location).toHaveAttribute('maxlength', '120');
  await expect(page.getByLabel('One-line Event Description')).toHaveAttribute('maxlength', '280');
  await expect(url).toHaveAttribute('maxlength', '500');
  await page.getByLabel('Event Date').fill('2000-01-01');
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
  await expect(name).toHaveValue('');
  expect(requests).toHaveLength(1);
  const listed = await request.get('/api/tasks');
  expect(listed.headers()['cache-control']).toBe('no-store');
  expect((await listed.json()).tasks).toEqual(expect.arrayContaining([expect.objectContaining({
    taskName: 'Synthetic browser workshop', eventDate: '2000-01-01', eventLocation: 'Synthetic room',
  })]));
  await page.getByRole('button', { name: 'Back to portal' }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic browser workshop' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('HTTP rejection preserves values and server-field focus; network failure can retry', async ({ eventPage: page }) => {
  const name = page.getByLabel('Event Name');
  await name.fill('Synthetic retry workshop');
  await page.route('**/api/create-task', (route) => route.fulfill({ status: 400, json: {
    status: 'error', message: 'eventLocation must be 120 characters or fewer.',
  } }));
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  const location = page.getByLabel('Event Location');
  await expect(location).toBeFocused();
  await expect(location).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toHaveText(/eventLocation must be 120/);
  await expect(name).toHaveValue('Synthetic retry workshop');
  await location.fill('Synthetic corrected room');
  await expect(location).not.toHaveAttribute('aria-invalid');
  await expect(page.getByRole('alert')).toHaveText(/eventLocation must be 120/);
  await expect(page.getByRole('alert')).toHaveText(/Last submission failed/);
  await expect(page.getByRole('alert')).toHaveText(/retry event creation/);
  await expect(page.getByRole('button', { name: 'Retry event creation', exact: true })).toBeEnabled();
  await page.route('**/api/create-task', (route) => route.fulfill({ status: 502, json: {
    status: 'error', message: '<b>Synthetic API failure</b>',
  } }));
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page.getByRole('alert')).toHaveText(/<b>Synthetic API failure<\/b>/);
  await expect(page.getByRole('alert').locator('b')).toHaveCount(0);
  await expect(page.getByRole('alert')).not.toHaveText(/connection/);
  await name.fill('Synthetic corrected retry workshop');
  await expect(page.getByRole('alert')).toHaveText(/Synthetic API failure/);
  await page.route('**/api/create-task', (route) => route.abort('failed'));
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page.getByRole('alert')).toHaveText(/connection/);
  await expect(name).toHaveValue('Synthetic corrected retry workshop');
  await page.unroute('**/api/create-task');
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
  await expect(page.getByRole('alert')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Retry event creation', exact: true })).toHaveCount(0);
});

test('backend rejects direct invalid requests even without client validation', async ({ request }) => {
  for (const payload of [
    { taskName: '' }, { taskName: 'x'.repeat(121) }, { taskName: 'Synthetic direct test', formUrl: 'javascript:alert(1)' },
    { taskName: 'Synthetic direct test', eventDate: '2026-02-30' },
    { taskName: 'Synthetic direct test', eventLocation: 'x'.repeat(121) },
    { taskName: 'Synthetic direct test', eventOneLiner: 'x'.repeat(281) },
    { taskName: 'Synthetic direct test', formUrl: 'https://example.com/' + 'x'.repeat(500) },
  ]) {
    const response = await request.post('/api/create-task', { data: payload });
    expect(response.status()).toBe(400);
    expect((await response.json()).status).toBe('error');
  }
});

test('a Unicode URL within the raw limit succeeds without double normalization', async ({ eventPage: page }) => {
  await page.getByLabel('Event Name').fill('Synthetic Unicode workshop');
  await page.getByLabel('Google Form Link').fill('https://example.com/' + 'é'.repeat(100));
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
});

test('HTTP remains supported by the form and API pending the #2 HTTPS-only decision', async ({ eventPage: page }) => {
  test.info().annotations.push({ type: 'acceptance gap', description: 'Existing backend parity; HTTPS-only awaits maintainer approval. See the pending contract below.' });
  await page.getByLabel('Event Name').fill('Synthetic HTTP compatibility workshop');
  await page.getByLabel('Google Form Link').fill('http://example.com/form');
  const response = page.waitForResponse((response) => response.url().endsWith('/api/create-task'));
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
});

test.fixme('PENDING maintainer approval: #2 HTTPS-only rejects HTTP in frontend and backend', () => {
  expect(validateField('formUrl', 'http://example.com/form')).toBeDefined();
  expect(validateTaskInput({ ...valid, formUrl: 'http://example.com/form' }).ok).toBe(false);
});

test('incomplete native dates show inline guidance and correction retains focus', async ({ eventPage: page }) => {
  await page.getByLabel('Event Name').fill('Synthetic date workshop');
  const date = page.getByLabel('Event Date');
  await date.fill('2000-01-01');
  await date.focus();
  for (let segment = 0; segment < 3; segment++) {
    await date.press('Backspace');
    if (await date.evaluate((input: HTMLInputElement) => input.validity.badInput)) break;
    await date.press('ArrowRight');
  }
  expect(await date.evaluate((input: HTMLInputElement) => input.validity.badInput)).toBe(true);
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(date).toHaveAttribute('aria-invalid', 'true');
  await expect(date).toHaveAccessibleDescription(/complete, real date/);
  await expect(date).toBeFocused();
  await date.fill('2000-01-01');
  await expect(date).not.toHaveAttribute('aria-invalid');
  await expect(date).toBeFocused();
});

test('authentication expiry preserves the draft through unlock and retry', async ({ eventPage: page }) => {
  await page.getByLabel('Event Name').fill('Synthetic retained draft');
  await page.getByLabel('Event Location').fill('Synthetic retained room');
  await page.route('**/api/create-task', (route) => route.fulfill({ status: 401, json: {
    status: 'error', message: 'Synthetic session expired. Unlock to retry.',
  } }));
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page).toHaveURL('/unlock');
  await expect(page.getByText('Synthetic session expired. Unlock to retry.')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('wds-portal-password'))).toBeNull();
  await page.getByLabel('Portal Password').fill('synthetic-retry-password');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Create an event', exact: true }).click();
  await expect(page.getByLabel('Event Name')).toHaveValue('Synthetic retained draft');
  await expect(page.getByLabel('Event Location')).toHaveValue('Synthetic retained room');
  await page.unroute('**/api/create-task');
  await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
});

for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
  test(`blocks overlong ${field} before sending a request`, async ({ eventPage: page }) => {
    let requests = 0;
    page.on('request', (request) => { if (request.method() === 'POST') requests++; });
    await page.getByLabel('Event Name').fill('Synthetic boundary workshop');
    const control = page.locator(`#${field}`);
    const limit = LIMITS[field];
    await expect(control).toHaveAttribute('maxlength', String(limit));
    // Exercise application validation when autofill/scripts bypass native caps.
    await control.evaluate((input) => input.removeAttribute('maxlength'));
    await control.fill('x'.repeat(limit + 1));
    await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAccessibleDescription(new RegExp(`${limit} characters or fewer`));
    expect(requests).toBe(0);
  });
}

for (const [status, body] of [
  [500, 'not JSON'], [503, 'null'], [200, '{}'], [400, '{"status":"error","message":42}'],
] as const) {
  test(`HTTP ${status} malformed response gets server guidance and allows retry`, async ({ eventPage: page }) => {
    await page.getByLabel('Event Name').fill('Synthetic malformed-response workshop');
    await page.route('**/api/create-task', (route) => route.fulfill({ status, contentType: 'application/json', body }));
    await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
    const banner = page.getByRole('alert');
    await expect(banner).toHaveText(/server/i);
    await expect(banner).not.toHaveText(/connection|reach/i);
    await expect(page.getByLabel('Event Name')).toHaveValue('Synthetic malformed-response workshop');
    await expect(page.getByRole('button', { name: /Create event &|Retry event creation/ })).toBeEnabled();
    await page.unroute('**/api/create-task');
    await page.getByRole('button', { name: /Create event &|Retry event creation/ }).click();
    await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
  });
}

test('pending guard prevents synchronous and route-remount duplicates', async ({ eventPage: page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route('**/api/create-task', async (route) => {
    requests++;
    await gate;
    await route.continue();
  });
  await page.getByLabel('Event Name').fill('Synthetic pending workshop');
  await page.locator('form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole('button', { name: 'Creating event…' })).toBeDisabled();
  await expect(page.getByLabel('Event Name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Back to portal' })).toBeDisabled();
  await expect.poll(() => requests).toBe(1);
  try {
    await page.goBack();
    await page.getByRole('button', { name: 'Create an event', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Creating event…' })).toBeDisabled();
    await page.locator('form').dispatchEvent('submit');
    expect(requests).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
  await expect(page.getByLabel('Event Name')).toHaveValue('');
  await expect(page.getByRole('button', { name: /Create event &|Retry event creation/ })).toBeEnabled();
  expect(requests).toBe(1);
});
