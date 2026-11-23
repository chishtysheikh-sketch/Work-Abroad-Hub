// P9: /api/admin — the private admin panel's API. Every route: rate limited + requireAdmin (checked in the DB).
//   GET  /stats
//   GET  /users?q=&filter=&page=             POST /users/:id/block { blocked, reason }
//   GET  /employers?status=pending|verified  POST /employers/:uid/verify { verified }
//   GET  /jobs?q=&status=&page=              POST /jobs/:ownerUid/:jobId/hide { hidden, reason }
//   GET  /reports?status=open|resolved       POST /reports/:id/resolve { note }
//   GET  /log?page=
// Every change is written to the AdminLog collection.
import { rateLimited, security, logger } from "../utils/logger.js";
import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { requireAdmin } from "../middleware/admin.js";
import User from "../models/User.js";
import FbDoc from "../models/FbDoc.js";
import Report from "../models/Report.js";
import AdminLog from "../models/AdminLog.js";
import { forgetSession } from "../utils/session.js";
import { notify, kickUser } from "../sockets/fbLive.js";
import { createNotification } from "../services/notify.js";
import { sendMail, emailTemplate } from "../utils/mailer.js";
import { env } from "../config/env.js";

const router = Router();
const PAGE = 20;
const DAY = 24 * 3600 * 1000;
const TZ = "Asia/Seoul";

const fail = (res, status, code, error) => res.status(status).json({ code, error });
const isId = s => typeof s === "string" && /^[a-f0-9]{24}$/.test(s);
const isJobId = s => typeof s === "string" && /^[A-Za-z0-9_\-]{1,128}$/.test(s);
const cut = (s, n) => String(s ?? "").trim().slice(0, n);
const rx = q => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
const pageOf = req => Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 1000);
const query = req => cut(req.query.q, 100);

router.use(rateLimit({
  windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => { rateLimited(req, "admin"); fail(res, 429, "resource-exhausted", "Too many requests, slow down."); },
}));
router.use(requireAdmin);

function log(req, action, target, details = {}) {
  // P11: also a security line in the server log (who, what, on what — details stay in AdminLog)
  security(req.log, "admin.action", { admin: req.user.id, action, target }, `admin: ${action} ${target}`);
  return AdminLog.create({ admin: req.user.id, adminEmail: req.user.email, action, target, details })
    .catch(err => req.log.error({ err }, "AdminLog write failed"));
}

// ---------- dashboard numbers ----------
router.get("/stats", async (req, res) => {
  const since30 = new Date(Date.now() - 29 * DAY); since30.setHours(0, 0, 0, 0);
  const since7 = new Date(Date.now() - 7 * DAY);
  const count = arr => Object.fromEntries(arr.map(r => [String(r._id ?? "none"), r.n]));

  const [users, jobs, apps, messages, signups, reports] = await Promise.all([
    User.aggregate([{ $facet: {
      byRole:   [{ $group: { _id: "$role", n: { $sum: 1 } } }],
      verified: [{ $group: { _id: { $cond: ["$emailVerified", "verified", "unverified"] }, n: { $sum: 1 } } }],
      blocked:  [{ $match: { blocked: true } }, { $count: "n" }],
      admins:   [{ $match: { isAdmin: true } }, { $count: "n" }],
      total:    [{ $count: "n" }],
    } }]),
    FbDoc.aggregate([
      { $match: { col: "postings" } },
      { $unwind: "$data.jobs" },
      { $group: { _id: { $cond: [{ $eq: ["$data.jobs.hiddenByAdmin", true] }, "hidden",
                         { $cond: [{ $eq: ["$data.jobs.status", "open"] }, "open", "closed"] }] }, n: { $sum: 1 } } },
    ]),
    FbDoc.aggregate([{ $match: { col: "applications" } }, { $group: { _id: "$data.status", n: { $sum: 1 } } }]),
    FbDoc.aggregate([
      { $match: { col: { $regex: "^chats/[^/]+/messages$" }, createdAt: { $gte: since7 } } },
      { $count: "n" },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, n: { $sum: 1 } } },
    ]),
    Report.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  // every day of the last 30, also the ones with 0 sign-ups
  const perDay = count(signups), days = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  for (let i = 29; i >= 0; i--) { const d = fmt.format(new Date(Date.now() - i * DAY)); days.push({ day: d, n: perDay[d] || 0 }); }

  const u = users[0], one = a => (a[0] ? a[0].n : 0);
  const jobCount = count(jobs);
  res.json({
    users: { total: one(u.total), byRole: count(u.byRole), verified: count(u.verified), blocked: one(u.blocked), admins: one(u.admins) },
    jobs: { open: jobCount.open || 0, closed: jobCount.closed || 0, hidden: jobCount.hidden || 0 },
    applications: count(apps),
    messages7d: one(messages),
    signups30d: days,
    reports: { open: 0, resolved: 0, ...count(reports) },
  });
});

