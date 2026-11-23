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
import { passwordLogin, checkPassword, BCRYPT_COST } from "../utils/login.js";
import { checkEmail, normalizeEmail } from "../utils/email.js";
import { sendMail, emailTemplate } from "../utils/mailer.js";
import { env, googleEnabled } from "../config/env.js";
import { OAuth2Client } from "google-auth-library";
import { readDoc, runQuery, writeDoc, parsePath, FbError } from "../fb/core.js";
import { sharedResult, personalDocs, isPublicCol } from "../fb/shared.js";
import { notify } from "../sockets/fbLive.js";
import { deleteImagesOf } from "../utils/images.js";
import { notifyAfterWrite } from "../services/notify.js";
import Notification from "../models/Notification.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (res, status, code, error, extra) => res.status(status).json({ code, error, ...extra });
const shape = u => ({ uid: String(u._id), email: u.email, displayName: u.name || "", emailVerified: !!u.emailVerified,
                     isAdmin: u.isAdmin === true });   // P9: only shows/hides the "🛡️ Admin" link; the API checks the DB itself

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
    ...v.set, emailVerifyCount: 1, emailVerifyDay: today(), lastLoginAt: new Date(),
  });
  sendVerifyEmail(email, v.token);         // not awaited: sign-up stays fast; failures are logged
  setAuthCookie(res, user);
  res.status(201).json({ user: shape(user) });
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail(res, 400, "auth/invalid-email", "Please enter a valid email.");
  const r = await passwordLogin(email, String(req.body?.password || ""));
  if (!r.user) return fail(res, r.status, r.code, r.error, r.reason && { reason: r.reason });
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

// ---------- P6: Google sign-in ----------
// The browser only sends us a one-time "code". We swap it with Google (using our secret)
// for an ID token, check that token's signature + audience, and trust ONLY what's inside it.
const google = googleEnabled ? new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, "postmessage") : null;
const googleLimiter = limiter(15 * 60 * 1000, 20, "auth/too-many-requests", "Too many tries. Wait a moment.");

// public: the website needs the client ID to open the popup (never the secret)
router.get("/auth/google-config", (req, res) => {
  res.json({ enabled: googleEnabled, clientId: googleEnabled ? env.GOOGLE_CLIENT_ID : null });
});

router.post("/auth/google", googleLimiter, async (req, res) => {
  if (!google) return fail(res, 400, "auth/operation-not-allowed", "Google sign-in is not set up on this server.");
  const code = req.body?.code;
  if (typeof code !== "string" || code.length < 10 || code.length > 2048)
    return fail(res, 400, "auth/invalid-credential", "Google sign-in failed. Please try again.");

  let p;
  try {
    const { tokens } = await google.getToken(code);
    const ticket = await google.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    p = ticket.getPayload();
  } catch (e) {
    console.warn("Google sign-in: code rejected:", e.message);
    return fail(res, 400, "auth/invalid-credential", "Google sign-in failed or took too long. Please try again.");
  }
  if (!p || !p.sub || !p.email) return fail(res, 400, "auth/invalid-credential", "Google sign-in failed. Please try again.");
  if (p.email_verified !== true) return fail(res, 400, "auth/unverified-google-email", "Your Google email isn't verified yet. Verify it with Google first, or sign up with a password.");

  const email = normalizeEmail(p.email);
  let isNewUser = false;
  let user = await User.findOne({ googleSub: p.sub });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {                      // same Gmail as an existing password account → link them
      if (user.googleSub && user.googleSub !== p.sub) return fail(res, 409, "auth/account-exists-with-different-credential", "This email is already linked to a different Google account.");
      if (!user.blocked) user = await User.findByIdAndUpdate(user._id, { $set: { googleSub: p.sub, emailVerified: true } }, { returnDocument: "after" });
    } else {
      try {
        user = await User.create({
          email, googleSub: p.sub, role: "student",          // the role chooser on the site sets the real role
          name: String(p.name || email.split("@")[0]).trim().slice(0, 60) || "User",
          emailVerified: true, hasPassword: false, agreedAt: new Date(),
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), BCRYPT_COST),   // nobody knows it
        });
        isNewUser = true;
      } catch (e) {                  // two clicks at once → the other one created it
        if (e.code !== 11000) throw e;
        user = await User.findOne({ $or: [{ googleSub: p.sub }, { email }] });
      }
    }
  }
  if (!user) return fail(res, 400, "auth/invalid-credential", "Google sign-in failed. Please try again.");
  if (user.blocked) return fail(res, 403, "auth/user-disabled", "This account has been blocked.");

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  forgetSession(user._id);           // emailVerified may have just changed
  setAuthCookie(res, user);
  res.json({ user: shape(user), isNewUser });
});

