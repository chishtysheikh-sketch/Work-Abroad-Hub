import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { Server } from "socket.io";
import { io as ioc } from "socket.io-client";
import { client, signup, write, employerWithJobs, job, makeAdmin, getApp, PASSWORD } from "./helpers.js";
import { registerFbLive } from "../src/sockets/fbLive.js";

// ---------- a real server with Socket.IO, for live chat ----------
let server, io, port;
beforeAll(async () => {
  server = http.createServer(await getApp());
  io = new Server(server);
  registerFbLive(io);
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  port = server.address().port;
});
afterAll(async () => { await new Promise(ok => io.close(() => ok())); });

async function cookieOf(email) {
  const r = await (await client()).post("/api/fb/auth/login").send({ email, password: PASSWORD });
  return r.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
}
function live(cookie) {
  const s = ioc(`http://127.0.0.1:${port}/fb`, { transports: ["websocket"], extraHeaders: cookie ? { cookie } : {}, forceNew: true });
  const snaps = [];
  s.on("snap", m => snaps.push(m));
  const next = (id, test = () => true, ms = 3000) => new Promise((ok, bad) => {
    const end = Date.now() + ms;
    (function look() {
      const hit = snaps.find(m => m.id === id && test(m));
      if (hit) { snaps.splice(snaps.indexOf(hit), 1); return ok(hit); }
      if (Date.now() > end) return bad(new Error(`no snap for ${id}`));
      setTimeout(look, 20);
    })();
  });
  return { s, next, sub: (id, path) => s.emit("sub", { id, kind: "query", path, q: {} }) };
}

async function chatPair() {
  const emp = await signup({ role: "employer" });
  const stu = await signup({ role: "student", profile: { profile: { name: "Stu", phone: "010-1234-5678" } } });
  const chatId = `${emp.uid}_${stu.uid}`;
  const c = await write(stu.agent, "set", `chats/${chatId}`, { studentUid: stu.uid, employerUid: emp.uid });
  expect(c.status).toBe(200);
  return { emp, stu, chatId };
}

describe("live chat over Socket.IO", () => {
  it("the other person gets a new message live", async () => {
    const { emp, stu, chatId } = await chatPair();
    const e = live(await cookieOf(emp.email));
    try {
      e.sub("m", `chats/${chatId}/messages`);
      expect((await e.next("m")).docs).toEqual([]);
      const w = await write(stu.agent, "add", `chats/${chatId}/messages`, { from: stu.uid, text: "Hello!", at: Date.now() });
      expect(w.status).toBe(200);
      const snap = await e.next("m", m => m.docs?.length === 1);
      expect(snap.docs[0].data.text).toBe("Hello!");
    } finally { e.s.close(); }
  });

  // outsiders get an empty list (queries only return what the reader may see), never the messages
  const noMessages = snap => !(snap.docs || []).some(d => d.data && d.data.text === "Private");
  it("someone outside the chat can't read it", async () => {
    const { stu, chatId } = await chatPair();
    await write(stu.agent, "add", `chats/${chatId}/messages`, { from: stu.uid, text: "Private", at: Date.now() });
    const stranger = await signup({ role: "student", profile: { profile: { name: "X", phone: "010-2222-3333" } } });
    const x = live(await cookieOf(stranger.email));
    try {
      x.sub("m", `chats/${chatId}/messages`);
      expect(noMessages(await x.next("m"))).toBe(true);
    } finally { x.s.close(); }
  });

  it("logged out: can't read it either", async () => {
    const { stu, chatId } = await chatPair();
    await write(stu.agent, "add", `chats/${chatId}/messages`, { from: stu.uid, text: "Private", at: Date.now() });
    const x = live(null);
    try {
      x.sub("m", `chats/${chatId}/messages`);
      expect(noMessages(await x.next("m"))).toBe(true);
    } finally { x.s.close(); }
  });
});

