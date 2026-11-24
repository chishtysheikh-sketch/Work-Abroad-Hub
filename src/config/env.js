// Checks the settings in .env when the server starts.
// If something is missing or wrong, the server stops with a clear message
// instead of failing later in a confusing way.
import "dotenv/config";
import { z } from "zod";
import { logger } from "../utils/logger.js";

// empty values in .env (e.g. "SMTP_PASS=") count as "not set"
const optional = (s) => z.preprocess(v => (v === "" ? undefined : v), s.optional());

const schema = z.object({
  MONGODB_URI: z.string().min(1, "is required (e.g. mongodb://127.0.0.1:27017/workabroadhub)"),
  JWT_SECRET:  z.string().min(32, "must be at least 32 characters (make one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")"),
  PORT:        z.coerce.number().int().positive().default(4000),
  NODE_ENV:    z.enum(["development", "production", "test"]).default("development"),
  APP_URL:     z.url().default("http://localhost:4000"),
  // email (optional: without them, emails are printed in the console)
  SMTP_HOST:   optional(z.string()),
  SMTP_PORT:   optional(z.coerce.number().int().positive()),
  SMTP_USER:   optional(z.string()),
  SMTP_PASS:   optional(z.string().transform(s => s.replace(/\s+/g, ""))),   // Gmail shows it with spaces
  MAIL_FROM:   optional(z.string()),
  // Google sign-in (optional: without both, the Google buttons stay hidden)
  GOOGLE_CLIENT_ID:     optional(z.string().trim().regex(/^[\w-]+\.apps\.googleusercontent\.com$/, "must look like 1234-abc.apps.googleusercontent.com (paste only the ID, no label)")),
  GOOGLE_CLIENT_SECRET: optional(z.string().trim().min(10, "looks too short (it usually starts with GOCSPX-)")),
  // P11: how much to log: fatal | error | warn | info (default) | debug | trace
  LOG_LEVEL: optional(z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])),
  // National Tax Service business-status lookup (optional, data.go.kr "국세청_사업자등록정보 진위확인 및 상태조회").
  // Without it, business numbers are still checked with their check digit.
  NTS_API_KEY: optional(z.string().trim().min(10)),
  // SMS codes for student phones (optional, Solapi / CoolSMS). Without them, phones are only format-checked
  // (development prints the code in the console).
  SOLAPI_API_KEY:    optional(z.string().trim()),
  SOLAPI_API_SECRET: optional(z.string().trim()),
  SMS_FROM:          optional(z.string().trim().regex(/^0\d{8,10}$/, "must be the registered sender number, digits only (e.g. 0212345678)")),
  // Alerts (optional): a Slack or Discord webhook URL that gets a message when the server logs an error
  ALERT_WEBHOOK_URL: optional(z.url()),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  logger.fatal("❌ Your .env settings have a problem:\n" +
    result.error.issues.map(i => `   - ${i.path.join(".")}: ${i.message}`).join("\n") +
    "\n   Fix .env (see .env.example) and start the server again.");
  process.exit(1);
}

export const env = result.data;
// keep process.env in step, so older code that reads it sees the same values
process.env.NODE_ENV = env.NODE_ENV;
export const isProd = env.NODE_ENV === "production";
export const googleEnabled = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const smsEnabled = !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SMS_FROM);

// production: things that would silently break the live site
if (isProd) {
  const problems = [];
  if (!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)) problems.push("SMTP_HOST / SMTP_USER / SMTP_PASS: needed, or nobody can confirm their email");
  if (!env.APP_URL.startsWith("https://")) problems.push("APP_URL: must be the real https:// address (it goes into email links)");
  if (problems.length) {
    logger.fatal("❌ Production settings are incomplete:\n" + problems.map(p => "   - " + p).join("\n"));
    process.exit(1);
  }
}
