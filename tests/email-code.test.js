import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { client, signup, write, newEmail } from "./helpers.js";
import { outbox } from "../src/utils/mailer.js";

const codeFor = email => {
  const mail = [...outbox].reverse().find(m => m.to === email && /Your code: \d{6}/.test(m.text || ""));
  return mail && mail.text.match(/Your code: (\d{6})/)[1];
};
const wrongCode = code => String((Number(code) + 1) % 1000000).padStart(6, "0");

describe("email confirmation with a 6-digit code", () => {
  it("the sign-up email has a code; the right code confirms the email", async () => {
    const { agent, email } = await signup({ verified: false });
    const code = codeFor(email);
    expect(code).toMatch(/^\d{6}$/);
    const r = await agent.post("/api/fb/auth/verify-code").send({ code });
    expect(r.status).toBe(200);
    expect((await agent.get("/api/fb/auth/me")).body.user.emailVerified).toBe(true);
  });

  it("a wrong code is refused and counts down; after 5 the right code no longer works", async () => {
    const { agent, email } = await signup({ verified: false });
    const code = codeFor(email);
    const first = await agent.post("/api/fb/auth/verify-code").send({ code: wrongCode(code) });
    expect(first.status).toBe(400);
    expect(first.body.error).toMatch(/4 tries left/);
    for (let i = 0; i < 4; i++) await agent.post("/api/fb/auth/verify-code").send({ code: wrongCode(code) });
    const r = await agent.post("/api/fb/auth/verify-code").send({ code });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("auth/code-expired");
    expect((await agent.get("/api/fb/auth/me")).body.user.emailVerified).toBe(false);
  });

  it("an expired code doesn't work", async () => {
    const { agent, email } = await signup({ verified: false });
    const code = codeFor(email);
    await mongoose.connection.collection("users").updateOne({ email }, { $set: { emailCodeExp: new Date(Date.now() - 1000) } });
    const r = await agent.post("/api/fb/auth/verify-code").send({ code });
    expect(r.body.code).toBe("auth/code-expired");
  });

  it("someone else's code doesn't confirm my account", async () => {
    const a = await signup({ verified: false }), b = await signup({ verified: false });
    const r = await a.agent.post("/api/fb/auth/verify-code").send({ code: codeFor(b.email) });
    // codes are random: in the 1-in-a-million case they're equal, which is still the right code for a
    if (codeFor(a.email) !== codeFor(b.email)) expect(r.status).toBe(400);
  });

  it("needs a login", async () => {
    const r = await (await client()).post("/api/fb/auth/verify-code").send({ code: "123456" });
    expect(r.status).toBe(401);
  });

  it("“resend” sends a new code and the old one stops working", async () => {
    const { agent, email } = await signup({ verified: false });
    const old = codeFor(email);
    await mongoose.connection.collection("users").updateOne({ email }, { $set: { emailVerifySentAt: new Date(Date.now() - 120_000) } });
    expect((await agent.post("/api/fb/auth/resend-verification")).status).toBe(200);
    const fresh = codeFor(email);
    if (fresh !== old) expect((await agent.post("/api/fb/auth/verify-code").send({ code: old })).status).toBe(400);
    expect((await agent.post("/api/fb/auth/verify-code").send({ code: fresh })).status).toBe(200);
  });

  it("the code hash is never sent to the browser", async () => {
    const { agent } = await signup({ verified: false });
    const me = JSON.stringify((await agent.get("/api/fb/auth/me")).body);
    expect(me).not.toMatch(/emailCode/);
  });
});

describe("live email check on the sign-up form", () => {
  const check = async email => (await (await client()).post("/api/fb/auth/check-email").send({ email })).body;
  it("accepts a normal address", async () => expect(await check(newEmail())).toEqual({ ok: true }));
  it("warns about a typo", async () => expect((await check("me@gmial.com")).error).toMatch(/gmail\.com/));
  it("warns about a temporary inbox", async () => expect((await check("me@mailinator.com")).error).toMatch(/temporary/));
  it("warns about a domain that can't receive email", async () => expect((await check("me@nothing.invalid")).error).toMatch(/can't receive email/));
  it("warns about a broken address", async () => expect((await check("not-an-email")).ok).toBe(false));
});

describe("student phone + profile email", () => {
  it("a student phone must be a 010 mobile number", async () => {
    const { agent, uid } = await signup();
    for (const phone of ["011-1234-5678", "02-123-4567", "010-123-4567", "12345", ""]) {
      const r = await write(agent, "set", `users/${uid}`, { role: "student", profile: { name: "A", phone } });
      expect(r.status, phone).toBe(403);
      expect(r.body.error).toMatch(/010/);
    }
    for (const phone of ["010-1234-5678", "01012345678"]) {
      const r = await write(agent, "set", `users/${uid}`, { role: "student", profile: { name: "A", phone } });
      expect(r.status, phone).toBe(200);
    }
  });

  it("the profile email is always the login email", async () => {
    const { agent, uid, email } = await signup();
    await write(agent, "set", `users/${uid}`, { role: "student", profile: { name: "A", phone: "010-1234-5678", email: "fake@someone-else.com" } });
    const doc = await mongoose.connection.collection("fbdocs").findOne({ col: "users", docId: uid });
    expect(doc.data.profile.email).toBe(email);
  });
});
