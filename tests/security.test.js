import { describe, it, expect } from "vitest";
import { client, signup, write } from "./helpers.js";

describe("bad input is refused", () => {
  it("field names starting with $ are refused (MongoDB operator injection)", async () => {
    const { agent, uid } = await signup();
    const r = await write(agent, "set", `users/${uid}`, { role: "student", profile: { $where: "sleep(1000)" } });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Bad field name/);
  });

  it("field names with a dot are refused", async () => {
    const { agent, uid } = await signup();
    const r = await write(agent, "set", `users/${uid}`, { role: "student", "profile.isAdmin": true });
    expect(r.status).toBe(400);
  });

  it("strange paths are refused", async () => {
    const a = await client();
    for (const path of ["../users", "users/$where", "users/a/b/c/d/e"]) {
      const r = await a.post("/api/fb/doc").send({ path });
      expect(r.status, path).toBe(400);
    }
  });

  it("a body bigger than 1 MB is refused", async () => {
    const { agent, uid } = await signup();
    const r = await write(agent, "set", `users/${uid}`, { role: "student", note: "x".repeat(1.1 * 1024 * 1024) });
    expect(r.status).toBe(413);
  });

  it("broken JSON → 400 with a requestId (not a server error)", async () => {
    const r = await (await client()).post("/api/fb/query").set("Content-Type", "application/json").send("{oops");
    expect(r.status).toBe(400);
    expect(r.body.requestId).toBe(r.headers["x-request-id"]);
  });

  it("a bad query shape is a 400, not a crash", async () => {
    const r = await (await client()).post("/api/fb/query").send({ path: "postings", q: { where: 5 } });
    expect(r.status).toBe(400);
  });
});

describe("rate limits", () => {
  it("“forgot password” allows 5 per hour per IP, then 429", async () => {
    const a = await client();
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await a.post("/api/fb/auth/forgot").send({ email: `x${i}@example.com` })).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it("another IP is not affected", async () => {
    expect((await (await client()).post("/api/fb/auth/forgot").send({ email: "y@example.com" })).status).toBe(200);
  });
});

describe("security headers", () => {
  it("pages come with CSP, no MIME sniffing, and a request id", async () => {
    const r = await (await client()).get("/api/health");
    expect(r.headers["content-security-policy"]).toMatch(/default-src 'self'/);
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.body).toMatchObject({ ok: true, db: "up" });
  });
});
