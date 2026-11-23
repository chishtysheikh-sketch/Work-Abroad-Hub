// Small helpers shared by the test files.
import request from "supertest";
import mongoose from "mongoose";
import { outbox } from "../src/utils/mailer.js";

export { outbox };
export const PASSWORD = "Test-Pass-2468!";

let app;
// the Express app (imported late, so a test file can change env vars first), with all indexes built
export async function getApp() {
  if (!app) {
    app = (await import("../src/app.js")).default;
    await Promise.all(mongoose.modelNames().map(n => mongoose.model(n).init()));
  }
  return app;
}

// a "browser": keeps its cookies, and has its own IP address so rate limits don't leak between tests
let ipCount = 0;
export async function client() {
  ipCount++;
  const a = request.agent(await getApp());
  a.set("X-Forwarded-For", `10.${(process.pid % 200) + 1}.${Math.floor(ipCount / 250)}.${(ipCount % 250) + 1}`);
  return a;
}

let emailCount = 0;
export const newEmail = (tag = "user") => `${tag}.${Date.now()}.${++emailCount}@example.com`;

// sign up (+ optional: mark the email verified, save the website profile)
export async function signup({ email = newEmail(), password = PASSWORD, verified = true, role, profile } = {}) {
  const a = await client();
  const r = await a.post("/api/fb/auth/signup").send({ email, password });
  if (r.status !== 201) throw new Error(`signup failed: ${r.status} ${JSON.stringify(r.body)}`);
  const uid = r.body.user.uid;
  if (verified) {
    await mongoose.connection.collection("users").updateOne({ email }, { $set: { emailVerified: true } });
    (await import("../src/utils/session.js")).forgetSession(uid);
  }
  if (role) {
    const w = await write(a, "set", `users/${uid}`, { role, ...(profile || {}) });
    if (w.status !== 200) throw new Error(`profile failed: ${w.status} ${JSON.stringify(w.body)}`);
  }
  return { agent: a, uid, email, password };
}

export const write = (agent, op, path, data, merge) => agent.post("/api/fb/write").send({ op, path, data, merge });

// the first link in the last email sent to this address
export function linkFor(email, contains = "") {
  const mail = [...outbox].reverse().find(m => m.to === email && (m.text || "").includes(contains));
  const m = mail && (mail.text || "").match(/https?:\/\/\S+/g)?.find(l => l.includes(contains));
  return m || null;
}

// wait until fn() returns something truthy (for work the server does in the background)
export async function waitFor(fn, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("waitFor: timed out");
    await new Promise(r => setTimeout(r, 25));
  }
}

export const job = (id, extra = {}) => ({ id, title: `Job ${id}`, status: "open", payType: "hourly", pay: 12000, city: "Seoul", createdAt: Date.now(), ...extra });

// an employer with a company + jobs (verified email)
export async function employerWithJobs(jobs = [job("j1")]) {
  const e = await signup({ role: "employer" });
  const r = await write(e.agent, "set", `postings/${e.uid}`, { company: { name: "Test Cafe" }, jobs });
  if (r.status !== 200) throw new Error(`posting failed: ${r.status} ${JSON.stringify(r.body)}`);
  return e;
}

export async function makeAdmin(uid) {
  await mongoose.connection.collection("users").updateOne({ _id: new mongoose.Types.ObjectId(uid) }, { $set: { isAdmin: true } });
}
