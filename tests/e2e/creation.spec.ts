import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:8899' ? route.continue() : route.abort();
  });
  await page.goto('/');
  await page.getByLabel('Portal Password').fill('synthetic-demo-password');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Create an event', exact: true }).click();
  await expect(page).toHaveURL('/create-task');
});

test('keyboard validation, correction, native limits and successful demo creation/listing', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const requests: string[] = [];
  page.on('request', (req) => { if (req.method() === 'POST') requests.push(req.url()); });
  const name = page.getByLabel('Event Name');
  const location = page.getByLabel('Event Location');
  const url = page.getByLabel('Google Form Link');
  await location.fill('Synthetic room');
  await url.fill('not a URL');
  await page.getByRole('button', { name: /Create event &/ }).focus();
  await page.keyboard.press('Enter');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription('Enter an event name.');
  await expect(url).toHaveAccessibleDescription(/https:\/\//);
  await expect(location).toHaveValue('Synthetic room');
  expect(requests).toEqual([]);
  await name.fill('Synthetic browser workshop');
  await expect(name).not.toHaveAttribute('aria-invalid');
  await url.fill('https://example.com/synthetic-form');
  await expect(url).not.toHaveAttribute('aria-invalid');
  await expect(url).toBeFocused();
  await expect(name).toHaveAttribute('maxlength', '120');
  await expect(location).toHaveAttribute('maxlength', '120');
  await expect(page.getByLabel('One-line Event Description')).toHaveAttribute('maxlength', '280');
  await expect(url).toHaveAttribute('maxlength', '500');
  await page.getByLabel('Event Date').fill('2000-01-01');
  await page.getByRole('button', { name: /Create event &/ }).click();
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

test('HTTP rejection preserves values and server-field focus; network failure can retry', async ({ page }) => {
  const name = page.getByLabel('Event Name');
  await name.fill('Synthetic retry workshop');
  await page.route('**/api/create-task', (route) => route.fulfill({ status: 400, json: {
    status: 'error', message: 'eventLocation must be 120 characters or fewer.',
  } }));
  await page.getByRole('button', { name: /Create event &/ }).click();
  const location = page.getByLabel('Event Location');
  await expect(location).toBeFocused();
  await expect(location).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toHaveText(/eventLocation must be 120/);
  await expect(name).toHaveValue('Synthetic retry workshop');
  await location.fill('Synthetic corrected room');
  await expect(location).not.toHaveAttribute('aria-invalid');
  await expect(page.getByRole('alert')).toHaveText(/eventLocation must be 120/);
  await page.route('**/api/create-task', (route) => route.fulfill({ status: 503, contentType: 'text/html', body: 'Synthetic unavailable' }));
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(page.getByRole('alert')).toHaveText(/HTTP 503/);
  await expect(page.getByRole('alert')).not.toHaveText(/connection/);
  await page.route('**/api/create-task', (route) => route.abort('failed'));
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(page.getByRole('alert')).toHaveText(/connection/);
  await expect(name).toHaveValue('Synthetic retry workshop');
  await page.unroute('**/api/create-task');
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
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

test('a Unicode URL within the raw limit succeeds without double normalization', async ({ page }) => {
  await page.getByLabel('Event Name').fill('Synthetic Unicode workshop');
  await page.getByLabel('Google Form Link').fill('https://example.com/' + 'é'.repeat(100));
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
});

test('incomplete native dates show inline guidance and correction retains focus', async ({ page }) => {
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
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(date).toHaveAttribute('aria-invalid', 'true');
  await expect(date).toHaveAccessibleDescription(/complete, real date/);
  await expect(date).toBeFocused();
  await date.fill('2000-01-01');
  await expect(date).not.toHaveAttribute('aria-invalid');
  await expect(date).toBeFocused();
});

test('authentication expiry preserves the draft through unlock and retry', async ({ page }) => {
  await page.getByLabel('Event Name').fill('Synthetic retained draft');
  await page.getByLabel('Event Location').fill('Synthetic retained room');
  await page.route('**/api/create-task', (route) => route.fulfill({ status: 401, json: {
    status: 'error', message: 'Synthetic session expired. Unlock to retry.',
  } }));
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(page).toHaveURL('/unlock');
  await expect(page.getByText('Synthetic session expired. Unlock to retry.')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('wds-portal-password'))).toBeNull();
  await page.getByLabel('Portal Password').fill('synthetic-retry-password');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Create an event', exact: true }).click();
  await expect(page.getByLabel('Event Name')).toHaveValue('Synthetic retained draft');
  await expect(page.getByLabel('Event Location')).toHaveValue('Synthetic retained room');
  await page.unroute('**/api/create-task');
  await page.getByRole('button', { name: /Create event &/ }).click();
  await expect(page.getByText(/saved to your local demo only/)).toBeVisible();
});
