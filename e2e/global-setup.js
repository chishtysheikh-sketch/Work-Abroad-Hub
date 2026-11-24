// Starts an in-memory MongoDB + the real server for the browser tests; returns the teardown.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

export const LOG = path.resolve("e2e/.server.log");
const PORT = 4123;

export default async function globalSetup() {
  const mongo = await MongoMemoryServer.create();
  fs.writeFileSync(LOG, "");
  const out = fs.openSync(LOG, "a");
  const server = spawn(process.execPath, ["src/server.js"], {
    stdio: ["ignore", out, out],
    env: {
      ...process.env,
      NODE_ENV: "development", PORT: String(PORT), APP_URL: `http://127.0.0.1:${PORT}`,
      MONGODB_URI: mongo.getUri("wah-e2e"), JWT_SECRET: "e2e-secret-e2e-secret-e2e-secret-123456",
      // empty = "not set" (and .env can't fill them in): emails are printed, Google sign-in is off
      SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", MAIL_FROM: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "",
      SOLAPI_API_KEY: "", SOLAPI_API_SECRET: "", SMS_FROM: "", ALERT_WEBHOOK_URL: "", NTS_API_KEY: "", MIN_WAGE: "",
      LOG_LEVEL: "info", FORCE_COLOR: "0", NO_COLOR: "1",
      DOTENV_CONFIG_PATH: "e2e/.env.does-not-exist",          // never read your real .env
      MINIFY_ASSETS: "true",                                  // test the minified files production serves
    },
  });
  // wait for /api/health
  const end = Date.now() + 30_000;
  for (;;) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); if (r.ok) break; } catch { /* not up yet */ }
    if (server.exitCode !== null || Date.now() > end) throw new Error("server didn't start:\n" + fs.readFileSync(LOG, "utf8").slice(-2000));
    await new Promise(r => setTimeout(r, 200));
  }
  return async () => { server.kill("SIGTERM"); await new Promise(r => server.once("exit", r)); await mongo.stop(); };
}
