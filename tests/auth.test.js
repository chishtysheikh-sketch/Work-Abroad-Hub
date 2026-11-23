import { describe, it, expect } from "vitest";
import { client, signup, newEmail, PASSWORD } from "./helpers.js";

describe("sign-up checks", () => {
  const tries = [
    ["a bad email", "not-an-email", PASSWORD, "auth/invalid-email", /valid email/],
    ["a temporary inbox", "someone@mailinator.com", PASSWORD, "auth/invalid-email", /temporary inbox/],
    ["a typo in the domain", "someone@gmial.com", PASSWORD, "auth/invalid-email", /Did you mean someone@gmail\.com/],
    ["a domain without mail server", "someone@nothing-here.invalid", PASSWORD, "auth/invalid-email", /can't receive email/],
    ["a short password", null, "Ab1", "auth/weak-password", /8–72/],
    ["a password without numbers", null, "OnlyLettersHere", "auth/weak-password", /letter and one number/],
    ["a very common password", null, "password123", "auth/weak-password", /too common/],
  ];
  for (const [name, email, password, code, msg] of tries) {
    it(`refuses ${name}`, async () => {
      const a = await client();
      const r = await a.post("/api/fb/auth/signup").send({ email: email || newEmail(), password });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe(code);
      expect(r.body.error).toMatch(msg);
    });
  }

  it("refuses a second account with the same email", async () => {
    const { email } = await signup();
    const r = await (await client()).post("/api/fb/auth/signup").send({ email, password: PASSWORD });
    expect(r.status).toBe(409);
  });
});

describe("log in and out", () => {
  it("sign up → me → log out → me is null", async () => {
    const a = await client();
    const email = newEmail();
    const s = await a.post("/api/fb/auth/signup").send({ email, password: PASSWORD });
    expect(s.status).toBe(201);
    expect(s.headers["set-cookie"].join(";")).toMatch(/wah_token=.*HttpOnly/i);

    const me = await a.get("/api/fb/auth/me");
    expect(me.body.user).toMatchObject({ email, emailVerified: false, isAdmin: false });

    expect((await a.post("/api/fb/auth/logout")).status).toBe(200);
    expect((await a.get("/api/fb/auth/me")).body.user).toBeNull();
  });

  it("wrong password → 401 with the same message as an unknown email", async () => {
    const { email } = await signup();
    const a = await client();
    const wrong = await a.post("/api/fb/auth/login").send({ email, password: "Wrong-Pass-1" });
    const unknown = await a.post("/api/fb/auth/login").send({ email: newEmail(), password: "Wrong-Pass-1" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it("locks the account after 5 wrong passwords (even the right one is refused then)", async () => {
    const { email } = await signup();
    const a = await client();
    for (let i = 0; i < 5; i++) {
      const r = await a.post("/api/fb/auth/login").send({ email, password: `Wrong-Pass-${i}` });
      expect(r.status).toBe(i < 4 ? 401 : 429);
    }
    const right = await a.post("/api/fb/auth/login").send({ email, password: PASSWORD });
    expect(right.status).toBe(429);
    expect(right.body.error).toMatch(/15 minutes/);
  });

  it("“log out everywhere” ends every other session too", async () => {
    const { agent: phone, email } = await signup();
    const laptop = await client();
    expect((await laptop.post("/api/fb/auth/login").send({ email, password: PASSWORD })).status).toBe(200);

    expect((await phone.post("/api/fb/auth/logout-all")).status).toBe(200);
    expect((await laptop.get("/api/fb/auth/me")).body.user).toBeNull();
    expect((await phone.get("/api/fb/auth/me")).body.user).toBeNull();
    // logging in again works
    expect((await laptop.post("/api/fb/auth/login").send({ email, password: PASSWORD })).status).toBe(200);
  });
});
