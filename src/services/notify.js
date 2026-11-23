// P8: create notifications, push them live (Socket.IO room "user:<uid>" in /fb) and send optional emails.
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "../sockets/fbLive.js";
import { sendMail, emailTemplate } from "../utils/mailer.js";
import { env } from "../config/env.js";
import { load } from "../fb/core.js";
import { logger } from "../utils/logger.js";

const MSG_EMAIL_DELAY = 10 * 60 * 1000;     // message emails only if still unread after 10 minutes
const EMAIL_TYPES = ["application", "status", "message"];   // types the user can turn emails on/off for
const cut = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export const openUrl = link => link && link.kind && link.id
  ? `${env.APP_URL}/?open=${link.kind}:${encodeURIComponent(link.id)}` : `${env.APP_URL}/`;

async function wantsEmail(uid, type) {
  if (!EMAIL_TYPES.includes(type)) return null;
  const u = await User.findById(uid).select("email emailVerified blocked notifyEmail").lean().catch(() => null);
  if (!u || u.blocked || !u.emailVerified) return null;          // never mail unconfirmed addresses
  return u.notifyEmail?.[type] === false ? null : u;              // default: on
}

async function emailFor(n) {
  const u = await wantsEmail(n.user, n.type);
  if (!u) return;
  const button = { application: "View application", status: "View my applications", message: "Open chat" }[n.type] || "Open";
  await sendMail({ to: u.email, subject: n.title, ...emailTemplate({
    title: n.title, lines: [n.body].filter(Boolean), button, url: openUrl(n.link),
    footer: "You can turn these emails off in Settings → Email notifications.",
  }) });
}

// Message emails wait 10 minutes. setTimeout is fine for one server; it is lost on restart.
// (Later: a real job queue, e.g. Agenda/BullMQ, so delayed emails survive restarts and work with several servers.)
const pendingMsgEmail = new Map();          // notification id → timer
function scheduleMessageEmail(id) {
  const key = String(id);
  if (pendingMsgEmail.has(key)) return;     // one email per unread group
  const t = setTimeout(async () => {
    pendingMsgEmail.delete(key);
    try {
      const n = await Notification.findById(key).lean();
      if (n && !n.read) await emailFor(n);
    } catch (err) { logger.error({ err }, "🔔 message email failed"); }
  }, MSG_EMAIL_DELAY);
  t.unref?.();
  pendingMsgEmail.set(key, t);
}

// data = { type, title, body, link }  → saved, pushed live, emailed if wanted
export async function createNotification(uid, data) {
  if (!uid) return null;
  const base = { type: data.type, title: cut(data.title, 200), body: cut(data.body, 500), link: data.link || {} };

  if (base.type === "message" && base.link.chatId) {
    // already an unread notification for this chat → update it instead of adding another
    const filter = { user: uid, type: "message", read: false, "link.chatId": base.link.chatId };
    const update = { $set: { ...base, createdAt: new Date() }, $inc: { count: 1 }, $setOnInsert: { user: uid, read: false } };
    let n;
    try { n = await Notification.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" }); }
    catch (e) {                                // two messages at the same moment both tried to create it
      if (e.code !== 11000) throw e;
      n = await Notification.findOneAndUpdate(filter, update, { returnDocument: "after" });
    }
    if (!n) return null;
    emitToUser(uid, "notif", n.toClient());
    scheduleMessageEmail(n._id);
    return n;
  }

  const n = await Notification.create({ user: uid, ...base });
  emitToUser(uid, "notif", n.toClient());
  emailFor(n).catch(err => logger.error({ err, type: n.type }, "🔔 email failed"));
  return n;
}

// which = { ids: [...] } | { chatId } | { all: true }. Tells all the user's open tabs/devices.
export async function markRead(uid, which = {}) {
  const filter = { user: uid, read: false };
  if (which.ids) filter._id = { $in: which.ids };
  else if (which.chatId) Object.assign(filter, { type: "message", "link.chatId": which.chatId });
  else if (!which.all) return 0;
  const r = await Notification.updateMany(filter, { $set: { read: true } });
  if (r.modifiedCount) {
    const unreadCount = await Notification.countDocuments({ user: uid, read: false });
    emitToUser(uid, "notifRead", { unreadCount, ids: which.ids ? which.ids.map(String) : undefined, chatId: which.chatId, all: !!which.all });
  }
  return r.modifiedCount;
}

// ---------- triggers: called after a SUCCESSFUL POST /api/fb/write ----------
const STATUS_TEXT = { new: "New", contacted: "Contacted", interview: "Interview", hired: "Hired 🎉", rejected: "Not selected" };

async function afterWrite(out, uid) {
  const { col, id, data: n, old: o, kind } = out;
  if (!n) return;                                          // deletes: nothing to tell
  const top = col.split("/")[0], sub = col.split("/")[2];

  if (col === "applications" && kind === "create" && n.employerUid && n.employerUid !== uid) {
    await createNotification(n.employerUid, {
      type: "application", title: `New application: ${cut(n.name, 60) || "A student"} applied for ${cut(n.jobTitle, 80)}`,
      body: [cut(n.visa, 20), cut(n.topik, 20), cut(n.school, 60)].filter(Boolean).join(" · "),
      link: { kind: "application", id, jobId: String(n.jobId || "") },
    });
  }

  if (col === "applications" && kind === "update" && o && o.status !== n.status && n.studentUid) {
    await createNotification(n.studentUid, {
      type: "status", title: `Your application for ${cut(n.jobTitle, 80)} is now ${STATUS_TEXT[n.status] || cut(n.status, 20)}`,
      body: cut(n.company, 80),
      link: { kind: "application", id, jobId: String(n.jobId || "") },
    });
  }

  if (top === "chats" && sub === "messages" && kind === "create") {
    const chatId = col.split("/")[1], c = await (out.load || load)("chats", chatId);   // P10: the rules already read it
    if (!c) return;
    const fromStudent = n.from === c.studentUid;
    const to = fromStudent ? c.employerUid : c.studentUid;
    if (!to || to === n.from) return;
    const name = cut(fromStudent ? c.studentName || "Student" : c.employerName || "Employer", 60);
    await createNotification(to, {
      type: "message", title: `New message from ${name}`, body: cut(n.text, 160),
      link: { kind: "chat", id: chatId, chatId },
    });
  }

  // someone opened the chat (readBy moved forward) → their message notification for it is read
  if (col === "chats" && kind === "update" && uid) {
    const before = Number(o?.readBy?.[uid] || 0), after = Number(n.readBy?.[uid] || 0);
    if (after > before) await markRead(uid, { chatId: id });
  }

  if (col === "postings" && Array.isArray(n.jobs)) {
    const wasOpen = new Set((Array.isArray(o?.jobs) ? o.jobs : []).filter(j => j && j.status === "open").map(j => String(j.id)));
    for (const j of n.jobs) {
      if (!j || j.status !== "open" || wasOpen.has(String(j.id))) continue;
      await createNotification(id, {
        type: "job", title: `Your job ${cut(j.title, 80)} is live`, body: "Students can see it on the job board now.",
        link: { kind: "job", id: String(j.id), jobId: String(j.id) },
      });
    }
  }
}

// never let a notification problem break (or slow down) the save itself
export function notifyAfterWrite(out, uid) {
  afterWrite(out, uid).catch(err => logger.error({ err, col: out.col }, "🔔 notification failed"));
}
