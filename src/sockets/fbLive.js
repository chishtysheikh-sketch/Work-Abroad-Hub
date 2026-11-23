// Live updates for the website (like Firestore's onSnapshot).
// Uses its own Socket.IO "room" called a namespace: /fb
// Logged-out visitors may connect too (they can see job posts live).
//
// P10 — made for many visitors:
//  · notify() is BATCHED per collection: changes within 100 ms → one refresh (the window starts at the first
//    change and is never extended, so updates are never held back longer than 100 ms).
//  · PUBLIC queries (the whole "postings" collection = the job board) are computed ONCE per change and
//    JSON-encoded ONCE; every subscriber gets the same bytes (a binary attachment, no re-encoding per socket).
//    Only an employer whose own posting has admin-hidden jobs gets a personal copy (they may see those jobs).
//    New subscribers between two changes reuse the cached result instead of asking MongoDB again.
//  · Private queries (applications, chats, messages) still run per user: the rules depend on who asks.
import { COOKIE_NAME } from "../middleware/auth.js";
import { checkToken } from "../utils/session.js";
import { readDoc, runQuery, parsePath } from "../fb/core.js";
import { sharedResult, personalDocs, changed, isPublicCol } from "../fb/shared.js";
import { on } from "./safe.js";

let nsp = null;
const BATCH_MS = 100;
const pending = new Map();     // col → { ids: Set<docId>, timer }  (changes waiting for the next refresh)

function getCookie(header, name) {
  const m = (header || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

async function run(sub, uid) {
  try {
    if (sub.kind === "doc") return { doc: await readDoc(sub.path, uid) };
    if (isPublicCol(sub.col)) {                                     // one query + one encoding for everybody
      const r = await sharedResult(sub.path, sub.col, sub.q);
      const own = personalDocs(r, uid);                             // rare: this employer has admin-hidden jobs
      if (own) return sub.bin ? { bin: Buffer.from(JSON.stringify(own)) } : { docs: own };
      return sub.bin ? { bin: r.bin } : { docs: r.docs };          // same object / bytes for every socket
    }
    return { docs: await runQuery(sub.path, sub.q, uid) };
  } catch (e) {
    return { error: e.code || "unknown", message: e.code ? e.message : "Server error" };
  }
}

async function push(socket, id, sub) {
  if (sub.busy) { sub.again = true; return; }      // a refresh is already running → do one more after it
  sub.busy = true;
  do {
    sub.again = false;
    const out = await run(sub, socket.data.uid);
    if (socket.data.subs.get(id) === sub) socket.emit("snap", { id, ...out });
  } while (sub.again);
  sub.busy = false;
}

// Called after every write. The cached shared result is dropped at once (new subscribers get fresh data);
// everyone already watching is refreshed once per 100 ms window, however many writes happened in it.
export function notify(col, docId) {
  changed(col);
  if (!nsp) return;
  let p = pending.get(col);
  if (!p) {
    p = { ids: new Set() };
    pending.set(col, p);
    p.timer = setTimeout(() => flush(col), BATCH_MS);
  }
  p.ids.add(docId);
}

function flush(col) {
  const p = pending.get(col);
  pending.delete(col);
  if (!p || !nsp) return;
  for (const socket of nsp.sockets.values()) {
    for (const [id, sub] of socket.data.subs) {
      if (sub.col === col && (sub.kind === "query" || p.ids.has(sub.docId))) push(socket, id, sub);
    }
  }
}

// P8: send an event to every open tab / device of one user
export function emitToUser(uid, event, data) {
  if (nsp && uid) nsp.to("user:" + uid).emit(event, data);
}

// P9: blocked → close every live connection of that user right away
export function kickUser(uid) {
  if (!nsp || !uid) return;
  nsp.to("user:" + uid).emit("kicked", { reason: "blocked" });
  nsp.in("user:" + uid).disconnectSockets(true);
}

export function registerFbLive(io) {
  nsp = io.of("/fb");
  nsp.use(async (socket, next) => {
    // old tokens (after "log out everywhere") and blocked users count as logged out
    const user = await checkToken(getCookie(socket.handshake.headers.cookie, COOKIE_NAME)).catch(() => null);
    socket.data.uid = user ? user.id : null;
    socket.data.subs = new Map();
    next();
  });

  nsp.on("connection", (socket) => {
    if (socket.data.uid) socket.join("user:" + socket.data.uid);     // P8: personal notifications
    on(socket, "sub", ({ id, kind, path, q, bin }) => {           // P11: on() = a bad message can't crash the server
      if (typeof id !== "string" || socket.data.subs.size >= 50) return;
      try {
        let sub;
        if (kind === "doc") { const p = parsePath(path, "doc"); sub = { kind, path, col: p.col, docId: p.id }; }
        else { const p = parsePath(path, "col"); sub = { kind: "query", path, col: p.col, q: q || {}, bin: bin === true }; }   // bin: client can read binary snaps
        socket.data.subs.set(id, sub);
        push(socket, id, sub);
      } catch (e) {
        socket.emit("snap", { id, error: e.code || "invalid-argument", message: e.message });
      }
    });
    on(socket, "unsub", ({ id }) => socket.data.subs.delete(id));
  });
}
