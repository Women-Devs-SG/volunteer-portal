import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const test = base.extend<{ eventPage: Page }>({
  eventPage: async ({ page, baseURL }, provide) => {
    await page.route('**/*', (route) => new URL(route.request().url()).origin === baseURL
      ? route.continue() : route.abort());
    await page.goto('/');
    await page.getByLabel('Portal Password').fill('synthetic-demo-password');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await page.getByRole('button', { name: 'Create an event', exact: true }).click();
    await expect(page).toHaveURL('/create-task');
    await provide(page);
  },
});

export { expect };
