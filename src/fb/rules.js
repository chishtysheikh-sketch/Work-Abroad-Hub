// Security rules: the same rules the site had in Firebase (firestore.rules),
// rewritten in JavaScript. The server checks them on EVERY read and write.
//
// load(col, id) must return that document's data (or null).

import { minWage } from "../utils/pay.js";
import { validBizNo } from "../utils/bizno.js";
const ROLES = ["student", "employer"];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Smallest legal pay (same formula as the job form on the website)
// daily: hours per day. monthly: hours per week (+ paid weekly holiday), 209-hour month.
function minPayFor(type, hrs) {
  const MIN_WAGE = minWage();
  if (type === "hourly" || !type) return MIN_WAGE;
  if (!(hrs > 0)) return null;
  if (type === "daily") return Math.ceil(MIN_WAGE * hrs);
  const holiday = hrs >= 15 ? Math.min(hrs, 40) / 40 * 8 : 0;
  return Math.ceil(MIN_WAGE * (hrs + holiday) * 209 / 48);
}
// P12 fix: an OPEN job must have a real pay that meets the minimum wage. Before, the check was skipped
// when pay was 0 / missing / text, when a daily or monthly job had no hours, or for an unknown pay type
// (so the API accepted e.g. a ₩1 monthly job). Old jobs without a pay type still count as hourly.
const PAY_TYPES = ["hourly", "daily", "monthly"];
function payProblem(j) {
  const type = j.payType || "hourly";
  const title = String(j.title || "").slice(0, 40);
  if (!PAY_TYPES.includes(type)) return `Pay type must be hourly, daily or monthly: ${title}`;
  const pay = typeof j.pay === "number" ? j.pay : typeof j.pay === "string" && j.pay.trim() ? Number(j.pay) : NaN;
  if (!Number.isFinite(pay) || pay <= 0) return `Please enter the pay: ${title}`;
  let hrs = null;
  if (type !== "hourly") {
    hrs = Number(j.payHours);
    const max = type === "daily" ? 24 : 168;
    if (!(hrs > 0 && hrs <= max)) return `Please enter the hours per ${type === "daily" ? "day (1–24)" : "week (1–168)"}: ${title}`;
  }
  if (pay < minPayFor(type, hrs)) return `Pay is below the minimum wage (₩${minWage().toLocaleString()}/hour): ${title}`;
  return "";
}

// split "chats/abc/messages" → { top: "chats", parentId: "abc", sub: "messages" }
export function colInfo(col) {
  const p = col.split("/");
  return p.length === 1 ? { top: p[0] } : { top: p[0], parentId: p[1], sub: p[2] };
}

async function myRole(uid, load) {
  const u = await load("users", uid);
  return u ? u.role : null;
}

async function inChat(chatId, uid, load, cache = {}) {
  if (!uid) return false;
  if (!(chatId in cache)) cache[chatId] = await load("chats", chatId);
  const c = cache[chatId];
  return !!c && (c.studentUid === uid || c.employerUid === uid);
}

export async function canRead(col, id, data, uid, load, cache) {
  const { top, parentId, sub } = colInfo(col);
  if (top === "users" && !sub) return !!uid && uid === id;
  if (top === "postings" && !sub) return true;
  if (top === "applications" && !sub)
    return !!uid && !!data && (data.studentUid === uid || data.employerUid === uid);
  if (top === "chats" && !sub)
    return !!uid && !!data && (data.studentUid === uid || data.employerUid === uid);
  if (top === "chats" && sub === "messages") return inChat(parentId, uid, load, cache);
  return false;
}

// P7: a "photo" / "logo" field in users / postings may only be one of our uploaded files
// (/api/files/<id>) or an OLD small data URL (from before P7). No outside links, no huge blobs.
const FILE_URL_RE = /^\/api\/files\/[a-f0-9]{24}$/;
const OLD_DATA_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_OLD_DATA = 300 * 1024;
const IMAGE_KEYS = new Set(["photo", "logo"]);
export function badImage(v, depth = 0) {
  if (depth > 20 || v === null || typeof v !== "object") return "";
  for (const [k, x] of Object.entries(v)) {
    if (IMAGE_KEYS.has(k) && x !== undefined && x !== null && x !== "") {
      if (typeof x !== "string") return `${k} must be an image link.`;
      if (FILE_URL_RE.test(x)) continue;
      if (x.length <= MAX_OLD_DATA && OLD_DATA_RE.test(x)) continue;
      return x.startsWith("data:") ? `The ${k} is too big. Please upload it again.` : `The ${k} must be an uploaded image.`;
    }
    const why = badImage(x, depth + 1);
    if (why) return why;
  }
  return "";
}

// P9: a job an admin hid (hiddenByAdmin: true) stays closed and hidden until an admin un-hides it.
// The employer may edit or delete it, but can't reopen it or touch hiddenByAdmin / hiddenInfo.
export const HIDDEN_JOB = "An admin hid this job, so it can't be reopened. Please contact us if you think this is a mistake.";
function hiddenJobChange(oldJobs, newJobs) {
  const before = new Map((Array.isArray(oldJobs) ? oldJobs : []).filter(j => j && j.id != null).map(j => [String(j.id), j]));
  for (const j of newJobs) {
    if (!j || typeof j !== "object") continue;
    const was = before.get(String(j.id));
    const hidden = !!(was && was.hiddenByAdmin);
    if (!!j.hiddenByAdmin !== hidden || (hidden && !same(was.hiddenInfo, j.hiddenInfo)) || (!hidden && j.hiddenInfo !== undefined))
      return "Only an admin can hide or un-hide a job.";
    if (hidden && j.status === "open") return HIDDEN_JOB;
  }
  return "";
}

