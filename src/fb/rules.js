// Security rules: the same rules the site had in Firebase (firestore.rules),
// rewritten in JavaScript. The server checks them on EVERY read and write.
//
// load(col, id) must return that document's data (or null).

const MIN_WAGE = Number(process.env.MIN_WAGE || 10320);
const ROLES = ["student", "employer"];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Smallest legal pay (same formula as the job form on the website)
// daily: hours per day. monthly: hours per week (+ paid weekly holiday), 209-hour month.
function minPayFor(type, hrs) {
  if (type === "hourly" || !type) return MIN_WAGE;
  if (!(hrs > 0)) return null;
  if (type === "daily") return Math.ceil(MIN_WAGE * hrs);
  const holiday = hrs >= 15 ? Math.min(hrs, 40) / 40 * 8 : 0;
  return Math.ceil(MIN_WAGE * (hrs + holiday) * 209 / 48);
}
const tooLow = j => {
  const min = minPayFor(j.payType, Number(j.payHours));
  return min != null && Number(j.pay) > 0 && Number(j.pay) < min;
};

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

export const NEED_VERIFY = "Please verify your email first. Check your inbox (and spam).";

// op = "create" | "update" | "delete". Returns "" when allowed, otherwise a reason.
// ctx.verified = has the caller confirmed their email?
export async function canWrite(op, col, id, oldData, newData, uid, load, ctx = {}) {
  if (!uid) return "Please log in.";
  const { top, parentId, sub } = colInfo(col);
  const n = newData || {}, o = oldData || {};

  // unverified accounts may save their own profile (sign-up needs it), but not post, apply or chat
  if (!ctx.verified) {
    const posting = top === "postings" && !sub && op !== "delete";
    const creates = op === "create" && ((top === "applications" && !sub) || top === "chats");
    if (posting || creates) return NEED_VERIFY;
  }

  if (top === "users" && !sub) {
    if (uid !== id) return "Not your profile.";
    if (op === "delete") return "";
    if (!ROLES.includes(n.role)) return "Role must be student or employer.";
    return badImage(n);
  }

  if (top === "postings" && !sub) {
    if (uid !== id) return "Not your company.";
    if (op === "delete") return "";
    if ((await myRole(uid, load)) !== "employer") return "Only employers can post jobs.";
    if (!Array.isArray(n.jobs)) return "jobs must be a list.";
    if (n.jobs.length > 50) return "Max 50 jobs.";
    const img = badImage(n);
    if (img) return img;
    const low = n.jobs.find(j => j && j.status === "open" && tooLow(j));
    if (low) return `Pay is below the minimum wage (₩${MIN_WAGE.toLocaleString()}/hour): ${String(low.title || "").slice(0, 40)}`;
    return "";
  }

  if (top === "applications" && !sub) {
    if (op === "create") {
      if ((await myRole(uid, load)) !== "student") return "Only students can apply.";
      if (n.studentUid !== uid) return "Wrong student.";
      return n.status === "new" ? "" : "New applications must have status 'new'.";
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
