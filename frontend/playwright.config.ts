import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E.
 *
 * - Chromium seul (RFC 0009 : cible Boox = Chromium 111+).
 * - webServer démarre Vite automatiquement avant les tests, le ré-utilise
 *   en local si un dev server tourne déjà.
 * - Mode headless par défaut ; `npm run test:e2e:headed` pour debug visuel.
 * - Reporter HTML stocké dans `playwright-report/` (gitignored).
 *
 * Cf. RFC 0009 — Stratégie de tests end-to-end.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? 'list' : [['list'], ['html', { open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fr-FR',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
