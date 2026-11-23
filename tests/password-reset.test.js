import { describe, it, expect } from "vitest";
import { client, signup, linkFor, outbox, newEmail, PASSWORD } from "./helpers.js";

const NEW_PASSWORD = "Brand-New-Pass-97!";
const tokenOf = link => new URL(link).searchParams.get("token");

describe("forgot password", () => {
  it("an unknown email gets the same 200 answer and no email is sent", async () => {
    const { email } = await signup();
    const a = await client();
    const known = await a.post("/api/fb/auth/forgot").send({ email });
    const unknown = await a.post("/api/fb/auth/forgot").send({ email: newEmail("nobody") });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);              // nobody can tell which emails have an account
    expect(outbox.filter(m => m.subject === "Reset your password")).toHaveLength(1);
  });

  it("the reset link works once; the old password stops working; other sessions are logged out", async () => {
    const { agent: phone, email } = await signup();
    const laptop = await client();
    await laptop.post("/api/fb/auth/forgot").send({ email });
    const link = linkFor(email, "reset-password.html?token=");
    expect(link).toBeTruthy();

    const r = await laptop.post("/api/fb/auth/reset").send({ token: tokenOf(link), password: NEW_PASSWORD });
    expect(r.status).toBe(200);

    const twice = await laptop.post("/api/fb/auth/reset").send({ token: tokenOf(link), password: "Another-Pass-55!" });
    expect(twice.status).toBe(400);
    expect(twice.body.code).toBe("auth/expired-action-code");

    expect((await phone.get("/api/fb/auth/me")).body.user).toBeNull();                 // old session revoked
    expect((await laptop.post("/api/fb/auth/login").send({ email, password: PASSWORD })).status).toBe(401);
    expect((await laptop.post("/api/fb/auth/login").send({ email, password: NEW_PASSWORD })).status).toBe(200);
    expect(outbox.some(m => m.to === email && m.subject === "Your password was changed")).toBe(true);
  });

  it("a weak new password is refused and the link stays usable", async () => {
    const { email } = await signup();
    const a = await client();
    await a.post("/api/fb/auth/forgot").send({ email });
    const token = tokenOf(linkFor(email, "reset-password.html"));
    expect((await a.post("/api/fb/auth/reset").send({ token, password: "short1" })).status).toBe(400);
    expect((await a.post("/api/fb/auth/reset").send({ token, password: NEW_PASSWORD })).status).toBe(200);
  });
});

describe("change password (Settings)", () => {
  it("needs the right current password", async () => {
    const { agent } = await signup();
    const r = await agent.post("/api/fb/auth/change-password").send({ currentPassword: "Wrong-Pass-11", newPassword: NEW_PASSWORD });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("auth/wrong-password");
  });

  it("changes it: this device stays in, other devices are logged out", async () => {
    const { agent: phone, email } = await signup();
    const laptop = await client();
    await laptop.post("/api/fb/auth/login").send({ email, password: PASSWORD });

    const r = await phone.post("/api/fb/auth/change-password").send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expect(r.status).toBe(200);
    expect((await phone.get("/api/fb/auth/me")).body.user?.email).toBe(email);
    expect((await laptop.get("/api/fb/auth/me")).body.user).toBeNull();
    expect((await (await client()).post("/api/fb/auth/login").send({ email, password: NEW_PASSWORD })).status).toBe(200);
  });

  it("the new password must be different", async () => {
    const { agent } = await signup();
    const r = await agent.post("/api/fb/auth/change-password").send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(r.status).toBe(400);
  });
});