describe("the Report button (/api/reports) and the admin reports page", () => {
  it("report a job → admin sees it → resolve it", async () => {
    const emp = await employerWithJobs([job("j1", { title: "Shady job" })]);
    const stu = await signup({ role: "student", profile: { profile: { name: "Stu", phone: "010-1234-5678" } } });
    const r = await stu.agent.post("/api/reports").send({ kind: "job", targetId: "j1", ownerUid: emp.uid, reason: "Asks for a deposit" });
    expect(r.status).toBe(201);
    expect((await stu.agent.post("/api/reports").send({ kind: "job", targetId: "j1", ownerUid: emp.uid, reason: "again" })).status).toBe(409);

    const admin = await signup(); await makeAdmin(admin.uid);
    const list = await admin.agent.get("/api/admin/reports?status=open");
    expect(list.status).toBe(200);
    const item = list.body.items.find(i => i.id === r.body.id);
    expect(item.snapshot).toMatch(/Shady job/);
    expect(item.reporter.email).toBe(stu.email);
    expect((await admin.agent.post(`/api/admin/reports/${item.id}/resolve`).send({ note: "Job hidden" })).status).toBe(200);
    expect((await admin.agent.post(`/api/admin/reports/${item.id}/resolve`).send({})).status).toBe(409);
    expect((await admin.agent.get("/api/admin/reports?status=resolved")).body.items.some(i => i.id === item.id && i.note === "Job hidden")).toBe(true);
  });

  it("checks the input and who may report", async () => {
    const emp = await employerWithJobs([job("j1")]);
    const unverified = await signup({ verified: false });
    expect((await unverified.agent.post("/api/reports").send({ kind: "job", targetId: "j1", ownerUid: emp.uid, reason: "x" })).status).toBe(403);
    const stu = await signup();
    const bad = [{ kind: "nope", targetId: "j1", reason: "x" }, { kind: "job", targetId: "j1", ownerUid: emp.uid, reason: "" },
                 { kind: "job", targetId: "missing", ownerUid: emp.uid, reason: "x" }, { kind: "user", targetId: stu.uid, reason: "me" }];
    for (const b of bad) expect((await stu.agent.post("/api/reports").send(b)).status, JSON.stringify(b)).toBeGreaterThanOrEqual(400);
    expect((await emp.agent.post("/api/reports").send({ kind: "job", targetId: "j1", ownerUid: emp.uid, reason: "mine" })).status).toBe(400);
  });

  it("non-admins can't see reports", async () => {
    const u = await signup();
    expect((await u.agent.get("/api/admin/reports")).status).toBe(403);
  });
});

describe("download my data", () => {
  it("has the profile, applications and chats with messages, and no secrets", async () => {
    const { stu, chatId } = await chatPair();
    await write(stu.agent, "add", `chats/${chatId}/messages`, { from: stu.uid, text: "My message", at: Date.now() });
    const r = await stu.agent.get("/api/fb/auth/me/export");
    expect(r.status).toBe(200);
    expect(r.headers["content-disposition"]).toMatch(/attachment; filename="work-abroad-hub-my-data-/);
    const d = JSON.parse(r.text);
    expect(d.account.email).toBe(stu.email);
    expect(d.profile.profile.name).toBe("Stu");
    expect(d.chats[0].messages[0].text).toBe("My message");
    expect(r.text).not.toMatch(/passwordHash|tokenVersion|emailVerifyHash|emailCodeHash|\$2[aby]\$/);
  });

  it("needs a login", async () => {
    expect((await (await client()).get("/api/fb/auth/me/export")).status).toBe(401);
  });
});

describe("job board: only open jobs are sent", () => {
  it("visitors get open, not-expired jobs; the employer gets all of their own", async () => {
    const e = await employerWithJobs([job("open"), job("closed", { status: "closed" }), job("old", { deadline: "2020-01-01" }),
                                      job("later", { deadline: "2099-12-31" })]);
    const ids = docs => (docs.find(d => d.id === e.uid)?.data.jobs || []).map(j => j.id);
    const pub = await (await client()).post("/api/fb/query").send({ path: "postings", q: {} });
    expect(ids(pub.body.docs)).toEqual(["open", "later"]);
    const own = await e.agent.post("/api/fb/query").send({ path: "postings", q: {} });
    expect(ids(own.body.docs)).toEqual(["open", "closed", "old", "later"]);
  });
});
