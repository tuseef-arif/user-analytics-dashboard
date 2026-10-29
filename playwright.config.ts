import { defineConfig, devices } from '@playwright/test';

// Ports differ from the usual dev servers (3000/8000) so e2e never talks to them.
const BACKEND_URL = 'http://127.0.0.1:8100';
const FRONTEND_URL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  // One worker: the tests share one SQLite database.
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The script sets DATABASE_URL, JWT_SECRET and COOKIE_SECURE itself; process
      // env vars take priority over .env, so a real database can never leak in.
      command: 'node e2e/start-backend.mjs',
      url: `${BACKEND_URL}/api/openapi.json`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npx next dev -p 3100 -H 127.0.0.1',
      url: `${FRONTEND_URL}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_PROXY_TARGET: BACKEND_URL },
    },
  ],
});