// ---------- users ----------
router.get("/users", async (req, res) => {
  const q = query(req), page = pageOf(req), filter = {};
  if (q) filter.$or = [{ email: rx(q) }, { name: rx(q) }];
  if (req.query.filter === "blocked") filter.blocked = true;
  else if (req.query.filter === "unverified") filter.emailVerified = { $ne: true };
  else if (req.query.filter === "admins") filter.isAdmin = true;
  else if (["student", "employer"].includes(req.query.filter)) filter.role = req.query.filter;
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE)
      .select("email name role emailVerified blocked blockedReason blockedAt isAdmin createdAt lastLoginAt googleSub").lean(),
    User.countDocuments(filter),
  ]);
  res.json({
    page, pages: Math.max(1, Math.ceil(total / PAGE)), total,
    items: rows.map(u => ({ id: String(u._id), email: u.email, name: u.name, role: u.role, verified: !!u.emailVerified,
      blocked: !!u.blocked, blockedReason: u.blockedReason || "", isAdmin: !!u.isAdmin, google: !!u.googleSub,
      createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null, me: String(u._id) === req.user.id })),
  });
});

router.post("/users/:id/block", async (req, res) => {
  const id = req.params.id, blocked = req.body?.blocked, reason = cut(req.body?.reason, 500);
  if (!isId(id)) return fail(res, 400, "invalid-argument", "Bad user id.");
  if (typeof blocked !== "boolean") return fail(res, 400, "invalid-argument", "blocked must be true or false.");
  if (blocked && !reason) return fail(res, 400, "invalid-argument", "Please write a reason (the user gets it by email).");
  if (id === req.user.id) return fail(res, 400, "invalid-argument", "You can't block yourself.");
  const u = await User.findById(id).select("email isAdmin blocked").lean();
  if (!u) return fail(res, 404, "not-found", "No such user.");
  if (blocked && u.isAdmin) return fail(res, 400, "invalid-argument", "This user is an admin. Remove their admin rights first.");
  if (!!u.blocked === blocked) return res.json({ ok: true, blocked, unchanged: true });

  await User.updateOne({ _id: id }, blocked
    ? { $set: { blocked: true, blockedReason: reason, blockedAt: new Date() }, $inc: { tokenVersion: 1 } }   // old cookies die
    : { $set: { blocked: false }, $unset: { blockedReason: 1, blockedAt: 1 } });
  forgetSession(id);                       // no 30-second cache: the next request is already refused
  if (blocked) kickUser(id);               // close their live connections (chat / notifications)
  await log(req, blocked ? "user.block" : "user.unblock", "user:" + id, { email: u.email, reason });
  // employers: their open jobs go off the board with the block, and come back with the unblock
  const jobs = await blockJobs(id, blocked);
  if (jobs.length) await log(req, blocked ? "jobs.block-hide" : "jobs.block-restore", "user:" + id,
    { email: u.email, count: jobs.length, jobs: jobs.map(j => `${j.id} ${j.title}`).join(" | ") });

  sendMail({ to: u.email, ...(blocked
    ? { subject: "Your account has been blocked", ...emailTemplate({
        title: "Your account has been blocked",
        lines: ["Your Work Abroad Hub account was blocked by our team and you were logged out.", `Reason: ${reason}`,
                "If you think this is a mistake, reply to this email."],
        footer: "Work Abroad Hub · safety team" }) }
    : { subject: "Your account is active again", ...emailTemplate({
        title: "Your account is active again",
        lines: ["Our team unblocked your Work Abroad Hub account. You can log in again."],
        button: "Open Work Abroad Hub", url: `${env.APP_URL}/`, footer: "Work Abroad Hub · safety team" }) }) });

  res.json({ ok: true, blocked, [blocked ? "jobsHidden" : "jobsRestored"]: jobs.length });
});

