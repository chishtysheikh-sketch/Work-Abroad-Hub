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

const options = {
  level,
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
