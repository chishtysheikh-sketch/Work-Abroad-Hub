// The website talks to these routes instead of Firebase.
//   /api/fb/auth/...  → sign up, log in, log out, who am I, delete account
//   /api/fb/doc|query|write → read and save data (security rules checked every time)
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import FbDoc from "../models/FbDoc.js";
import { setAuthCookie, clearAuthCookie, COOKIE_NAME } from "../middleware/auth.js";
import { checkToken, forgetSession } from "../utils/session.js";
import { validatePassword } from "../utils/password.js";
import { passwordLogin, BCRYPT_COST } from "../utils/login.js";
import { readDoc, runQuery, writeDoc, FbError } from "../fb/core.js";
import { notify } from "../sockets/fbLive.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (res, status, code, error) => res.status(status).json({ code, error });
const shape = u => ({ uid: String(u._id), email: u.email, displayName: u.name || "" });

// who is calling? (null = logged out, logged out everywhere, blocked or deleted)
async function uidOf(req) {
  const t = await checkToken(req.cookies?.[COOKIE_NAME]);
  return t ? t.id : null;
}

const limiter = (windowMs, limit, code, error) => rateLimit({
  windowMs, limit, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => fail(res, 429, code, error),
});
const authLimiter  = limiter(15 * 60 * 1000, 20, "auth/too-many-requests", "Too many tries. Wait a moment.");
const writeLimiter = limiter(60 * 1000, 120, "resource-exhausted", "Too many requests, slow down.");
const readLimiter  = limiter(60 * 1000, 300, "resource-exhausted", "Too many requests, slow down.");

// ---------- auth ----------
router.post("/auth/signup", authLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!EMAIL_RE.test(email) || email.length > 120) return fail(res, 400, "auth/invalid-email", "Please enter a valid email.");
  const weak = validatePassword(password, email);
  if (weak) return fail(res, 400, "auth/weak-password", weak);
  if (await User.exists({ email })) return fail(res, 409, "auth/email-already-in-use", "This email already has an account.");
  const user = await User.create({
    email, passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    role: "student",                       // becomes the real role when the profile form is saved
    name: email.split("@")[0].slice(0, 60), agreedAt: new Date(),
  });
  setAuthCookie(res, user);
  res.status(201).json({ user: shape(user) });
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail(res, 400, "auth/invalid-email", "Please enter a valid email.");
  const r = await passwordLogin(email, String(req.body?.password || ""));
  if (!r.user) return fail(res, r.status, r.code, r.error);
  setAuthCookie(res, r.user);
  res.json({ user: shape(r.user) });
});

router.post("/auth/logout", (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });

// log out on every device: old cookies stop working because tokenVersion changes
router.post("/auth/logout-all", async (req, res) => {
  const uid = await uidOf(req);
  if (!uid) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  await User.updateOne({ _id: uid }, { $inc: { tokenVersion: 1 } });
  forgetSession(uid);
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const t = await checkToken(req.cookies?.[COOKIE_NAME]);
  const user = t && await User.findById(t.id);
  if (!user) { if (req.cookies?.[COOKIE_NAME]) clearAuthCookie(res); return res.json({ user: null }); }
  res.json({ user: shape(user) });
});

router.delete("/auth/me", async (req, res) => {
  const uid = await uidOf(req);
  if (!uid) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  await FbDoc.deleteMany({ col: { $in: ["users", "postings"] }, docId: uid });
  await User.deleteOne({ _id: uid });
  forgetSession(uid);
  clearAuthCookie(res);
  notify("postings", uid);
  res.json({ ok: true });
});

// ---------- data ----------
router.post("/doc", readLimiter, async (req, res) => {
  res.json(await readDoc(req.body?.path, await uidOf(req)));
});

router.post("/query", readLimiter, async (req, res) => {
  res.json({ docs: await runQuery(req.body?.path, req.body?.q, await uidOf(req)) });
});

router.post("/write", writeLimiter, async (req, res) => {
  const uid = await uidOf(req);
  const { op, path, data, merge } = req.body || {};
  if (!["set", "update", "delete", "add"].includes(op)) throw new FbError("invalid-argument", "Bad op");
  const out = await writeDoc({ op, path, data, merge: !!merge }, uid);

  // keep the login account's role/name in step with the website profile
  if (out.col === "users" && out.data && out.id === uid) {
    const set = { role: out.data.role };
    const nm = out.data.profile?.name || out.data.company?.name;
    if (typeof nm === "string" && nm.trim()) set.name = nm.trim().slice(0, 60);
    const user = await User.findByIdAndUpdate(uid, { $set: set }, { returnDocument: "after" });
    if (user) setAuthCookie(res, user);
  }

  notify(out.col, out.id);
  res.json({ id: out.id });
});

// errors from this router → { code, error } so the website can show a friendly message
export function fbErrors(err, req, res, next) {
  if (err instanceof FbError) return fail(res, err.status, err.code, err.message);
  if (err.type === "entity.too.large") return fail(res, 413, "resource-exhausted", "That is too big to save (max 1 MB).");
  if (err.type === "entity.parse.failed") return fail(res, 400, "invalid-argument", "Bad JSON.");
  next(err);
}

export default router;
