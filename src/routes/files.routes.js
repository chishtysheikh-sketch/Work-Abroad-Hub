// P7: image uploads (mounted at /api/files)
//   POST   /      → upload one image (field "file", kind=photo|logo) → { url: "/api/files/<id>" }
//   GET    /:id   → the image (public, cached for a year: a new image always gets a new id)
//   DELETE /:id   → only the person who uploaded it
import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { images, sniff, processImage, saveImage, urlOf, KINDS, MAX_UPLOAD } from "../utils/images.js";

const router = Router();
const fail = (res, status, code, error) => res.status(status).json({ code, error });
const ID_RE = /^[a-f0-9]{24}$/;

const upload = multer({
  storage: multer.memoryStorage(),                      // small files only (5 MB): no temp files on disk
  limits: { fileSize: MAX_UPLOAD, files: 1, fields: 5, parts: 6 },
}).single("file");

// 30 uploads per hour per account (runs after requireAuth, so req.user is known)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => "upload:" + req.user.id,
  handler: (req, res) => fail(res, 429, "resource-exhausted", "Too many uploads. Please try again in an hour."),
});

// any logged-in account, verified or not: the sign-up form lets new users pick a photo / logo
router.post("/", requireAuth, uploadLimiter, (req, res, next) => {
  upload(req, res, err => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return fail(res, 413, "resource-exhausted", "That image is too big (max 5 MB).");
    if (err instanceof multer.MulterError) return fail(res, 400, "invalid-argument", "Send one image in the field \"file\".");
    next(err);
  });
}, async (req, res) => {
  const f = req.file;
  if (!f) return fail(res, 400, "invalid-argument", "No file. Send one image in the field \"file\".");
  const kind = KINDS.includes(req.body?.kind) ? req.body.kind : null;
  if (!kind) return fail(res, 400, "invalid-argument", `kind must be one of: ${KINDS.join(", ")}.`);
  if (!sniff(f.buffer)) return fail(res, 415, "invalid-argument", "Only JPG, PNG or WEBP images are allowed.");

  let webp;
  try { webp = await processImage(f.buffer); }
  catch { return fail(res, 415, "invalid-argument", "That image looks broken. Please try another one."); }

  const id = await saveImage(webp, { owner: req.user.id, kind });
  res.status(201).json({ url: urlOf(id) });
});

async function findFile(id) {
  if (!ID_RE.test(id)) return null;
  const [f] = await images().find({ _id: new mongoose.Types.ObjectId(id) }).limit(1).toArray();
  return f || null;
}

router.get("/:id", async (req, res) => {
  const f = await findFile(req.params.id);
  if (!f) return res.status(404).json({ code: "not-found", error: "Image not found." });
  res.set({
    "Content-Type": "image/webp",
    "Content-Length": String(f.length),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  images().openDownloadStream(f._id)
    .on("error", () => { if (!res.headersSent) res.status(404).end(); else res.destroy(); })
    .pipe(res);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const f = await findFile(req.params.id);
  if (!f) return fail(res, 404, "not-found", "Image not found.");
  if (f.metadata?.owner !== String(req.user.id)) return fail(res, 403, "permission-denied", "Not your image.");
  await images().delete(f._id);
  res.json({ ok: true });
});

export default router;