// ---------- P5: forgot / reset / change password ----------
const RESET_MS = 30 * 60 * 1000;
const FORGOT_OK = { ok: true, message: "If this email has an account, we sent a reset link." };

function sendPasswordChangedEmail(email) {
  return sendMail({ to: email, subject: "Your password was changed", ...emailTemplate({
    title: "Your password was changed",
    lines: ["The password of your Work Abroad Hub account was just changed, and every device was logged out.",
            "If this wasn't you, reset it again right away: open the site, press Log in, then “Forgot password?”."],
    button: "Open Work Abroad Hub", url: `${env.APP_URL}/`,
  }) });
}

const forgotIpLimiter = limiter(60 * 60 * 1000, 5, "auth/too-many-requests", "Too many reset requests. Please try again in an hour.");
// 3 per hour per email: when it's over, we still answer the same 200 (so nobody learns anything) but don't send
const forgotEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 3, standardHeaders: false, legacyHeaders: false,
  keyGenerator: req => "forgot:" + (normalizeEmail(req.body?.email) || "-"),
  handler: (req, res, next) => { req.skipResetEmail = true; next(); },
});
const resetLimiter = limiter(60 * 60 * 1000, 10, "auth/too-many-requests", "Too many tries. Please try again in an hour.");

// ALWAYS the same answer, whether the email has an account or not
router.post("/auth/forgot", forgotIpLimiter, forgotEmailLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!EMAIL_RE.test(email) || req.skipResetEmail) return res.json(FORGOT_OK);
  const user = await User.findOne({ email }).select("_id email blocked");
  if (user && !user.blocked) {
    const token = crypto.randomBytes(32).toString("hex");
    await User.updateOne({ _id: user._id }, { $set: { resetHash: sha256(token), resetExp: new Date(Date.now() + RESET_MS) } });
    sendMail({ to: user.email, subject: "Reset your password", ...emailTemplate({   // not awaited: same speed for every email
      title: "Reset your password",
      lines: ["Someone (hopefully you) asked to reset the password of your Work Abroad Hub account.",
              "Press the button to choose a new password."],
      button: "Choose a new password", url: `${env.APP_URL}/reset-password.html?token=${token}`,
      note: "This link expires in 30 minutes and works only once.",
    }) });
  }
  res.json(FORGOT_OK);
});

// the reset page sends { token, password }
router.post("/auth/reset", resetLimiter, async (req, res) => {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");
  const expired = () => fail(res, 400, "auth/expired-action-code", "This reset link has expired or was already used. Please ask for a new one.");
  if (!/^[a-f0-9]{64}$/.test(token)) return expired();
  const hash = sha256(token);
  const user = await User.findOne({ resetHash: hash, resetExp: { $gt: new Date() } }).select("_id email blocked");
  if (!user || user.blocked) return expired();
  const weak = validatePassword(password, user.email);
  if (weak) return fail(res, 400, "auth/weak-password", weak);       // link stays valid so they can try again
  const r = await User.updateOne({ _id: user._id, resetHash: hash }, {      // resetHash in the filter → the link works only once
    $set: { passwordHash: await bcrypt.hash(password, BCRYPT_COST), hasPassword: true, passwordChangedAt: new Date(),
            emailVerified: true, failedLogins: 0, lockUntil: null },
    $unset: { resetHash: 1, resetExp: 1 },
    $inc: { tokenVersion: 1 },                                       // logs out every device
  });
  if (!r.modifiedCount) return expired();
  forgetSession(user._id);
  sendPasswordChangedEmail(user.email);
  res.json({ ok: true });
});

