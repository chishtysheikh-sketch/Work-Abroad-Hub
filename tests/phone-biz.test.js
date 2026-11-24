import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";

// phone codes switched on for this file; texts land in `texts` instead of being sent
const texts = [];
vi.mock("../src/utils/sms.js", () => ({
  smsMode: "console",
  sendSms: vi.fn(async (to, text) => { texts.push({ to, text }); return { printed: true }; }),
}));

const { signup, write, employerWithJobs, job, client } = await import("./helpers.js");
const { validBizNo } = await import("../src/utils/bizno.js");
const { minWage, minWageWarning, MIN_WAGE_BY_YEAR } = await import("../src/utils/pay.js");

const lastCode = () => texts.at(-1)?.text.match(/(\d{6})/)?.[1];
const student = async (phone = "010-1234-5678") => {
  const s = await signup({ role: "student", profile: { profile: { name: "Stu", phone } } });
  return s;
};
const tryApply = async (agent, uid, emp) => write(agent, "add", "applications", {
  jobId: "j1", jobTitle: "Job j1", employerUid: emp.uid, studentUid: uid, status: "new", createdAt: Date.now() });

describe("phone confirmation by SMS (when switched on)", () => {
  it("can't apply before the phone is confirmed; can after", async () => {
    const emp = await employerWithJobs([job("j1")]);
    const { agent, uid } = await student();
    const before = await tryApply(agent, uid, emp);
    expect(before.status).toBe(403);
    expect(before.body.error).toMatch(/phone number first/);

    const sent = await agent.post("/api/fb/auth/phone/send");
    expect(sent.status).toBe(200);
    expect(sent.body.to).toBe("010-****-5678");
    expect(texts.at(-1).to).toBe("01012345678");
    expect((await agent.post("/api/fb/auth/phone/verify").send({ code: lastCode() })).status).toBe(200);
    expect((await agent.get("/api/fb/auth/me")).body.user.phoneVerified).toBe("01012345678");
    expect((await tryApply(agent, uid, emp)).status).toBe(200);
  });

  it("changing the phone needs a new confirmation", async () => {
    const emp = await employerWithJobs([job("j1")]);
    const { agent, uid } = await student();
    await agent.post("/api/fb/auth/phone/send");
    await agent.post("/api/fb/auth/phone/verify").send({ code: lastCode() });
    await write(agent, "set", `users/${uid}`, { role: "student", profile: { name: "Stu", phone: "010-9999-8888" } });
    expect((await tryApply(agent, uid, emp)).status).toBe(403);
  });

  it("wrong codes count down; one text per minute", async () => {
    const { agent } = await student();
    await agent.post("/api/fb/auth/phone/send");
    const wrong = String((Number(lastCode()) + 1) % 1e6).padStart(6, "0");
    const r = await agent.post("/api/fb/auth/phone/verify").send({ code: wrong });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/4 tries left/);
    expect((await agent.post("/api/fb/auth/phone/send")).status).toBe(429);
  });

  it("an expired code doesn't work", async () => {
    const { agent, email } = await student();
    await agent.post("/api/fb/auth/phone/send");
    await mongoose.connection.collection("users").updateOne({ email }, { $set: { phoneCodeExp: new Date(Date.now() - 1000) } });
    expect((await agent.post("/api/fb/auth/phone/verify").send({ code: lastCode() })).body.code).toBe("auth/code-expired");
  });

  it("no mobile number on the profile → no text", async () => {
    const e = await signup({ role: "employer" });
    expect((await e.agent.post("/api/fb/auth/phone/send")).status).toBe(400);
  });

  it("needs a login", async () => {
    expect((await (await client()).post("/api/fb/auth/phone/send")).status).toBe(401);
  });
});

describe("business registration number", () => {
  it("check digit: real numbers pass, made-up ones fail", () => {
    expect(validBizNo("220-81-62517")).toBe(true);
    expect(validBizNo("1248100998")).toBe(true);
    for (const bad of ["123-45-67890", "000-00-00000", "220-81-62518", "12345", "", null]) expect(validBizNo(bad), String(bad)).toBe(false);
  });

  it("the server refuses an invalid number, accepts a valid one, and lets old profiles save", async () => {
    const emp = await employerWithJobs([]);
    const bad = await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe", biz: "123-45-67890" }, jobs: [] });
    expect(bad.status).toBe(403);
    expect(bad.body.error).toMatch(/business registration number/);
    expect((await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe", biz: "220-81-62517" }, jobs: [] })).status).toBe(200);
    // an old, invalid number that was already saved doesn't block other changes
    await mongoose.connection.collection("fbdocs").updateOne({ col: "postings", docId: emp.uid }, { $set: { "data.company.biz": "123-45-67890" } });
    expect((await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe 2", biz: "123-45-67890" }, jobs: [] })).status).toBe(200);
  });
});

describe("minimum wage by year", () => {
  // the test setup pins MIN_WAGE; clear it here so the yearly table is used
  beforeEach(() => vi.stubEnv("MIN_WAGE", ""));
  afterEach(() => vi.unstubAllEnvs());
  it("uses the rate of the current year in Korea", () => {
    expect(minWage(new Date("2026-06-01T00:00:00Z"))).toBe(MIN_WAGE_BY_YEAR[2026]);
    expect(minWage(new Date("2025-06-01T00:00:00Z"))).toBe(MIN_WAGE_BY_YEAR[2025]);
    // 31 Dec 2025 20:00 UTC is already 1 Jan 2026 in Korea
    expect(minWage(new Date("2025-12-31T20:00:00Z"))).toBe(MIN_WAGE_BY_YEAR[2026]);
  });
  it("a missing year uses the latest known rate and warns", () => {
    const future = new Date("2099-06-01T00:00:00Z");
    expect(minWage(future)).toBe(Math.max(...Object.values(MIN_WAGE_BY_YEAR)));
    expect(minWageWarning(future)).toMatch(/2099/);
    expect(minWageWarning(new Date("2026-06-01T00:00:00Z"))).toBe("");
  });
});
