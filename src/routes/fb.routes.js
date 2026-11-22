// The website talks to these routes instead of Firebase.
//   /api/fb/auth/...  → sign up, log in, log out, who am I, delete account
//   /api/fb/doc|query|write → read and save data (security rules checked every time)
import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import FbDoc from "../models/FbDoc.js";
import { setAuthCookie, clearAuthCookie, COOKIE_NAME } from "../middleware/auth.js";
import { checkToken, forgetSession } from "../utils/session.js";
import { validatePassword } from "../utils/password.js";
import { passwordLogin, BCRYPT_COST } from "../utils/login.js";
import { checkEmail, normalizeEmail } from "../utils/email.js";
import { sendMail, emailTemplate } from "../utils/mailer.js";
import { env } from "../config/env.js";
import { readDoc, runQuery, writeDoc, FbError } from "../fb/core.js";
import { notify } from "../sockets/fbLive.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (res, status, code, error) => res.status(status).json({ code, error });
const shape = u => ({ uid: String(u._id), email: u.email, displayName: u.name || "", emailVerified: !!u.emailVerified });

// who is calling? (null = logged out, logged out everywhere, blocked or deleted)
async function uidOf(req) {
  const t = await checkToken(req.cookies?.[COOKIE_NAME]);
  return t ? t.id : null;
}

// ---------- email verification helpers ----------
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
const today = () => new Date().toISOString().slice(0, 10);

// new link token: the email gets the token, the database only keeps its hash (valid 24 h)
function newVerifyFields() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, set: { emailVerifyHash: sha256(token), emailVerifyExp: new Date(Date.now() + 24 * 3600 * 1000), emailVerifySentAt: new Date() } };
}

function sendVerifyEmail(email, token) {
  const url = `${env.APP_URL}/api/fb/auth/verify-email?token=${token}`;
  return sendMail({ to: email, subject: "Confirm your email", ...emailTemplate({
    title: "Confirm your email",
    lines: ["Welcome to Work Abroad Hub! 👋", "Please confirm this is your email address. After that you can post jobs, apply and chat."],
    button: "Confirm my email", url, note: "This link works for 24 hours.",
  }) });
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
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const bad = await checkEmail(email);            // format, typos, temporary inboxes, domain can receive mail
  if (bad) return fail(res, 400, "auth/invalid-email", bad);
  const weak = validatePassword(password, email);
  if (weak) return fail(res, 400, "auth/weak-password", weak);
  if (await User.exists({ email })) return fail(res, 409, "auth/email-already-in-use", "This email already has an account.");
  const v = newVerifyFields();
  const user = await User.create({
    email, passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    role: "student",                       // becomes the real role when the profile form is saved
    name: email.split("@")[0].slice(0, 60), agreedAt: new Date(),
    ...v.set, emailVerifyCount: 1, emailVerifyDay: today(),
  });
  sendVerifyEmail(email, v.token);         // not awaited: sign-up stays fast; failures are logged
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

// the link in the "Confirm your email" email
const verifyLimiter = limiter(15 * 60 * 1000, 30, "auth/too-many-requests", "Too many tries. Wait a moment.");
router.get("/auth/verify-email", verifyLimiter, async (req, res) => {
  const token = String(req.query.token || "");
  if (!/^[a-f0-9]{64}$/.test(token)) return res.redirect("/?verified=expired");
  const user = await User.findOneAndUpdate(
    { emailVerifyHash: sha256(token), emailVerifyExp: { $gt: new Date() } },
    { $set: { emailVerified: true }, $unset: { emailVerifyHash: 1, emailVerifyExp: 1 } });
  if (!user) return res.redirect("/?verified=expired");
  forgetSession(user._id);                 // so posting works right away, not after the 30 s cache
  res.redirect("/?verified=1");
});

// "Resend email" button: max 1 per minute and 5 per day
router.post("/auth/resend-verification", authLimiter, async (req, res) => {
  const uid = await uidOf(req);
  if (!uid) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  const user = await User.findById(uid);
  if (!user) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  if (user.emailVerifySentAt && Date.now() - user.emailVerifySentAt < 60 * 1000)
    return fail(res, 429, "auth/too-many-requests", "Please wait a minute before asking for another email.");
  const count = user.emailVerifyDay === today() ? (user.emailVerifyCount || 0) : 0;
  if (count >= 5) return fail(res, 429, "auth/too-many-requests", "You can resend the email 5 times a day. Please try again tomorrow.");
  const v = newVerifyFields();
  await User.updateOne({ _id: uid }, { $set: { ...v.set, emailVerifyCount: count + 1, emailVerifyDay: today() } });
  const r = await sendVerifyEmail(user.email, v.token);
  if (r.failed) return fail(res, 502, "unavailable", "We couldn't send the email right now. Please try again later.");
  res.json({ ok: true });
});

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
  const t = await checkToken(req.cookies?.[COOKIE_NAME]);
  const uid = t ? t.id : null;
  const { op, path, data, merge } = req.body || {};
  if (!["set", "update", "delete", "add"].includes(op)) throw new FbError("invalid-argument", "Bad op");
  const out = await writeDoc({ op, path, data, merge: !!merge }, uid, { verified: !!(t && t.verified) });

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