// settings page: { currentPassword, newPassword }
router.post("/auth/change-password", authLimiter, async (req, res) => {
  const uid = await uidOf(req);
  if (!uid) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  const user = await User.findById(uid).select("+passwordHash");
  if (!user) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  const current = String(req.body?.currentPassword || ""), next = String(req.body?.newPassword || "");

  if (user.hasPassword === false) {
    // Google-only account: may set a first password, but only right after logging in
    if (!user.lastLoginAt || Date.now() - user.lastLoginAt > 10 * 60 * 1000)
      return fail(res, 401, "auth/requires-recent-login", "For your safety, log out and in again (or use “Forgot password?”), then set your password.");
  } else {
    if (!current) return fail(res, 400, "auth/missing-password", "Please type your current password.");
    const bad = await checkPassword(user, current, { status: 400, code: "auth/wrong-password", error: "Your current password is wrong." });
    if (bad) return fail(res, bad.status, bad.code, bad.error);
    if (current === next) return fail(res, 400, "auth/weak-password", "The new password must be different from the current one.");
  }
  const weak = validatePassword(next, user.email);
  if (weak) return fail(res, 400, "auth/weak-password", weak);

  const updated = await User.findByIdAndUpdate(uid, {
    $set: { passwordHash: await bcrypt.hash(next, BCRYPT_COST), hasPassword: true, passwordChangedAt: new Date(), failedLogins: 0, lockUntil: null },
    $unset: { resetHash: 1, resetExp: 1 },
    $inc: { tokenVersion: 1 },                    // every other device is logged out…
  }, { returnDocument: "after" });
  forgetSession(uid);
  setAuthCookie(res, updated);                     // …but this one gets a fresh cookie and stays in
  sendPasswordChangedEmail(user.email);
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
  const user = t && await User.findById(t.id).select("email name emailVerified isAdmin").lean();   // P10: only what shape() needs
  if (!user) { if (req.cookies?.[COOKIE_NAME]) clearAuthCookie(res); return res.json({ user: null }); }
  res.json({ user: shape(user) });
});

router.delete("/auth/me", async (req, res) => {
  const uid = await uidOf(req);
  if (!uid) return fail(res, 401, "auth/requires-recent-login", "Please log in.");
  await FbDoc.deleteMany({ col: { $in: ["users", "postings"] }, docId: uid });
  await deleteImagesOf(uid);               // P7: their photos / logos in GridFS
  await Notification.deleteMany({ user: uid });   // P8
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
  const uid = await uidOf(req), path = req.body?.path, q = req.body?.q;
  const { col } = parsePath(path, "col");
  if (isPublicCol(col)) {                   // P10: the job board — cached JSON shared by everyone, no DB read per request
    const r = await sharedResult(path, col, q);
    const own = personalDocs(r, uid);
    if (own) return res.json({ docs: own });
    return res.type("application/json").send(`{"docs":${r.json}}`);
  }
  res.json({ docs: await runQuery(path, q, uid) });
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
    const user = await User.findByIdAndUpdate(uid, { $set: set }, { returnDocument: "after", projection: { role: 1, tokenVersion: 1 } }).lean();
    if (user) setAuthCookie(res, user);
  }

  notify(out.col, out.id);
  notifyAfterWrite(out, uid);              // P8: runs in the background; errors are logged, never break the save
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
