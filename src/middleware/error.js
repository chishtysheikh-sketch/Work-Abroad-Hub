// Errors → a friendly JSON answer for the website, a log line for us.
// P11: every error answer carries the requestId (the same id is in the X-Request-Id header and in the logs),
// so "it failed, id 3f2a…" leads straight to the right log lines.
import { logger } from "../utils/logger.js";

const log = req => req.log || logger;

export function notFound(req, res) {
  res.status(404).json({ error: "Not found", requestId: req.id });
}

export function errorHandler(err, req, res, next) {
  const dev = process.env.NODE_ENV !== "production";
  const requestId = req.id;
  // broken / too big JSON from the browser is the caller's mistake, not a server error
  if (err.type === "entity.parse.failed") return res.status(400).json({ code: "invalid-argument", error: "Bad JSON.", requestId });
  if (err.type === "entity.too.large") return res.status(413).json({ code: "resource-exhausted", error: "Too big.", requestId });
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    const msg = keys.includes("email") ? "This email is already registered."
              : keys.includes("job") ? "You already applied to this job."
              : "This already exists.";
    return res.status(409).json({ error: msg, requestId });
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    log(req).warn({ err: { name: err.name, message: err.message } }, "invalid data");
    return res.status(400).json({ error: dev ? err.message : "Invalid data.", requestId });
  }
  log(req).error({ err }, `unexpected error: ${err.message}`);          // full stack, tied to this request
  if (res.headersSent) return next(err);
  res.status(500).json({ error: dev ? err.message : "Server error. Please try again.", requestId });
}
