import { describe, it, expect } from "vitest";
import { client, signup, employerWithJobs, job, makeAdmin, PASSWORD } from "./helpers.js";

async function admin() {
  const a = await signup();
  await makeAdmin(a.uid);
  return a;
}
// the employer's jobs as a logged-out visitor sees them on the job board
async function boardJobs(employerUid) {
  const r = await (await client()).post("/api/fb/query").send({ path: "postings", q: {} });
  const p = r.body.docs.find(d => d.id === employerUid);
  return p ? p.data.jobs.map(j => `${j.id}:${j.status}`) : [];
}

describe("admin panel API", () => {
  it("non-admins get 403, logged-out 401, admins get the stats", async () => {
    const student = await signup({ role: "student" });
    expect((await student.agent.get("/api/admin/stats")).status).toBe(403);
    expect((await (await client()).get("/api/admin/stats")).status).toBe(401);
    const a = await admin();
    const r = await a.agent.get("/api/admin/stats");
    expect(r.status).toBe(200);
    expect(r.body.users.total).toBe(2);
    expect(r.body.signups30d).toHaveLength(30);
  });

  it("“isAdmin” can't be set from the website", async () => {
    const s = await signup({ role: "student" });
    await s.agent.post("/api/fb/write").send({ op: "set", path: `users/${s.uid}`, data: { role: "student", isAdmin: true } });
    expect((await s.agent.get("/api/admin/stats")).status).toBe(403);
  });

  it("blocking an employer logs them out at once and hides their open jobs; unblocking restores them", async () => {
    const a = await admin();
    const e = await employerWithJobs([job("j1"), job("j2", { status: "closed" }), job("j3")]);
    await a.agent.post(`/api/admin/jobs/${e.uid}/j3/hide`).send({ hidden: true, reason: "fake job" });   // hidden on purpose
    expect(await boardJobs(e.uid)).toEqual(["j1:open", "j2:closed"]);

    const b = await a.agent.post(`/api/admin/users/${e.uid}/block`).send({ blocked: true, reason: "scam" });
    expect(b.body).toMatchObject({ ok: true, blocked: true, jobsHidden: 1 });
    expect((await e.agent.get("/api/fb/auth/me")).body.user).toBeNull();           // same cookie, logged out
    expect(await boardJobs(e.uid)).toEqual(["j2:closed"]);
    const login = await (await client()).post("/api/fb/auth/login").send({ email: e.email, password: PASSWORD });
    expect(login.status).toBe(403);

    const u = await a.agent.post(`/api/admin/users/${e.uid}/block`).send({ blocked: false });
    expect(u.body).toMatchObject({ ok: true, blocked: false, jobsRestored: 1 });
    expect(await boardJobs(e.uid)).toEqual(["j1:open", "j2:closed"]);              // j3 stays hidden
    expect((await (await client()).post("/api/fb/auth/login").send({ email: e.email, password: PASSWORD })).status).toBe(200);
  });

  it("admins can't block themselves, and every action is in the log", async () => {
    const a = await admin();
    expect((await a.agent.post(`/api/admin/users/${a.uid}/block`).send({ blocked: true, reason: "x" })).status).toBe(400);
    const e = await employerWithJobs();
    await a.agent.post(`/api/admin/employers/${e.uid}/verify`).send({ verified: true });
    const log = await a.agent.get("/api/admin/log");
    expect(log.body.items.map(l => l.action)).toContain("employer.verify");
  });
});
