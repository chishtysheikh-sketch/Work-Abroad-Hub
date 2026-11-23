import { describe, it, expect } from "vitest";
import { signup, write, waitFor, employerWithJobs, job } from "./helpers.js";

const list = async agent => (await agent.get("/api/notifications")).body;
const ofType = async (agent, type) => (await list(agent)).items.filter(n => n.type === type);

async function applyTo(employer) {
  const s = await signup({ role: "student", profile: { profile: { name: "Mina" } } });
  const r = await write(s.agent, "add", "applications", { jobId: "j1", jobTitle: "Barista", company: "Test Cafe",
    employerUid: employer.uid, studentUid: s.uid, name: "Mina", status: "new", createdAt: Date.now() });
  expect(r.status).toBe(200);
  return { student: s, appId: r.body.id };
}

describe("notifications", () => {
  it("a new application → the employer gets a notification (with a link to it)", async () => {
    const e = await employerWithJobs([job("j1", { title: "Barista" })]);
    const { appId } = await applyTo(e);
    const [n] = await waitFor(() => ofType(e.agent, "application").then(a => a.length && a));
    expect(n.title).toBe("New application: Mina applied for Barista");
    expect(n.link).toMatchObject({ kind: "application", id: appId });
    expect((await list(e.agent)).unreadCount).toBeGreaterThanOrEqual(1);
  });

  it("the employer changes the status → the student gets a notification", async () => {
    const e = await employerWithJobs([job("j1", { title: "Barista" })]);
    const { student, appId } = await applyTo(e);
    expect((await write(e.agent, "update", `applications/${appId}`, { status: "interview" })).status).toBe(200);
    const [n] = await waitFor(() => ofType(student.agent, "status").then(a => a.length && a));
    expect(n.title).toBe("Your application for Barista is now Interview");
  });

  it("5 quick messages → ONE notification that counts 5", async () => {
    const e = await employerWithJobs();
    const s = await signup({ role: "student", profile: { profile: { name: "Mina" } } });
    const chatId = `${e.uid}_${s.uid}`;
    expect((await write(s.agent, "set", `chats/${chatId}`, { employerUid: e.uid, studentUid: s.uid, studentName: "Mina", jobTitle: "Barista" }, true)).status).toBe(200);
    await Promise.all([1, 2, 3, 4, 5].map(i => write(s.agent, "add", `chats/${chatId}/messages`, { from: s.uid, text: `hello ${i}`, at: Date.now() + i })));

    const msgs = await waitFor(() => ofType(e.agent, "message").then(a => a[0]?.count === 5 && a));
    expect(msgs).toHaveLength(1);
    expect(msgs[0].title).toBe("New message from Mina");
  });

  it("read state: marking read works, and only for your own notifications", async () => {
    const e = await employerWithJobs([job("j1", { title: "Barista" })]);
    await applyTo(e);
    const [n] = await waitFor(() => ofType(e.agent, "application").then(a => a.length && a));
    const other = await signup();
    expect((await other.agent.post("/api/notifications/read").send({ ids: [n.id] })).body.changed).toBe(0);
    const r = await e.agent.post("/api/notifications/read").send({ ids: [n.id] });
    expect(r.body.changed).toBe(1);
    expect((await ofType(e.agent, "application"))[0].read).toBe(true);
  });
});