// Block → hide every OPEN job (hiddenByAdmin, reason "account blocked", marked byBlock).
// Unblock → bring back ONLY the jobs marked byBlock; jobs an admin hid on purpose stay hidden.
// Runs after the user is blocked, so the employer can't save their postings in between.
export const BLOCK_REASON = "account blocked";
async function blockJobs(uid, blocked) {
  const doc = await FbDoc.findOne({ col: "postings", docId: uid }).select("data.jobs").lean();
  const all = (Array.isArray(doc?.data?.jobs) ? doc.data.jobs : []).filter(j => j && j.id != null);
  const hit = blocked ? all.filter(j => j.status === "open" && !j.hiddenByAdmin)
                      : all.filter(j => j.hiddenByAdmin && j.hiddenInfo?.byBlock === true);
  if (!hit.length) return [];
  const J = "data.jobs.$[j].";
  const [update, filter] = blocked
    ? [{ $set: { [J + "status"]: "closed", [J + "hiddenByAdmin"]: true, updatedAt: new Date(),
                 [J + "hiddenInfo"]: { reason: BLOCK_REASON, at: Date.now(), prevStatus: "open", byBlock: true } } },
       { "j.status": "open", "j.hiddenByAdmin": { $ne: true } }]
    : [{ $set: { [J + "status"]: "open", updatedAt: new Date() }, $unset: { [J + "hiddenByAdmin"]: "", [J + "hiddenInfo"]: "" } },
       { "j.hiddenByAdmin": true, "j.hiddenInfo.byBlock": true }];
  await FbDoc.collection.updateOne({ col: "postings", docId: uid }, update, { arrayFilters: [filter] });
  notify("postings", uid);                 // job board updates live
  return hit.map(j => ({ id: String(j.id), title: String(j.title || "").slice(0, 80) }));
}

