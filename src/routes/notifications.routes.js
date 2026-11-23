// P8: /api/notifications (logged in)
//   GET  /?before=<iso>&limit=20   → { items (newest first), unreadCount, more }
//   GET  /unread-count             → { unreadCount }
//   POST /read  { ids: [...] } | { all: true }
//   GET  /settings · POST /settings { application, status, message }  (email on/off)
import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { markRead } from "../services/notify.js";
// same shape as Notification#toClient, for .lean() rows
const toClient = n => ({ id: String(n._id), type: n.type, title: n.title, body: n.body || "", link: n.link || {},
                         count: n.count || 1, read: !!n.read, createdAt: n.createdAt });

const router = Router();
const fail = (res, status, code, error) => res.status(status).json({ code, error });
const EMAIL_KEYS = ["application", "status", "message"];

router.use(rateLimit({
  windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => fail(res, 429, "resource-exhausted", "Too many requests, slow down."),
}));
router.use(requireAuth);

const unread = uid => Notification.countDocuments({ user: uid, read: false });

router.get("/", async (req, res) => {
  const uid = req.user.id;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const filter = { user: uid };
  if (req.query.before) {
    const d = new Date(String(req.query.before));
    if (isNaN(d)) return fail(res, 400, "invalid-argument", "before must be a date (ISO).");
    filter.createdAt = { $lt: d };
  }
  const [rows, unreadCount] = await Promise.all([                       // P10: both at once, plain objects
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean(),
    unread(uid),
  ]);
  res.json({ items: rows.slice(0, limit).map(toClient), unreadCount, more: rows.length > limit });
});

router.get("/unread-count", async (req, res) => {
  res.json({ unreadCount: await unread(req.user.id) });
});

router.post("/read", async (req, res) => {
  const uid = req.user.id, b = req.body || {};
  let changed;
  if (b.all === true) changed = await markRead(uid, { all: true });
  else if (Array.isArray(b.ids) && b.ids.length && b.ids.length <= 100 && b.ids.every(x => typeof x === "string" && mongoose.isValidObjectId(x) && /^[a-f0-9]{24}$/.test(x)))
    changed = await markRead(uid, { ids: b.ids.map(x => new mongoose.Types.ObjectId(x)) });
  else return fail(res, 400, "invalid-argument", "Send { ids: [...] } (max 100) or { all: true }.");
  res.json({ ok: true, changed, unreadCount: await unread(uid) });
});

const settingsOf = u => Object.fromEntries(EMAIL_KEYS.map(k => [k, u?.notifyEmail?.[k] !== false]));

router.get("/settings", async (req, res) => {
  const u = await User.findById(req.user.id).select("notifyEmail").lean();
  res.json({ notifyEmail: settingsOf(u) });
});

router.post("/settings", async (req, res) => {
  const b = req.body || {}, set = {};
  for (const k of EMAIL_KEYS) {
    if (b[k] === undefined) continue;
    if (typeof b[k] !== "boolean") return fail(res, 400, "invalid-argument", `${k} must be true or false.`);
    set["notifyEmail." + k] = b[k];
  }
  const u = await User.findByIdAndUpdate(req.user.id, { $set: set }, { returnDocument: "after" }).select("notifyEmail").lean();
  res.json({ notifyEmail: settingsOf(u) });
});

export default router;