export const NEED_PHONE = "Please confirm your phone number first: we text you a 6-digit code.";
export const BAD_BIZ = "This business registration number isn't valid. Please check the 10 digits on your certificate.";
export const MOBILE_RE = /^010-?\d{4}-?\d{4}$/;
export const BAD_MOBILE = "Please enter a Korean mobile number that starts with 010 (010-1234-5678).";
export const NEED_VERIFY = "Please verify your email first. Check your inbox (and spam).";

// op = "create" | "update" | "delete". Returns "" when allowed, otherwise a reason.
// ctx.verified = has the caller confirmed their email?
export async function canWrite(op, col, id, oldData, newData, uid, load, ctx = {}) {
  if (!uid) return "Please log in.";
  const { top, parentId, sub } = colInfo(col);
  const n = newData || {}, o = oldData || {};

  // unverified accounts may save their own profile and company (sign-up needs it), but not post jobs, apply or chat
  if (!ctx.verified) {
    // the company profile may be saved (sign-up needs it); OPEN jobs need a confirmed email
    const posting = top === "postings" && !sub && op !== "delete" && Array.isArray(n.jobs) && n.jobs.some(j => j && j.status === "open");
    const creates = op === "create" && ((top === "applications" && !sub) || top === "chats");
    if (posting || creates) return NEED_VERIFY;
  }

  if (top === "users" && !sub) {
    if (uid !== id) return "Not your profile.";
    if (op === "delete") return "";
    if (!ROLES.includes(n.role)) return "Role must be student or employer.";
    // students: a Korean mobile number 010-XXXX-XXXX (checked when it changes, so old profiles still save)
    const ph = n.profile?.phone, oldPh = o.profile?.phone;
    if (n.role === "student" && n.profile && ph !== oldPh && !MOBILE_RE.test(String(ph ?? "")))
      return BAD_MOBILE;
    return badImage(n);
  }

  if (top === "postings" && !sub) {
    if (uid !== id) return "Not your company.";
    if (op === "delete") return "";
    if ((await myRole(uid, load)) !== "employer") return "Only employers can post jobs.";
    if (!Array.isArray(n.jobs)) return "jobs must be a list.";
    // business number: must pass the official check digit (checked when it changes, so old profiles still save)
    const biz = n.company?.biz;
    if (biz != null && biz !== o.company?.biz && !validBizNo(biz))
      return BAD_BIZ;
    if (n.jobs.length > 50) return "Max 50 jobs.";
    const img = badImage(n);
    if (img) return img;
    const hid = hiddenJobChange(o.jobs, n.jobs);
    if (hid) return hid;
    for (const j of n.jobs) {
      if (!j || typeof j !== "object" || j.status !== "open") continue;
      const why = payProblem(j);
      if (why) return why;
    }
    return "";
  }

  if (top === "applications" && !sub) {
    if (op === "create") {
      if ((await myRole(uid, load)) !== "student") return "Only students can apply.";
      if (ctx.phoneOk === false) return NEED_PHONE;
      if (n.studentUid !== uid) return "Wrong student.";
      if (n.status !== "new") return "New applications must have status 'new'.";
      // P12 fix: the application must be for a real open job of that employer, with its real title.
      // (Before, anyone could "apply" to any user id with any title → a notification + email with their text.)
      const posting = typeof n.employerUid === "string" && n.employerUid ? await load("postings", n.employerUid) : null;
      const job = (Array.isArray(posting?.jobs) ? posting.jobs : []).find(j => j && n.jobId != null && String(j.id) === String(n.jobId));
      if (!job || job.status !== "open" || job.hiddenByAdmin) return "This job isn't open any more.";
      if (String(n.jobTitle ?? "") !== String(job.title || "")) return "This job has changed. Please reload the page and try again.";
      return "";
    }
    if (op === "update") {
      if (o.employerUid !== uid) return "Only the employer can change this.";
      const keys = new Set([...Object.keys(o), ...Object.keys(n)]);
      for (const k of keys) if (k !== "status" && !same(o[k], n[k])) return "Only the status can change.";
      return "";
    }
    return "Applications can't be deleted.";
  }

  if (top === "chats" && !sub) {
    if (op === "create") {
      if (n.studentUid !== uid && n.employerUid !== uid) return "Not your chat.";
      return id === `${n.employerUid}_${n.studentUid}` ? "" : "Wrong chat id.";
    }
    if (op === "update") {
      if (o.studentUid !== uid && o.employerUid !== uid) return "Not your chat.";
      return n.studentUid === o.studentUid && n.employerUid === o.employerUid ? "" : "Chat members can't change.";
    }
    return "Chats can't be deleted.";
  }

  if (top === "chats" && sub === "messages") {
    if (!(await inChat(parentId, uid, load))) return "Not your chat.";
    if (op === "create") {
      if (n.from !== uid) return "Wrong sender.";
      return typeof n.text === "string" && n.text.length > 0 && n.text.length <= 1000 ? "" : "Message must be 1–1000 characters.";
    }
    if (op === "update") {
      if (o.from !== uid) return "You can only unsend your own message.";
      const ok = n.from === o.from && n.at === o.at && n.deleted === true && n.text === "";
      return ok ? "" : "Only unsend is allowed.";
    }
    return "Messages can't be deleted.";
  }

  return "Not allowed.";
}
