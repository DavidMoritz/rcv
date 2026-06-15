import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:2460';

export default defineConfig({
  testDir: './test/e2e',
  globalSetup: './test/e2e/global-setup.mjs',
  globalTeardown: './test/e2e/global-teardown.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'node test/e2e/prepare-php-server.mjs && php -S 127.0.0.1:2461 -t .cache/e2e-php',
      url: 'http://127.0.0.1:2461/api/get-candidates.php',
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
