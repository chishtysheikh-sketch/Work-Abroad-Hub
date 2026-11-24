// P11: one logger for the whole server (pino).
//   development → readable coloured lines (pino-pretty, written synchronously so nothing is lost on a crash)
//   production  → one JSON object per line (for log tools)
//   LOG_LEVEL   → fatal | error | warn | info (default) | debug | trace
// Reads process.env directly (not config/env.js), because env.js itself logs its errors with this logger.
import "dotenv/config";
import crypto from "node:crypto";
import pino from "pino";

const LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const level = LEVELS.includes(String(process.env.LOG_LEVEL || "").toLowerCase()) ? process.env.LOG_LEVEL.toLowerCase() : "info";
export const isProdLog = process.env.NODE_ENV === "production";

// Never write secrets: these field names are hidden wherever they appear (up to 4 levels deep).
const SECRET_KEYS = ["password", "currentPassword", "newPassword", "token", "code", "secret",
                     "SMTP_PASS", "GOOGLE_CLIENT_SECRET", "cookie", "cookies", "set-cookie", "authorization"];
const redactPaths = [];
for (const k of SECRET_KEYS) {
  const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : `["${k}"]`;
  const join = p => (key.startsWith("[") ? p + key : p ? `${p}.${key}` : key);
  for (const prefix of ["", "*", "*.*", "*.*.*"]) redactPaths.push(join(prefix));
}

// Alerts: every error / fatal log line is also posted to ALERT_WEBHOOK_URL (Slack or Discord), if set.
// Throttled: the same message at most once per 10 minutes, and at most 20 alerts an hour in total;
// the next alert says how many were held back. Never in tests.
const ALERT_URL = process.env.NODE_ENV === "test" ? "" : (process.env.ALERT_WEBHOOK_URL || "");
const alertSeen = new Map();          // message → last time sent
let alertWindow = { start: 0, sent: 0, held: 0 };
function alert(args, lvl) {
  if (!ALERT_URL) return;
  const obj = args[0] && typeof args[0] === "object" ? args[0] : {};
  const msg = String((typeof args[0] === "string" ? args[0] : args[1]) || obj.err?.message || obj.message || "error").slice(0, 300);
  const now = Date.now();
  if (now - alertWindow.start > 3600_000) alertWindow = { start: now, sent: 0, held: alertWindow.held };
  if (now - (alertSeen.get(msg) || 0) < 600_000 || alertWindow.sent >= 20) { alertWindow.held++; return; }
  alertSeen.set(msg, now); alertWindow.sent++;
  if (alertSeen.size > 500) alertSeen.clear();
  const held = alertWindow.held; alertWindow.held = 0;
  const where = process.env.APP_URL || "server";
  const err = obj.err instanceof Error ? `${obj.err.name}: ${obj.err.message}` : "";
  const text = `${lvl >= 60 ? "💥 FATAL" : "🔴 Error"} on ${where}\n${msg}${err && !msg.includes(obj.err.message) ? "\n" + err : ""}` +
               `${obj.reqId ? `\nrequest: ${obj.reqId}` : ""}${held ? `\n(+${held} more held back)` : ""}`;
  fetch(ALERT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text }),
                     signal: AbortSignal.timeout(5000) }).catch(() => {});      // an alert must never cause another error
}

const options = {
  level,
  hooks: { logMethod(args, method, lvl) { if (lvl >= 50) alert(args, lvl); return method.apply(this, args); } },
  base: isProdLog ? { pid: process.pid } : undefined,     // no pid/hostname noise while developing
  redact: { paths: redactPaths, censor: "[hidden]" },
  // "code" is a hidden field name (Google sign-in codes), so an error's own code (E11000, EADDRINUSE…) is kept as errCode
  serializers: { err: e => { const s = pino.stdSerializers.err(e); if (s && s.code !== undefined) { s.errCode = s.code; delete s.code; } return s; } },
  timestamp: pino.stdTimeFunctions.isoTime,
};

let stream;
if (!isProdLog) {
  try {
    const { default: pretty } = await import("pino-pretty");      // dev dependency: not installed in production
    stream = pretty({
      sync: true, translateTime: "HH:MM:ss", singleLine: true,       // colours only in a real terminal
      ignore: "pid,hostname,req,res,responseTime,reqId",               // the short id is already in the message
      messageFormat: (log, key) => (log.reqId ? `${log[key]}  ·${String(log.reqId).slice(0, 8)}` : log[key]),
    });
  } catch { /* pino-pretty missing → plain JSON */ }
}

export const logger = stream ? pino(options, stream) : pino(options);

// Short, stable pseudonym for an email / IP: the same input always gives the same 10 characters,
// but without the server's secret nobody can turn it back (or guess it from a list of emails).
const KEY = process.env.JWT_SECRET || "work-abroad-hub";
export const shortHash = v => v == null || v === "" ? null
  : crypto.createHmac("sha256", KEY).update(String(v).trim().toLowerCase()).digest("hex").slice(0, 10);

// security events (P11 step 7): always level "warn", with an "event" name you can search for
export function security(log, event, fields = {}, msg = event) {
  (log || logger).warn({ event, security: true, ...fields }, msg);
}

// rate-limit hit (called from every limiter's handler). The IP is pseudonymised like emails.
export function rateLimited(req, limiter) {
  security(req.log, "rate_limit", { limiter, path: (req.originalUrl || "").split("?")[0], ip: shortHash(req.ip) }, `rate limit hit: ${limiter}`);
}
