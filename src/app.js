import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import pinoHttp from "pino-http";
import { logger, rateLimited } from "./utils/logger.js";
import fbRoutes, { fbErrors } from "./routes/fb.routes.js";
import fileRoutes from "./routes/files.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import reportRoutes from "./routes/reports.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { minifyPublic, serveMinified } from "./utils/minify.js";
import { env } from "./config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Content-Security-Policy: the browser may only load scripts, styles, images and
// connections from the places listed here. Anything else is blocked (and reported).
// CSP_REPORT_ONLY=true in .env → only report, don't block (handy when testing changes).
const CSP_REPORT_ONLY = process.env.CSP_REPORT_ONLY === "true";
const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://unpkg.com", "https://accounts.google.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com", "https://accounts.google.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src": ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://*.googleusercontent.com"],
  "connect-src": ["'self'", "ws:", "wss:", "https://nominatim.openstreetmap.org", "https://accounts.google.com"],
  "frame-src": ["https://accounts.google.com"],
  "worker-src": ["'self'"],            // P13: the service worker (/sw.js)
  "manifest-src": ["'self'"],          // P13: /manifest.webmanifest
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'self'"],
  "report-uri": ["/api/csp-report"],
};

app.set("trust proxy", 1);

// P11: one log line per request, each with its own id (also sent back as the X-Request-Id header,
// so a user can tell us "it failed, id 3f2a…" and we find the exact lines).
// Logged: method, path (NO query string: it can hold tokens), status, time. Never headers, cookies or bodies.
// Static files, socket.io polling and health checks are "debug" (hidden at the default level "info").
const SLOW_MS = 500;
const pathOf = req => (req.originalUrl || req.url || "").split("?")[0];
const quiet = req => !pathOf(req).startsWith("/api/") || pathOf(req) === "/api/health";
// measure the time FIRST: this "finish" listener must run before pino-http's, so customLogLevel can see it
app.use((req, res, next) => { const t0 = Date.now(); res.on("finish", () => { res.responseTime = Date.now() - t0; }); next(); });
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => { const id = crypto.randomUUID(); res.setHeader("X-Request-Id", id); return id; },
  customAttributeKeys: { reqId: "reqId" },
  quietReqLogger: true,                              // req.log lines carry only the reqId
  serializers: {
    req: req => ({ method: req.method, url: pathOf(req.raw || req) }),
    res: res => ({ statusCode: res.statusCode }),
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.responseTime > SLOW_MS) return "warn";    // P10's slow-request warning, now in the same line
    return quiet(req) ? "debug" : "info";
  },
  customSuccessMessage: (req, res, ms) => `${ms > SLOW_MS ? "🐢 slow " : ""}${req.method} ${pathOf(req)} → ${res.statusCode} ${Math.round(ms)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${pathOf(req)} → ${res.statusCode} failed`,
  // the real error (with its stack) is logged by the error handler; don't add pino-http's made-up one
  customErrorObject: (req, res, err, val) => { const { err: _ignored, ...rest } = val; return rest; },
}));
app.use(helmet({
  contentSecurityPolicy: { useDefaults: false, reportOnly: CSP_REPORT_ONLY, directives: cspDirectives },
  // map tiles + address lookup (OpenStreetMap) need to know which site is asking
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // Google sign-in opens a popup that must report back to this page (window.opener / postMessage).
  // helmet's default "same-origin" cuts that link → "Google sign-in was closed".
  // "same-origin-allow-popups" still isolates us from pages that open US, but lets our popups talk back.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
app.use(compression());
app.use(cookieParser());

// browsers send CSP violation reports here; we just log a short line
app.post("/api/csp-report",
  rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
              handler: (req, res) => { rateLimited(req, "csp-report"); res.status(429).end(); } }),
  express.json({ limit: "20kb", type: ["application/csp-report", "application/json", "application/reports+json"] }),
  (req, res) => {
    const r = req.body?.["csp-report"] || req.body?.[0]?.body || req.body || {};
    const blocked = r["blocked-uri"] || r.blockedURL || "?";
    const directive = r["violated-directive"] || r.effectiveDirective || "?";
    const where = r["source-file"] || r.sourceFile || r["document-uri"] || r.documentURL || "";
    req.log.warn({ event: "csp", directive, blocked: String(blocked).slice(0, 200), where: String(where).split("?")[0].slice(0, 120) },
      `🛡️  CSP ${CSP_REPORT_ONLY ? "report" : "blocked"}: ${directive} → ${String(blocked).slice(0, 200)}`);
    res.status(204).end();
  });

// the website's data (profiles can hold a small photo, so allow up to 1 MB here)
app.use("/api/fb", express.json({ limit: "1mb" }), fbRoutes, fbErrors);

// P7: profile photos / company logos as files (GridFS), multipart upload
app.use("/api/files", fileRoutes);

app.use(express.json({ limit: "300kb" }));
// P11: is the server healthy? For uptime monitors / load balancers. 503 when MongoDB is down.
const VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8")).version;
app.get("/api/health", async (req, res) => {
  let db = "down";
  if (mongoose.connection.readyState === 1) {
    try {
      await Promise.race([mongoose.connection.db.admin().ping(), new Promise((_, no) => setTimeout(() => no(new Error("ping timeout")), 1000))]);
      db = "up";
    } catch (err) { req.log.error({ err }, "health: MongoDB ping failed"); }
  }
  res.status(db === "up" ? 200 : 503).json({ ok: db === "up", uptime: Math.round(process.uptime()), db, version: VERSION });
});
// Search engines: what they may read (robots.txt) and the list of pages to index (sitemap.xml).
// Both use APP_URL, so they follow the real address (Render now, your own domain later).
const SITE = env.APP_URL.replace(/\/+$/, "");
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").set("Cache-Control", "public, max-age=86400").send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin.html\nDisallow: /reset-password.html\nDisallow: /offline.html\n\nSitemap: ${SITE}/sitemap.xml\n`);
});
app.get("/sitemap.xml", (req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  res.type("application/xml").set("Cache-Control", "public, max-age=86400").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${SITE}/</loc><lastmod>${day}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
});
app.use("/api/notifications", notificationRoutes);   // P8
app.use("/api/reports", reportRoutes);               // P9: "🚩 Report" from users
app.use("/api/admin", adminRoutes);                  // P9: admin panel (requireAdmin inside)
app.use("/api", notFound);

