// Live updates for the website (like Firestore's onSnapshot).
// Uses its own Socket.IO "room" called a namespace: /fb
// Logged-out visitors may connect too (they can see job posts live).
import { COOKIE_NAME } from "../middleware/auth.js";
import { checkToken } from "../utils/session.js";
import { readDoc, runQuery, parsePath } from "../fb/core.js";

let nsp = null;

function getCookie(header, name) {
  const m = (header || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

async function run(sub, uid) {
  try {
    if (sub.kind === "doc") return { doc: await readDoc(sub.path, uid) };
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

// Called after every write: refresh everyone who is watching that collection / document
export function notify(col, docId) {
  if (!nsp) return;
  for (const socket of nsp.sockets.values()) {
    for (const [id, sub] of socket.data.subs) {
      if (sub.col === col && (sub.kind === "query" || sub.docId === docId)) push(socket, id, sub);
    }
  }
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
    socket.on("sub", ({ id, kind, path, q } = {}) => {
      if (typeof id !== "string" || socket.data.subs.size >= 50) return;
      try {
        let sub;
        if (kind === "doc") { const p = parsePath(path, "doc"); sub = { kind, path, col: p.col, docId: p.id }; }
        else { const p = parsePath(path, "col"); sub = { kind: "query", path, col: p.col, q: q || {} }; }
        socket.data.subs.set(id, sub);
        push(socket, id, sub);
      } catch (e) {
        socket.emit("snap", { id, error: e.code || "invalid-argument", message: e.message });
      }
    });
    socket.on("unsub", ({ id } = {}) => socket.data.subs.delete(id));
  });
}
