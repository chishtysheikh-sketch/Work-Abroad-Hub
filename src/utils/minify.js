// Production: our own .js / .css files are minified ONCE when the server starts (in memory, esbuild)
// and served instead of the readable originals. Nothing is written to disk and there is no build step;
// development (and anything that fails to minify) gets the original file.
// On by default when NODE_ENV=production; MINIFY_ASSETS=true|false overrides (the browser tests use true).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { transform } from "esbuild";
import { logger } from "./logger.js";

const FILES = ["script.js", "wah-fb.js", "firebase-config.js", "offline.js", "admin.js", "reset-password.js", "sw.js",
               "style.css", "admin.css"];

export async function minifyPublic(dir) {
  const out = new Map();                 // "/script.js" → { body, type, etag }
  let before = 0, after = 0;
  for (const f of FILES) {
    const file = path.join(dir, f);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    try {
      const css = f.endsWith(".css");
      const r = await transform(src, { loader: css ? "css" : "js", minify: true, target: css ? ["chrome100", "safari15"] : "es2022",
                                      legalComments: "none", charset: "utf8" });
      before += src.length; after += r.code.length;
      out.set("/" + f, { body: Buffer.from(r.code), type: css ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8",
                         etag: `"m-${crypto.createHash("sha1").update(r.code).digest("hex").slice(0, 16)}"` });
    } catch (err) {
      logger.warn({ err: err.message }, `minify: ${f} kept as is`);
    }
  }
  if (out.size) logger.info(`📦 minified ${out.size} files: ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB`);
  return out;
}

// Express middleware: answer GET/HEAD for a minified file, else pass on (to express.static)
export function serveMinified(files, setCache) {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const m = files.get(req.path);
    if (!m) return next();
    res.setHeader("Content-Type", m.type);
    res.setHeader("ETag", m.etag);
    setCache(res, req.path);
    if (req.headers["if-none-match"] === m.etag) return res.status(304).end();
    res.end(req.method === "HEAD" ? undefined : m.body);
  };
}
