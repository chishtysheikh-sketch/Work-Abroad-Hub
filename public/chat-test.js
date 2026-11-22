const $ = id => document.getElementById(id);
let me = null, convo = null, msgs = [], theyRead = 0, socket = null;

async function api(path, opts = {}) {
  const r = await fetch("/api" + path, { method: opts.method || "GET", credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.status);
  return d;
}
function connect() {
  socket = io();
  socket.on("connect_error", e => alert("Chat error: " + e.message));
  socket.on("chat:new", m => {
    if (convo && m.conversation === convo._id) { msgs.push(m); draw();
      if (m.from !== me.id) socket.emit("chat:seen", { conversationId: convo._id }); }
  });
  socket.on("chat:seen", d => {
    if (convo && d.conversationId === convo._id && d.userId !== me.id) { theyRead = new Date(d.at).getTime(); draw(); }
  });
  socket.on("chat:unsent", d => { const m = msgs.find(x => x._id === d.messageId); if (m) { m.deleted = true; m.text = ""; draw(); } });
}
function draw() {
  const lastMine = [...msgs].reverse().find(m => m.from === me.id && !m.deleted);
  $("log").innerHTML = msgs.map(m => `<div class="m ${m.from === me.id ? "me" : ""} ${m.deleted ? "del" : ""}">
    ${m.deleted ? "message removed" : m.text.replace(/</g, "&lt;")}
    <small>${new Date(m.createdAt).toLocaleTimeString()}${m.from === me.id && !m.deleted ? ` · <a href="#" data-unsend="${m._id}">unsend</a>` : ""}</small></div>`).join("");
  $("seen").textContent = lastMine ? (theyRead >= new Date(lastMine.createdAt).getTime() ? "✓✓ Seen" : "✓ Sent") : "";
  $("log").scrollTop = 1e9;
  document.querySelectorAll("[data-unsend]").forEach(a => a.onclick = e => { e.preventDefault();
    socket.emit("chat:unsend", { messageId: a.dataset.unsend }, r => { if (!r.ok) alert(r.error); }); });
}
$("loginBtn").onclick = async () => {
  try {
    const { user } = await api("/auth/login", { method: "POST", body: { email: $("em").value.trim(), password: $("pw").value } });
    me = user; $("who").textContent = `Logged in as ${user.name} (${user.role}) · my id: ${user.id}`; connect();
  } catch (e) { alert(e.message); }
};
$("startBtn").onclick = async () => {
  try {
    const r1 = await api("/chats/start", { method: "POST", body: { otherUserId: $("other").value.trim() } });
    convo = r1.conversation;
    const { items, conversation: c } = await api(`/chats/${convo._id}/messages`);
    msgs = items;
    const otherId = c.employer === me.id ? c.student : c.employer;
    theyRead = c.readAt && c.readAt[otherId] ? new Date(c.readAt[otherId]).getTime() : 0;
    socket.emit("chat:join", { conversationId: convo._id }, r => { if (!r.ok) alert(r.error); });
    socket.emit("chat:seen", { conversationId: convo._id });
    draw();
  } catch (e) { alert(e.message); }
};
function send() {
  const t = $("txt").value.trim(); if (!t || !convo) return; $("txt").value = "";
  socket.emit("chat:send", { conversationId: convo._id, text: t }, r => { if (!r.ok) alert(r.error); });
}
$("sendBtn").onclick = send;
$("txt").onkeydown = e => { if (e.key === "Enter") send(); };