// P10: browser caching. Our .css/.js/images are always linked with ?v=<number> (bumped on every change),
// so those requests may be cached for 7 days without asking again. Pages (.html) and anything requested
// WITHOUT ?v= are "no-cache": the browser keeps a copy but checks it first (cheap 304 thanks to the ETag).
const LONG_CACHE = new Set([".css", ".js", ".png", ".webp", ".woff2", ".jpg", ".jpeg", ".svg", ".ico"]);
const setCache = (res, file) => {
  const versioned = LONG_CACHE.has(path.extname(file).toLowerCase()) && /[?&]v=/.test(res.req?.originalUrl || "");
  res.setHeader("Cache-Control", versioned ? "public, max-age=604800, immutable" : "no-cache");
};
const PUBLIC_DIR = path.join(__dirname, "../public");
// production: minified copies of our .js / .css (made in memory at start-up, see utils/minify.js)
const MINIFY = process.env.MINIFY_ASSETS ? process.env.MINIFY_ASSETS === "true" : process.env.NODE_ENV === "production";
if (MINIFY) app.use(serveMinified(await minifyPublic(PUBLIC_DIR), setCache));
app.use(express.static(PUBLIC_DIR, { maxAge: "7d", setHeaders: setCache }));
// any other address: a friendly "page not found" for people, plain 404 for everything else
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  res.status(404);
  if (req.accepts(["html", "json"]) === "html") return res.set("Cache-Control", "no-cache").sendFile(path.join(PUBLIC_DIR, "404.html"));
  res.type("text/plain").send("Not found");
});
app.use(errorHandler);

export default app;
