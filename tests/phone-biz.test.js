import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";

// phone codes switched on for this file; texts land in `texts` instead of being sent
const texts = [];
vi.mock("../src/utils/sms.js", () => ({
  smsMode: "console",
  sendSms: vi.fn(async (to, text) => { texts.push({ to, text }); return { printed: true }; }),
}));

const { signup, write, employerWithJobs, job, client } = await import("./helpers.js");
const { validBizNo, normalizeBiz, bizCheckDigitOk } = await import("../src/utils/bizno.js");
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
  const GOOD = ["1234567890", "123-45-67890", "123 45 67890", " 123.45.67890 ", "１２３－４５－６７８９０"];
  const BAD = ["123456789", "12345678901", "123-45-6789a", "abc-de-fghij", "12345", "", null, undefined, 1234567890.5];

  it("any 10 digits are valid (no check digit) and come out as 123-45-67890", () => {
    for (const g of GOOD) expect(normalizeBiz(g), g).toBe("123-45-67890");
    for (const g of GOOD) expect(validBizNo(g), g).toBe(true);
    for (const b of BAD) expect(validBizNo(b), String(b)).toBe(false);
    // the check digit is only a hint for admins
    expect(bizCheckDigitOk("220-81-62517")).toBe(true);
    expect(bizCheckDigitOk("123-45-67890")).toBe(false);
  });

  it("the server saves every 10-digit form as 123-45-67890 and refuses the rest", async () => {
    const emp = await employerWithJobs([]);
    const saved = async () => (await mongoose.connection.collection("fbdocs").findOne({ col: "postings", docId: emp.uid })).data.company.biz;
    for (const g of GOOD) {
      await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe", biz: "999-99-99999" }, jobs: [] });
      const r = await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe", biz: g }, jobs: [] });
      expect(r.status, g).toBe(200);
      expect(await saved(), g).toBe("123-45-67890");
    }
    for (const b of ["123456789", "12345678901", "123-45-6789a"]) {
      const r = await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe", biz: b }, jobs: [] });
      expect(r.status, b).toBe(403);
      expect(r.body.error).toMatch(/10-digit business registration number/);
    }
  });

  it("old numbers saved in other formats still load and save", async () => {
    const emp = await employerWithJobs([]);
    const col = mongoose.connection.collection("fbdocs");
    // old format → saved again → normalized
    await col.updateOne({ col: "postings", docId: emp.uid }, { $set: { "data.company.biz": "1234567890" } });
    expect((await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe 2", biz: "1234567890" }, jobs: [] })).status).toBe(200);
    expect((await col.findOne({ col: "postings", docId: emp.uid })).data.company.biz).toBe("123-45-67890");
    // an old, broken number that isn't changed doesn't block other edits
    await col.updateOne({ col: "postings", docId: emp.uid }, { $set: { "data.company.biz": "12-345" } });
    expect((await write(emp.agent, "set", `postings/${emp.uid}`, { company: { name: "Cafe 3", biz: "12-345" }, jobs: [] })).status).toBe(200);
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
