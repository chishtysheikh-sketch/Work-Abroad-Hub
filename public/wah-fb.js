// wah-fb.js: lets the website keep its Firebase-style code,
// but every login, save and live update now goes to OUR server (Node + MongoDB).
// script.js imports this file instead of Firebase.

/* ---------- tiny helpers ---------- */
function fbError(code, message) { const e = new Error(message || code); e.code = code; return e; }

async function api(path, body, method = "POST") {
  let r;
  try {
    r = await fetch("/api/fb" + path, {
      method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw fbError("unavailable", "Can't reach the server. Is it running?"); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    // no code = the server is old or crashed → show what it said, so the problem is easy to find
    const code = d.code || (r.status === 404 ? "server-outdated (restart the server after part10.sh)" : `server-${r.status}: ${d.error || "error"}`);
    const e = fbError(code, d.error || "Server error");
    e.fromServer = !!d.error;          // script.js shows this exact message (e.g. why a password is weak)
    if (d.reason) e.reason = d.reason; // e.g. "google-only"
    throw e;
  }
  return d;
}

// Google buttons stay hidden until we know the server has Google sign-in set up
const style = document.createElement("style");
style.textContent = ".google-btn,.google-top,.lp-google,.or{display:none!important}";
document.head.appendChild(style);

// P6: ask the server for the Google client ID, then load Google's script ahead of time
// (it must be ready BEFORE the click, so the popup opens straight from the click and isn't blocked)
let googleCfg = null;
fetch("/api/fb/auth/google-config", { credentials: "same-origin" })
  .then(r => r.json())
  .then(cfg => {
    if (!cfg || !cfg.enabled || !cfg.clientId) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => { googleCfg = cfg; style.textContent = ""; };    // show the Google buttons
    s.onerror = () => console.warn("Google sign-in script didn't load (offline or blocked).");
    document.head.appendChild(s);
  })
  .catch(() => {});

/* ---------- live connection (Socket.IO) ---------- */
let socket = null;
const subs = new Map();              // id → { msg, onData, onError }
let nextId = 1;

function loadSocketLib() {
  if (window.io) return Promise.resolve();
  return new Promise((ok, bad) => {
    const s = document.createElement("script");
    s.src = "/socket.io/socket.io.js"; s.onload = ok; s.onerror = () => bad(new Error("socket.io failed to load"));
    document.head.appendChild(s);
  });
}
const socketReady = loadSocketLib().then(() => {
  socket = window.io("/fb");
  socket.on("connect", () => subs.forEach(s => socket.emit("sub", s.msg)));   // (re)subscribe everything
  socket.on("snap", m => {
    const s = subs.get(m.id); if (!s) return;
    if (m.error) { subs.delete(m.id); socket.emit("unsub", { id: m.id }); s.onError(fbError(m.error, m.message)); }
    else s.onData(m);
  });
});

// after login/logout the server must know who we are → reconnect
async function reconnect() {
  await socketReady;
  socket.disconnect();
  await new Promise(ok => { socket.once("connect", ok); socket.connect(); setTimeout(ok, 4000); });
}

/* ---------- "app" (nothing to set up) ---------- */
export const initializeApp = () => ({});
export const getFirestore = () => ({});

/* ---------- auth ---------- */
const auth = { currentUser: null, listeners: new Set(), ready: false };
export const getAuth = () => auth;

function fire() { for (const cb of auth.listeners) { try { cb(auth.currentUser); } catch (e) { console.error(e); } } }

const boot = api("/auth/me", null, "GET").then(d => d.user).catch(() => null).then(u => {
  auth.currentUser = u; auth.ready = true;
});

export function onAuthStateChanged(a, cb) {
  auth.listeners.add(cb);
  boot.then(() => cb(auth.currentUser));
  return () => auth.listeners.delete(cb);
}

async function signedIn(user) {
  await reconnect();
  auth.currentUser = user;
  setTimeout(fire, 0);
  return { user };
}

export async function createUserWithEmailAndPassword(a, email, password) {
  const d = await api("/auth/signup", { email, password });
  return signedIn(d.user);
}
export async function signInWithEmailAndPassword(a, email, password) {
  const d = await api("/auth/login", { email, password });
  return signedIn(d.user);
}
export async function signOut() {
  await api("/auth/logout", {});
  auth.currentUser = null;
  await reconnect();
  fire();
}
export async function deleteUser() {
  await api("/auth/me", null, "DELETE");
  auth.currentUser = null;
  await reconnect();
  fire();
}
export class GoogleAuthProvider {}
// Google popup → one-time code → our server checks it with Google → logged in (same as password login)
// NOT async on purpose: requestCode() must run inside the click, with nothing awaited before it.
export function signInWithPopup() {
  const oauth2 = window.google && window.google.accounts && window.google.accounts.oauth2;
  if (!googleCfg || !oauth2) return Promise.reject(fbError("auth/google-not-ready", "Google sign-in is still loading. Please try again in a moment."));
  return new Promise((resolve, reject) => {
    const client = oauth2.initCodeClient({
      client_id: googleCfg.clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: async r => {
        if (!r || r.error || !r.code) return reject(fbError("auth/popup-closed-by-user", "Google sign-in was cancelled."));
        try {
          const d = await api("/auth/google", { code: r.code });
          const out = await signedIn(d.user);
          resolve({ ...out, additionalUserInfo: { isNewUser: !!d.isNewUser } });
        } catch (e) { reject(e); }
      },
      error_callback: e => {
        const t = e && e.type;
        if (t === "popup_failed_to_open") reject(fbError("auth/popup-blocked", "The Google window was blocked. Allow pop-ups for this site and try again."));
        else if (t === "popup_closed") reject(fbError("auth/popup-closed-by-user", "Google sign-in was closed."));
        else reject(fbError("auth/internal-error", (e && e.message) || "Google sign-in failed."));
      },
    });
    client.requestCode();
  });
}
// Firebase-like: resolves the same way whether or not the email has an account
export async function sendPasswordResetEmail(a, email) { await api("/auth/forgot", { email }); }

// for the Settings pages (script.js): change password / log out everywhere
window.wahAuth = {
  async changePassword(currentPassword, newPassword) {
    await api("/auth/change-password", { currentPassword, newPassword });   // this device gets a new cookie
    await reconnect();
  },
  async logoutAll() {
    await api("/auth/logout-all", {});
    auth.currentUser = null;
  },
};

// P7: upload a photo / logo as a file → "/api/files/<id>" (saved in the profile instead of the image itself)
window.wahUpload = async function (fileOrBlob, kind) {
  const fd = new FormData();
  fd.append("kind", kind);                                        // text fields first, then the file
  fd.append("file", fileOrBlob, fileOrBlob.name || `${kind}.jpg`);
  let r;
  try { r = await fetch("/api/files", { method: "POST", body: fd, credentials: "same-origin" }); }
  catch { throw fbError("unavailable", "Can't reach the server. Check your connection and try again."); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) {
    const e = fbError(d.code || `server-${r.status}`, d.error || "Upload failed. Please try again.");
    e.fromServer = !!d.error;
    throw e;
  }
  return d.url;
};

// P8: notifications stored on the server, the same on every device.
//   list(before) → {items, unreadCount, more} · markRead(ids | "all") · unreadCount() · settings() · saveSettings(obj)
//   onNew(cb): cb(notification) when one arrives or a grouped one changes (live, via the socket)
//   onRead(cb): cb({unreadCount, ids?, chatId?, all?}) when some were marked read (on ANY device)
//   onSync(cb): cb() after (re)connecting, e.g. after login: reload the list, events may have been missed
const notifCbs = { new: new Set(), read: new Set(), sync: new Set() };
const fireN = (kind, x) => notifCbs[kind].forEach(cb => { try { cb(x); } catch (e) { console.error(e); } });
async function napi(path, body) {
  let r;
  try {
    r = await fetch("/api/notifications" + path, {
      method: body ? "POST" : "GET", credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw fbError("unavailable", "Can't reach the server."); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = fbError(d.code || `server-${r.status}`, d.error || "Server error"); e.fromServer = !!d.error; throw e; }
  return d;
}
const on = kind => cb => { notifCbs[kind].add(cb); return () => notifCbs[kind].delete(cb); };
window.wahNotifications = {
  list: (before, limit = 20) => napi(`?limit=${limit}` + (before ? `&before=${encodeURIComponent(before)}` : "")),
  markRead: idsOrAll => napi("/read", idsOrAll === "all" ? { all: true } : { ids: [].concat(idsOrAll) }),
  unreadCount: () => napi("/unread-count").then(d => d.unreadCount),
  settings: () => napi("/settings").then(d => d.notifyEmail),
  saveSettings: obj => napi("/settings", obj).then(d => d.notifyEmail),
  onNew: on("new"), onRead: on("read"), onSync: on("sync"),
};
socketReady.then(() => {
  socket.on("notif", n => fireN("new", n));
  socket.on("notifRead", d => fireN("read", d));
  socket.on("connect", () => fireN("sync"));
}).catch(() => {});

/* ---------- references ---------- */
export function collection(db, ...parts) { return { type: "collection", path: parts.join("/") }; }
export function doc(db, ...parts) {
  const path = parts.join("/");
  return { type: "doc", path, id: parts[parts.length - 1] };
}
export const where = (field, op, value) => ({ k: "where", v: [field, op, value] });
export const orderBy = (field, dir = "asc") => ({ k: "orderBy", v: [field, dir] });
export const limit = n => ({ k: "limit", v: n });
export function query(ref, ...parts) {
  const q = { where: [], orderBy: [], limit: null };
  parts.forEach(p => { if (p.k === "limit") q.limit = p.v; else q[p.k].push(p.v); });
  return { type: "query", path: ref.path, q };
}

/* ---------- snapshots (same shape as Firebase) ---------- */
function docSnap(id, data) {
  return { id, exists: () => data != null, data: () => (data == null ? undefined : data) };
}
function querySnap(docs) {
  const list = docs.map(d => docSnap(d.id, d.data));
  return { docs: list, size: list.length, empty: !list.length, forEach: f => list.forEach(f) };
}

/* ---------- read ---------- */
export async function getDoc(ref) {
  const d = await api("/doc", { path: ref.path });
  return docSnap(d.id, d.exists ? d.data : null);
}
export async function getDocs(ref) {
  const q = ref.type === "query" ? ref.q : {};
  const d = await api("/query", { path: ref.path, q });
  return querySnap(d.docs);
}

/* ---------- write ---------- */
export async function setDoc(ref, data, opts = {}) {
  await write({ op: "set", path: ref.path, data, merge: !!opts.merge });
}
export async function updateDoc(ref, data) { await write({ op: "update", path: ref.path, data }); }
export async function deleteDoc(ref) { await write({ op: "delete", path: ref.path }); }
export async function addDoc(ref, data) {
  const d = await write({ op: "add", path: ref.path, data });
  return doc(null, ref.path, d.id);
}

/* ---------- live ---------- */
export function onSnapshot(ref, onNext, onError = e => console.error(e)) {
  const id = "s" + nextId++;
  const msg = ref.type === "doc" ? { id, kind: "doc", path: ref.path } : { id, kind: "query", path: ref.path, q: ref.q || {} };
  subs.set(id, {
    msg, onError,
    onData: m => { try { onNext(m.doc ? docSnap(m.doc.id, m.doc.exists ? m.doc.data : null) : querySnap(m.docs || [])); } catch (e) { console.error(e); } },
  });
  socketReady.then(() => { if (subs.has(id) && socket.connected) socket.emit("sub", msg); })
             .catch(e => { subs.delete(id); onError(fbError("unavailable", e.message)); });
  return () => { if (subs.delete(id) && socket) socket.emit("unsub", { id }); };
}

/* ---------- P4: email verification banner + clear error messages ---------- */
// small message box (our own, so script.js's generic text can't overwrite it)
let noteBox = null, noteTimer = null;
function showNote(msg, ok = false) {
  if (!noteBox) {
    noteBox = document.createElement("div");
    noteBox.setAttribute("role", "status");
    noteBox.style.cssText = "position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:300;max-width:min(92vw,520px);padding:12px 18px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .3s";
    document.body.appendChild(noteBox);
  }
  noteBox.textContent = msg;
  noteBox.style.background = ok ? "#15803d" : "#b91c1c";
  noteBox.style.opacity = "1"; noteBox.style.display = "";
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { noteBox.style.opacity = "0"; setTimeout(() => (noteBox.style.display = "none"), 300); }, 6000);
}

// every save goes through here: show the server's reason, then fail like before
async function write(body) {
  try { return await api("/write", body); }
  catch (e) { if (e.fromServer) showNote(e.message); throw e; }
}

// "Please confirm your email" bar at the top of the page
let banner = null;
function updateBanner() {
  const u = auth.currentUser;
  const need = !!(u && !u.emailVerified);
  if (!need) { if (banner) banner.remove(); banner = null; document.body.style.marginTop = ""; return; }
  if (!banner) {
    banner = document.createElement("div");
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:250;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:9px 40px 9px 14px;background:#fff4e5;color:#7a4100;border-bottom:1px solid #f5c58a;font:500 14px/1.4 system-ui,sans-serif;text-align:center";
    const text = document.createElement("span");
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = "Resend email";
    btn.style.cssText = "border:0;border-radius:8px;padding:5px 12px;background:#ff8a3d;color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try { const d = await api("/auth/resend-verification", {}); showNote(d.alreadyVerified ? "Your email is already confirmed." : "Sent! Check your inbox (and spam).", true); if (d.alreadyVerified) refreshMe(); }
      catch (e) { showNote(e.message || "Couldn't send the email."); }
      setTimeout(() => (btn.disabled = false), 3000);
    });
    const close = document.createElement("button");
    close.type = "button"; close.textContent = "✕"; close.setAttribute("aria-label", "Hide");
    close.style.cssText = "position:absolute;right:10px;top:50%;transform:translateY(-50%);border:0;background:none;color:inherit;font-size:16px;cursor:pointer";
    close.addEventListener("click", () => { banner.style.display = "none"; document.body.style.marginTop = ""; });
    banner.append(text, btn, close);
    document.body.appendChild(banner);
  }
  banner.firstChild.textContent = `Please confirm your email: we sent a link to ${u.email}.`;
  if (banner.style.display !== "none") document.body.style.marginTop = banner.offsetHeight + "px";
}

// re-check with the server (e.g. after the link was clicked in another tab)
async function refreshMe() {
  const u = await api("/auth/me", null, "GET").then(d => d.user).catch(() => null);
  if (u && auth.currentUser && u.uid === auth.currentUser.uid) { auth.currentUser = u; updateBanner(); }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && auth.currentUser && !auth.currentUser.emailVerified) refreshMe();
});

auth.listeners.add(updateBanner);          // runs on every login / logout
boot.then(updateBanner);

// back from the email link: /?verified=1 or /?verified=expired
{
  const p = new URLSearchParams(location.search), v = p.get("verified");
  if (v) {
    if (v === "1") showNote("Email confirmed, thank you!", true);
    else showNote("That link has expired. Log in and press Resend.");
    p.delete("verified");
    const q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }
}
