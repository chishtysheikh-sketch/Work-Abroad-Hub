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
    throw e;
  }
  return d;
}

// hide buttons this server doesn't support yet (Google login, password reset email)
const style = document.createElement("style");
style.textContent = ".google-btn,.google-top,.lp-google,.or,#forgotBtn,#lpForgot{display:none!important}";
document.head.appendChild(style);

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
export async function signInWithPopup() { throw fbError("auth/operation-not-allowed", "Google login is not set up yet."); }
export async function sendPasswordResetEmail() { throw fbError("auth/operation-not-allowed", "Password reset email is not set up yet."); }

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
  await api("/write", { op: "set", path: ref.path, data, merge: !!opts.merge });
}
export async function updateDoc(ref, data) { await api("/write", { op: "update", path: ref.path, data }); }
export async function deleteDoc(ref) { await api("/write", { op: "delete", path: ref.path }); }
export async function addDoc(ref, data) {
  const d = await api("/write", { op: "add", path: ref.path, data });
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
