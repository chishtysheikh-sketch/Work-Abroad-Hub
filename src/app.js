import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import jobRoutes from "./routes/jobs.routes.js";
import applicationRoutes from "./routes/applications.routes.js";
import chatRoutes from "./routes/chats.routes.js";
import fbRoutes, { fbErrors } from "./routes/fb.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  // map tiles + address lookup (OpenStreetMap) need to know which site is asking
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use(compression());
app.use(cookieParser());

// the website's data (profiles can hold a small photo, so allow up to 1 MB here)
app.use("/api/fb", express.json({ limit: "1mb" }), fbRoutes, fbErrors);

app.use(express.json({ limit: "300kb" }));
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date() }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api", notFound);

app.use(express.static(path.join(__dirname, "../public")));
app.use(errorHandler);

export default app;