// ---------- employers ----------
router.get("/employers", async (req, res) => {
  const status = req.query.status === "verified" ? "verified" : "pending", q = query(req), page = pageOf(req);
  const match = { col: "postings", "data.company.name": { $exists: true, $nin: ["", null] },
                  "data.company.verified": status === "verified" ? true : { $ne: true } };
  if (q) match.$or = [{ "data.company.name": rx(q) }, { "data.company.biz": rx(q) }, { "data.company.email": rx(q) }];
  const [rows, total] = await Promise.all([
    FbDoc.find(match).sort({ updatedAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).select("docId data.company data.jobs updatedAt").lean(),
    FbDoc.countDocuments(match),
  ]);
  const ids = rows.map(r => r.docId).filter(isId);
  const accounts = new Map((await User.find({ _id: { $in: ids } }).select("email emailVerified blocked createdAt").lean()).map(u => [String(u._id), u]));
  res.json({
    status, page, pages: Math.max(1, Math.ceil(total / PAGE)), total,
    items: rows.map(r => {
      const c = r.data?.company || {}, jobs = Array.isArray(r.data?.jobs) ? r.data.jobs.filter(Boolean) : [], a = accounts.get(r.docId);
      return { uid: r.docId, verified: c.verified === true, updatedAt: r.updatedAt,
        company: { name: c.name || "", biz: c.biz || "", type: c.type || "", contact: c.contact || "", email: c.email || "",
                   phone: c.phone || "", city: c.city || "", address: c.address || "" },
        jobs: jobs.length, openJobs: jobs.filter(j => j.status === "open" && !j.hiddenByAdmin).length,
        account: a ? { email: a.email, verified: !!a.emailVerified, blocked: !!a.blocked, createdAt: a.createdAt } : null };
    }),
  });
});

router.post("/employers/:uid/verify", async (req, res) => {
  const uid = req.params.uid, verified = req.body?.verified;
  if (!isId(uid)) return fail(res, 400, "invalid-argument", "Bad employer id.");
  if (typeof verified !== "boolean") return fail(res, 400, "invalid-argument", "verified must be true or false.");
  const posting = await FbDoc.findOne({ col: "postings", docId: uid }).select("data.company").lean();
  if (!posting) return fail(res, 404, "not-found", "This employer has no company profile yet.");
  const name = posting.data?.company?.name || "";
  // written directly (not through the website's rules): only admins can set it
  await Promise.all([
    FbDoc.updateOne({ col: "postings", docId: uid }, { $set: { "data.company.verified": verified } }),
    FbDoc.updateOne({ col: "users", docId: uid }, { $set: { "data.company.verified": verified } }),
    User.updateOne({ _id: uid }, { $set: { "company.verified": verified } }),
  ]);
  notify("postings", uid); notify("users", uid);
  await log(req, verified ? "employer.verify" : "employer.unverify", "user:" + uid, { company: name });
  if (verified) createNotification(uid, { type: "system", title: "Your company is now a ✓ Verified employer",
    body: "Students now see a “Verified employer” badge on your jobs." }).catch(err => logger.error({ err }, "verify notification failed"));
  res.json({ ok: true, verified });
});

// ---------- jobs ----------
router.get("/jobs", async (req, res) => {
  const q = query(req), page = pageOf(req);
  const pipe = [
    { $match: { col: "postings" } },
    { $project: { _id: 0, ownerUid: "$docId", company: "$data.company.name", verified: "$data.company.verified", job: "$data.jobs" } },
    { $unwind: "$job" },
    { $match: { "job.id": { $exists: true } } },
  ];
  if (q) pipe.push({ $match: { $or: [{ "job.title": rx(q) }, { company: rx(q) }, { "job.city": rx(q) }, { "job.id": q }] } });
  const st = req.query.status;
  if (st === "hidden") pipe.push({ $match: { "job.hiddenByAdmin": true } });
  else if (st === "open") pipe.push({ $match: { "job.status": "open", "job.hiddenByAdmin": { $ne: true } } });
  else if (st === "closed") pipe.push({ $match: { "job.status": { $ne: "open" }, "job.hiddenByAdmin": { $ne: true } } });
  pipe.push({ $sort: { "job.createdAt": -1, ownerUid: 1 } },
            { $facet: { items: [{ $skip: (page - 1) * PAGE }, { $limit: PAGE }], total: [{ $count: "n" }] } });
  const [out] = await FbDoc.aggregate(pipe);
  const total = out.total[0]?.n || 0;
  res.json({
    page, pages: Math.max(1, Math.ceil(total / PAGE)), total,
    items: out.items.map(({ ownerUid, company, verified, job: j }) => ({
      ownerUid, company: company || "", verified: verified === true, id: String(j.id), title: String(j.title || ""),
      city: j.city || "", area: j.area || "", pay: j.pay, payType: j.payType || "hourly", status: j.status || "closed",
      createdAt: j.createdAt || null, deadline: j.deadline || "", hidden: !!j.hiddenByAdmin, hiddenInfo: j.hiddenInfo || null,
    })),
  });
});

router.post("/jobs/:ownerUid/:jobId/hide", async (req, res) => {
  const { ownerUid, jobId } = req.params, hidden = req.body?.hidden, reason = cut(req.body?.reason, 500);
  if (!isId(ownerUid) || !isJobId(jobId)) return fail(res, 400, "invalid-argument", "Bad job.");
  if (typeof hidden !== "boolean") return fail(res, 400, "invalid-argument", "hidden must be true or false.");
  if (hidden && !reason) return fail(res, 400, "invalid-argument", "Please write a reason (the employer sees it).");
  const doc = await FbDoc.findOne({ col: "postings", docId: ownerUid }).select("data.jobs").lean();
  const job = (Array.isArray(doc?.data?.jobs) ? doc.data.jobs : []).find(j => j && String(j.id) === jobId);
  if (!job) return fail(res, 404, "not-found", "No such job.");
  if (!!job.hiddenByAdmin === hidden) return res.json({ ok: true, hidden, unchanged: true });

  const J = "data.jobs.$[j].";
  const update = hidden
    ? { $set: { [J + "status"]: "closed", [J + "hiddenByAdmin"]: true,
                [J + "hiddenInfo"]: { reason, at: Date.now(), prevStatus: job.status || "closed" }, updatedAt: new Date() } }
    : { $set: { [J + "status"]: job.hiddenInfo?.prevStatus === "open" ? "open" : "closed", updatedAt: new Date() },
        $unset: { [J + "hiddenByAdmin"]: "", [J + "hiddenInfo"]: "" } };
  // native driver: arrayFilters on a Mixed field, only that one job changes (the employer may save at the same time)
  await FbDoc.collection.updateOne({ col: "postings", docId: ownerUid }, update, { arrayFilters: [{ "j.id": job.id }] });
  notify("postings", ownerUid);             // the job board updates live for everyone
  await log(req, hidden ? "job.hide" : "job.unhide", `job:${ownerUid}/${jobId}`, { title: job.title || "", reason });
  createNotification(ownerUid, hidden
    ? { type: "job", title: `An admin hid your job “${cut(job.title, 80)}”`, body: `Reason: ${reason}`, link: { kind: "job", id: jobId } }
    : { type: "job", title: `Your job “${cut(job.title, 80)}” is visible again`, link: { kind: "job", id: jobId } })
    .catch(err => logger.error({ err }, "job hide notification failed"));
  res.json({ ok: true, hidden });
});

// ---------- reports ----------
router.get("/reports", async (req, res) => {
  const status = req.query.status === "resolved" ? "resolved" : "open", page = pageOf(req);
  const [rows, total] = await Promise.all([
    Report.find({ status }).sort({ createdAt: status === "open" ? 1 : -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    Report.countDocuments({ status }),
  ]);
  const ids = [...new Set(rows.flatMap(r => [r.reporter, r.ownerUid]).filter(isId))];
  const emails = new Map((await User.find({ _id: { $in: ids } }).select("email blocked").lean()).map(u => [String(u._id), u]));
  const who = id => { const u = emails.get(id); return u ? { uid: id, email: u.email, blocked: !!u.blocked } : (id ? { uid: id, email: "(deleted)" } : null); };
  res.json({
    status, page, pages: Math.max(1, Math.ceil(total / PAGE)), total,
    items: rows.map(r => ({ id: String(r._id), kind: r.kind, targetId: r.targetId, chatId: r.chatId || "", snapshot: r.snapshot || "",
      reason: r.reason, status: r.status, note: r.note || "", createdAt: r.createdAt, resolvedAt: r.resolvedAt || null,
      reporter: who(r.reporter), owner: who(r.ownerUid) })),
  });
});

router.post("/reports/:id/resolve", async (req, res) => {
  const id = req.params.id, note = cut(req.body?.note, 500);
  if (!isId(id)) return fail(res, 400, "invalid-argument", "Bad report id.");
  const r = await Report.findOneAndUpdate({ _id: id, status: "open" },
    { $set: { status: "resolved", note, resolvedBy: req.user.id, resolvedAt: new Date() } }, { returnDocument: "after" }).lean();
  if (!r) return fail(res, (await Report.exists({ _id: id })) ? 409 : 404, "failed-precondition", "This report is already resolved or doesn't exist.");
  await log(req, "report.resolve", "report:" + id, { kind: r.kind, targetId: r.targetId, note });
  res.json({ ok: true });
});

// ---------- audit log ----------
router.get("/log", async (req, res) => {
  const page = pageOf(req), filter = {};
  if (typeof req.query.action === "string" && /^[a-z.]{1,40}$/.test(req.query.action)) filter.action = req.query.action;
  const [rows, total] = await Promise.all([
    AdminLog.find(filter).sort({ at: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    AdminLog.countDocuments(filter),
  ]);
  res.json({ page, pages: Math.max(1, Math.ceil(total / PAGE)), total,
    items: rows.map(l => ({ id: String(l._id), admin: l.adminEmail || l.admin, action: l.action, target: l.target, details: l.details || {}, at: l.at })) });
});

// bad ObjectIds etc. → clear JSON instead of a 500
router.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.CastError) return fail(res, 400, "invalid-argument", "Bad id.");
  next(err);
});

export default router;
