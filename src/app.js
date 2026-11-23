import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/jobs.routes.js";
import applicationRoutes from "./routes/applications.routes.js";
import chatRoutes from "./routes/chats.routes.js";
import fbRoutes, { fbErrors } from "./routes/fb.routes.js";
import fileRoutes from "./routes/files.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

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
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "frame-ancestors": ["'self'"],
  "report-uri": ["/api/csp-report"],
};

app.set("trust proxy", 1);
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
  rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }),
  express.json({ limit: "20kb", type: ["application/csp-report", "application/json", "application/reports+json"] }),
  (req, res) => {
    const r = req.body?.["csp-report"] || req.body?.[0]?.body || req.body || {};
    const blocked = r["blocked-uri"] || r.blockedURL || "?";
    const directive = r["violated-directive"] || r.effectiveDirective || "?";
    const where = r["source-file"] || r.sourceFile || r["document-uri"] || r.documentURL || "";
    console.warn(`🛡️  CSP ${CSP_REPORT_ONLY ? "report" : "blocked"}: ${directive} → ${String(blocked).slice(0, 200)} ${where ? "(" + String(where).slice(0, 120) + ")" : ""}`);
    res.status(204).end();
  });

// the website's data (profiles can hold a small photo, so allow up to 1 MB here)
app.use("/api/fb", express.json({ limit: "1mb" }), fbRoutes, fbErrors);

// P7: profile photos / company logos as files (GridFS), multipart upload
app.use("/api/files", fileRoutes);

app.use(express.json({ limit: "300kb" }));
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);   // P8
app.use("/api", notFound);

app.use(express.static(path.join(__dirname, "../public")));
app.use(errorHandler);

export default app;
