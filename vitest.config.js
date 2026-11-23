// P12: npm test → vitest. One in-memory MongoDB for the whole run (tests/global-setup.js),
// each test FILE gets its own empty database on it (tests/setup.js). Your real database is never used.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    globalSetup: ["tests/global-setup.js"],
    setupFiles: ["tests/setup.js"],
    testTimeout: 20_000,
    hookTimeout: 180_000,            // the first run downloads the MongoDB binary for mongodb-memory-server
    // set BEFORE any of our code loads, so src/config/env.js never sees the real .env values
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DOTENV_CONFIG_PATH: "tests/.env.does-not-exist",      // dotenv loads nothing
      MONGODB_URI: "mongodb://127.0.0.1:1/never-used-by-tests",  // only server.js uses it; tests connect themselves
      JWT_SECRET: "test-secret-for-vitest-only-0123456789abcdef0123456789",
      APP_URL: "http://localhost:4000",
      SMTP_HOST: "", SMTP_PORT: "", SMTP_USER: "", SMTP_PASS: "", MAIL_FROM: "",
      GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "",
      CSP_REPORT_ONLY: "",
      MIN_WAGE: "10320",
    },
  },
});
