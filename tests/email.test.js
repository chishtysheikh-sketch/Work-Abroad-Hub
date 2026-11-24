import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { client, signup, write, linkFor, job, newEmail, PASSWORD } from "./helpers.js";

const pathOf = url => url.replace("http://localhost:4000", "");

describe("email verification", () => {
  it("sends a link at sign-up; the link works once", async () => {
    const { agent, email } = await signup({ verified: false });
    const link = linkFor(email, "/verify-email?token=");
    expect(link).toMatch(/token=[a-f0-9]{64}$/);

    const first = await agent.get(pathOf(link));
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe("/?verified=1");
    expect((await agent.get("/api/fb/auth/me")).body.user.emailVerified).toBe(true);

    const again = await agent.get(pathOf(link));
    expect(again.headers.location).toBe("/?verified=expired");
  });

  it("an expired link doesn't work", async () => {
    const { agent, email } = await signup({ verified: false });
    const link = linkFor(email, "/verify-email?token=");
    await mongoose.connection.collection("users").updateOne({ email }, { $set: { emailVerifyExp: new Date(Date.now() - 1000) } });

    const r = await agent.get(pathOf(link));
    expect(r.headers.location).toBe("/?verified=expired");
    expect((await agent.get("/api/fb/auth/me")).body.user.emailVerified).toBe(false);
  });

  it("a made-up token doesn't work", async () => {
    const r = await (await client()).get(`/api/fb/auth/verify-email?token=${"a".repeat(64)}`);
    expect(r.headers.location).toBe("/?verified=expired");
  });

  it("an unverified employer can save the company (sign-up) but can't publish a job", async () => {
    const { agent, uid } = await signup({ verified: false, role: "employer" });
    const company = await write(agent, "set", `postings/${uid}`, { company: { name: "Not Yet Cafe", biz: "220-81-62517" }, jobs: [] });
    expect(company.status).toBe(200);
    const closed = await write(agent, "set", `postings/${uid}`, { company: { name: "Not Yet Cafe", biz: "220-81-62517" }, jobs: [job("j0", { status: "closed" })] });
    expect(closed.status).toBe(200);
    const r = await write(agent, "set", `postings/${uid}`, { company: { name: "Not Yet Cafe" }, jobs: [job("j1")] });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("failed-precondition");
    expect(r.body.error).toMatch(/verify your email/);
  });

  it("“resend” sends a new email, but not twice in a minute", async () => {
    const { agent, email } = await signup({ verified: false });
    await mongoose.connection.collection("users").updateOne({ email }, { $set: { emailVerifySentAt: new Date(Date.now() - 120_000) } });
    expect((await agent.post("/api/fb/auth/resend-verification")).status).toBe(200);
    const again = await agent.post("/api/fb/auth/resend-verification");
    expect(again.status).toBe(429);
  });

  it("sign-up email: the address in the link is never the password", async () => {
    const email = newEmail();
    await (await client()).post("/api/fb/auth/signup").send({ email, password: PASSWORD });
    expect(JSON.stringify(linkFor(email, "verify"))).not.toContain(PASSWORD);
  });
});
