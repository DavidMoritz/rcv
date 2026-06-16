import { defineConfig, devices } from '@playwright/test';

function sanitizeRunId(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
}

function hashToPort(value, offset) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10_000;
  }
  return 20_000 + offset + hash;
}

const runId = sanitizeRunId(process.env.E2E_RUN_ID || `${Date.now()}_${process.pid}`);
const phpPort = process.env.E2E_PHP_PORT || String(hashToPort(runId, 0));
const vitePort = process.env.E2E_VITE_PORT || String(hashToPort(runId, 10_000));
const phpRoot = process.env.E2E_PHP_ROOT || `.cache/e2e-php-${runId}`;
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${vitePort}`;

Object.assign(process.env, {
  E2E_RUN_ID: runId,
  E2E_DB_NAME: process.env.E2E_DB_NAME || `rcv_e2e_${runId}`,
  E2E_PHP_PORT: phpPort,
  E2E_VITE_PORT: vitePort,
  E2E_PHP_ROOT: phpRoot,
  E2E_BASE_URL: baseURL
});

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
      command: `node test/e2e/prepare-php-server.mjs && php -S 127.0.0.1:${phpPort} -t ${phpRoot}`,
      url: `http://127.0.0.1:${phpPort}/api/get-candidates.php`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${vitePort}`,
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
