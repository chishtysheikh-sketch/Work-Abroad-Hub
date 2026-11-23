// P9: POST /api/reports — "🚩 Report" from logged-in, verified users.
//   { kind: "job",     targetId: <jobId>,  ownerUid: <employer uid>, reason }
//   { kind: "user",    targetId: <uid>,                              reason }
//   { kind: "message", targetId: <msgId>,  chatId: <chatId>,         reason }   (only members of that chat)
// Max 10 reports per person per 24 hours; one open report per person per thing.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import Report, { REPORT_KINDS } from "../models/Report.js";
import User from "../models/User.js";
import { load } from "../fb/core.js";
import { NEED_VERIFY } from "../fb/rules.js";

const router = Router();
const fail = (res, status, code, error) => res.status(status).json({ code, error });
const isId = s => typeof s === "string" && /^[a-f0-9]{24}$/.test(s);
const SEG = /^[A-Za-z0-9_\-]{1,128}$/;
const PER_DAY = 10;

router.use(rateLimit({                    // per IP, against floods; the 10/day per user is counted in the DB below
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => fail(res, 429, "resource-exhausted", "Too many requests, slow down."),
}));

router.post("/", requireAuth, async (req, res) => {
  const uid = req.user.id;
  if (!req.user.verified) return fail(res, 403, "failed-precondition", NEED_VERIFY);

  const b = req.body || {};
  const kind = b.kind, targetId = b.targetId, reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (!REPORT_KINDS.includes(kind)) return fail(res, 400, "invalid-argument", "kind must be job, user or message.");
  if (typeof targetId !== "string" || !SEG.test(targetId)) return fail(res, 400, "invalid-argument", "Bad targetId.");
  if (!reason) return fail(res, 400, "invalid-argument", "Please tell us what's wrong.");
  if (reason.length > 500) return fail(res, 400, "invalid-argument", "Please keep it under 500 characters.");

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  if (await Report.countDocuments({ reporter: uid, createdAt: { $gte: since } }) >= PER_DAY)
    return fail(res, 429, "resource-exhausted", "You can send 10 reports a day. Please try again tomorrow.");

  // the thing must exist (and, for messages, the reporter must be in that chat)
  const doc = { reporter: uid, kind, targetId, reason };
  if (kind === "job") {
    if (!isId(b.ownerUid)) return fail(res, 400, "invalid-argument", "ownerUid is needed for a job.");
    if (b.ownerUid === uid) return fail(res, 400, "invalid-argument", "You can't report your own job.");
    const posting = await load("postings", b.ownerUid);
    const job = (Array.isArray(posting?.jobs) ? posting.jobs : []).find(j => j && String(j.id) === targetId);
    if (!job) return fail(res, 404, "not-found", "This job doesn't exist any more.");
    Object.assign(doc, { ownerUid: b.ownerUid, snapshot: `${String(job.title || "").slice(0, 120)} · ${String(posting.company?.name || "").slice(0, 80)}` });
  } else if (kind === "user") {
    if (!isId(targetId)) return fail(res, 400, "invalid-argument", "Bad user id.");
    if (targetId === uid) return fail(res, 400, "invalid-argument", "You can't report yourself.");
    const u = await User.findById(targetId).select("name").lean();
    if (!u) return fail(res, 404, "not-found", "This user doesn't exist any more.");
    Object.assign(doc, { ownerUid: targetId, snapshot: String(u.name || "").slice(0, 120) });
  } else {
    if (typeof b.chatId !== "string" || !SEG.test(b.chatId)) return fail(res, 400, "invalid-argument", "chatId is needed for a message.");
    const chat = await load("chats", b.chatId);
    if (!chat || (chat.studentUid !== uid && chat.employerUid !== uid)) return fail(res, 403, "permission-denied", "Not your chat.");
    const msg = await load(`chats/${b.chatId}/messages`, targetId);
    if (!msg) return fail(res, 404, "not-found", "This message doesn't exist.");
    if (msg.from === uid) return fail(res, 400, "invalid-argument", "You can't report your own message.");
    Object.assign(doc, { ownerUid: msg.from, chatId: b.chatId, snapshot: String(msg.text || "").slice(0, 300) });
  }

  try {
    const r = await Report.create(doc);
    res.status(201).json({ ok: true, id: String(r._id) });
  } catch (e) {
    if (e.code === 11000) return fail(res, 409, "already-exists", "You already reported this. Our team will look at it.");
    throw e;
  }
});

export default router;
