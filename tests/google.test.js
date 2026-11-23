// Google sign-in, with google-auth-library replaced: no network, no real Google.
import { describe, it, expect, beforeAll, vi } from "vitest";
import { client, getApp } from "./helpers.js";

// Google sign-in is only switched on when both values exist. vi.hoisted runs BEFORE any import,
// so src/config/env.js sees them when it loads.
const { CLIENT_ID, SECRET } = vi.hoisted(() => {
  const v = { CLIENT_ID: "1234-test.apps.googleusercontent.com", SECRET: "GOCSPX-test-secret-never-shown" };
  process.env.GOOGLE_CLIENT_ID = v.CLIENT_ID;
  process.env.GOOGLE_CLIENT_SECRET = v.SECRET;
  return v;
});

// "code" sent by the browser → what Google would say about the person
const GOOGLE = vi.hoisted(() => ({
  "code-mina-123": { sub: "google-sub-mina", email: "mina.google@example.com", email_verified: true, name: "Mina Kim" },
  "code-unverified-1": { sub: "google-sub-x", email: "x.google@example.com", email_verified: false, name: "X" },
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async getToken(code) {
      if (!GOOGLE[code]) throw new Error("invalid_grant");
      return { tokens: { id_token: code } };
    }
    async verifyIdToken({ idToken }) { return { getPayload: () => GOOGLE[idToken] }; }
  },
}));

beforeAll(async () => { await getApp(); });

describe("Google sign-in", () => {
  it("/auth/google-config gives the client ID but never the secret", async () => {
    const r = await (await client()).get("/api/fb/auth/google-config");
    expect(r.body).toEqual({ enabled: true, clientId: CLIENT_ID });
    expect(r.text).not.toContain(SECRET);
    expect(r.text).not.toContain("GOCSPX");
  });

  it("a good code creates a verified account; a bad one is refused", async () => {
    const a = await client();
    const ok = await a.post("/api/fb/auth/google").send({ code: "code-mina-123" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ isNewUser: true, user: { email: "mina.google@example.com", emailVerified: true } });

    const bad = await (await client()).post("/api/fb/auth/google").send({ code: "made-up-code-999" });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("auth/invalid-credential");

    const unverified = await (await client()).post("/api/fb/auth/google").send({ code: "code-unverified-1" });
    expect(unverified.status).toBe(400);
  });

  it("a password login on a Google-only account gives the friendly message", async () => {
    await (await client()).post("/api/fb/auth/google").send({ code: "code-mina-123" });
    const r = await (await client()).post("/api/fb/auth/login").send({ email: "mina.google@example.com", password: "Some-Guess-123" });
    expect(r.status).toBe(401);
    expect(r.body.reason).toBe("google-only");
    expect(r.body.error).toMatch(/uses Google sign-in.*Continue with Google/);
  });
});
