import { defineConfig, devices } from '@playwright/test';

// Full-stack e2e: real Vite dev server + real scoring callable running in the
// Firebase Functions/Auth emulators (no mocks), so a scoring regression, a
// broken Part 1 -> Part 2 -> MRI hand-off, or an unhandled console error fails
// the run. Start the emulators first: `npm run e2e:emulators` (separate shell),
// or just use `npm run e2e` / `npm run e2e:watch`, which start everything.
const PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1200, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_FIREBASE_API_KEY: 'fake-key',
      VITE_FIREBASE_PROJECT_ID: 'demo-epsa',
      VITE_FIREBASE_APP_ID: '1:1:web:1',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-epsa.firebaseapp.com',
      VITE_USE_AUTH_EMULATOR: 'true',
      VITE_USE_FUNCTIONS_EMULATOR: 'true',
      VITE_USE_FIRESTORE_EMULATOR: 'true',
    },
  },
});
