import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E runs against a production-mode demo build (`EDULYNK_DEMO_BUILD=include next build` + `next start`,
 * NODE_ENV=production, strict CSP), emitted to .next-demo without standalone output, with the demo identity adapter.
 * The production build without demo mode is verified separately by `npm run verify:production-build`. The session key
 * is random per run and the demo password is published; nothing here is a real credential.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build:e2e && npm run start:e2e',
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      APP_ENV: 'test',
      AUTH_ADAPTER: 'demo',
      SESSION_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
