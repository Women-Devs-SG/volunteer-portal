import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:8899', trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    url: 'http://127.0.0.1:8899',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
