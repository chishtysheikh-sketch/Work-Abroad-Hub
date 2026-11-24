// Browser tests (Playwright): a real Chrome clicks through the website.
//   npm run test:e2e
// e2e/global-setup.js starts an in-memory MongoDB and the server on port 4123 (never your real database),
// with email printed to e2e/.server.log instead of sent: the tests read the 6-digit codes from there.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.js",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4123",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",          // test the live files, not a cached copy
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
