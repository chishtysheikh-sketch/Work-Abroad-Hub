// Unit tests for the security rules (src/fb/rules.js) — no server, no database.
import { describe, it, expect } from "vitest";
import { canRead, canWrite } from "../src/fb/rules.js";

const STU = "stu1", EMP = "emp1", OTHER = "other1";
const CHAT = `${EMP}_${STU}`;
const DB = {
  users: { [STU]: { role: "student" }, [EMP]: { role: "employer" }, [OTHER]: { role: "student" } },
  chats: { [CHAT]: { employerUid: EMP, studentUid: STU } },
  postings: { [EMP]: { company: { name: "Cafe" }, jobs: [
    { id: "j", title: "Barista", status: "open" },
    { id: "c", title: "Old job", status: "closed" },
    { id: "h", title: "Hidden job", status: "closed", hiddenByAdmin: true },
  ] } },
};
const load = async (col, id) => DB[col]?.[id] ?? null;
const V = { verified: true };
// "" = allowed, anything else = the reason it was refused
const write = (op, col, id, oldData, newData, uid, ctx = V) => canWrite(op, col, id, oldData, newData, uid, load, ctx);

const posting = (...jobs) => ({ company: { name: "Cafe" }, jobs });
const hourly = pay => ({ id: "j", title: "Barista", status: "open", payType: "hourly", pay });

describe("profiles are private", () => {
  it("only the owner can read or change a profile", async () => {
    expect(await canRead("users", STU, DB.users[STU], STU, load)).toBe(true);
    expect(await canRead("users", STU, DB.users[STU], OTHER, load)).toBe(false);
    expect(await canRead("users", STU, DB.users[STU], null, load)).toBe(false);
    expect(await write("update", "users", STU, DB.users[STU], { role: "student" }, OTHER)).toMatch(/Not your profile/);
    expect(await write("update", "users", STU, DB.users[STU], { role: "student" }, STU)).toBe("");
  });
  it("logged out can't write anything; role must be student or employer", async () => {
    expect(await write("create", "users", STU, null, { role: "student" }, null)).toMatch(/log in/);
    expect(await write("update", "users", STU, {}, { role: "admin" }, STU)).toMatch(/Role/);
  });
  it("job posts are public", async () => {
    expect(await canRead("postings", EMP, posting(hourly(12000)), null, load)).toBe(true);
  });
});

describe("only employers post jobs", () => {
  it("a student can't post, an employer can, and only on their own page", async () => {
    expect(await write("create", "postings", STU, null, posting(hourly(12000)), STU)).toMatch(/Only employers/);
    expect(await write("create", "postings", EMP, null, posting(hourly(12000)), EMP)).toBe("");
    expect(await write("create", "postings", EMP, null, posting(hourly(12000)), OTHER)).toMatch(/Not your company/);
  });
  it("an unverified employer can't post", async () => {
    expect(await write("create", "postings", EMP, null, posting(hourly(12000)), EMP, { verified: false })).toMatch(/verify your email/);
  });
});

describe("minimum wage (₩10,320 an hour)", () => {
  it("hourly: below is blocked, exactly the minimum is fine", async () => {
    expect(await write("create", "postings", EMP, null, posting(hourly(10000)), EMP)).toMatch(/minimum wage/);
    expect(await write("create", "postings", EMP, null, posting(hourly(10320)), EMP)).toBe("");
  });
  it("daily: pay for 4 hours must be at least 4 × the hourly minimum", async () => {
    const daily = pay => ({ id: "d", title: "Event staff", status: "open", payType: "daily", payHours: 4, pay });
    expect(await write("create", "postings", EMP, null, posting(daily(40000)), EMP)).toMatch(/minimum wage/);
    expect(await write("create", "postings", EMP, null, posting(daily(41280)), EMP)).toBe("");
  });
  it("monthly part-time (20 h/week + paid weekly holiday) is OK at the legal amount", async () => {
    // (20 h + 4 h holiday) × 209/48 × 10,320 = ₩1,078,440
    const monthly = pay => ({ id: "m", title: "Office helper", status: "open", payType: "monthly", payHours: 20, pay });
    expect(await write("create", "postings", EMP, null, posting(monthly(900000)), EMP)).toMatch(/minimum wage/);
    expect(await write("create", "postings", EMP, null, posting(monthly(1078440)), EMP)).toBe("");
  });
  // bug found by these tests (P12): all of these used to be ALLOWED for open jobs
  const sneaky = [
    ["pay 0", { payType: "hourly", pay: 0 }],
    ["no pay at all", { payType: "hourly" }],
    ["pay written as text", { payType: "hourly", pay: "lots" }],
    ["a monthly job without hours (₩1)", { payType: "monthly", pay: 1 }],
    ["a daily job without hours (₩1)", { payType: "daily", pay: 1 }],
    ["a made-up pay type (₩1 'yearly')", { payType: "yearly", pay: 1 }],
    ["impossible hours (30 a day)", { payType: "daily", payHours: 30, pay: 999999 }],
  ];
  for (const [name, j] of sneaky) {
    it(`an open job can't dodge the minimum wage with ${name}`, async () => {
      const why = await write("create", "postings", EMP, null, posting({ id: "s", title: "Sneaky", status: "open", ...j }), EMP);
      expect(why).not.toBe("");
    });
  }
  it("older jobs without a pay type still count as hourly", async () => {
    expect(await write("create", "postings", EMP, null, posting({ id: "o", title: "Old", status: "open", pay: 11000 }), EMP)).toBe("");
  });
  it("a CLOSED job with old low pay doesn't block saving", async () => {
    expect(await write("create", "postings", EMP, null, posting({ ...hourly(9000), status: "closed" }), EMP)).toBe("");
  });
});

describe("applications", () => {
  const app = { jobId: "j", jobTitle: "Barista", employerUid: EMP, studentUid: STU, status: "new" };
  it("only students apply, as themselves, with status 'new'", async () => {
    expect(await write("create", "applications", "a1", null, app, STU)).toBe("");
    expect(await write("create", "applications", "a1", null, { ...app, studentUid: EMP }, EMP)).toMatch(/Only students/);
    expect(await write("create", "applications", "a1", null, app, OTHER)).toMatch(/Wrong student/);
    expect(await write("create", "applications", "a1", null, { ...app, status: "hired" }, STU)).toMatch(/status 'new'/);
  });
  // bug found by these tests (P12): an application could point at ANY user and job title → that user got a
  // "New application … applied for <any text>" notification + email (spam with words chosen by the sender)
  it("can only be sent for a real, open job of that employer, with its real title", async () => {
    expect(await write("create", "applications", "a1", null, { ...app, employerUid: OTHER }, STU)).toMatch(/isn't open/);
    expect(await write("create", "applications", "a1", null, { ...app, jobId: "nope" }, STU)).toMatch(/isn't open/);
    expect(await write("create", "applications", "a1", null, { ...app, jobId: "c", jobTitle: "Old job" }, STU)).toMatch(/isn't open/);
    expect(await write("create", "applications", "a1", null, { ...app, jobId: "h", jobTitle: "Hidden job" }, STU)).toMatch(/isn't open/);
    expect(await write("create", "applications", "a1", null, { ...app, jobTitle: "FREE MONEY, click here" }, STU)).toMatch(/changed/);
  });
  it("only the employer changes it, and only the status", async () => {
    expect(await write("update", "applications", "a1", app, { ...app, status: "interview" }, EMP)).toBe("");
    expect(await write("update", "applications", "a1", app, { ...app, status: "hired" }, STU)).toMatch(/Only the employer/);
    expect(await write("update", "applications", "a1", app, { ...app, status: "hired", jobId: "other" }, EMP)).toMatch(/Only the status/);
  });
  it("only the two people involved can read it; nobody can delete it", async () => {
    expect(await canRead("applications", "a1", app, STU, load)).toBe(true);
    expect(await canRead("applications", "a1", app, EMP, load)).toBe(true);
    expect(await canRead("applications", "a1", app, OTHER, load)).toBe(false);
    expect(await write("delete", "applications", "a1", app, null, EMP)).toMatch(/can't be deleted/);
  });
});

describe("chats", () => {
  const MSGS = `chats/${CHAT}/messages`;
  it("only the two members read or write", async () => {
    expect(await canRead("chats", CHAT, DB.chats[CHAT], STU, load)).toBe(true);
    expect(await canRead("chats", CHAT, DB.chats[CHAT], OTHER, load)).toBe(false);
    expect(await canRead(MSGS, "m1", { from: STU, text: "hi" }, OTHER, load)).toBe(false);
    expect(await write("create", MSGS, "m1", null, { from: STU, text: "hi", at: 1 }, STU)).toBe("");
    expect(await write("create", MSGS, "m1", null, { from: OTHER, text: "hi", at: 1 }, OTHER)).toMatch(/Not your chat/);
  });
  it("chat id must be employer_student and members can't change", async () => {
    expect(await write("create", "chats", "wrong-id", null, DB.chats[CHAT], STU)).toMatch(/Wrong chat id/);
    expect(await write("update", "chats", CHAT, DB.chats[CHAT], { ...DB.chats[CHAT], studentUid: OTHER }, STU)).toMatch(/can't change/);
  });
  it("you can't send as someone else; messages are 1–1000 characters", async () => {
    expect(await write("create", MSGS, "m1", null, { from: EMP, text: "hi", at: 1 }, STU)).toMatch(/Wrong sender/);
    expect(await write("create", MSGS, "m1", null, { from: STU, text: "x".repeat(1001), at: 1 }, STU)).toMatch(/1–1000/);
  });
  it("only the sender can unsend, and unsend only empties the text", async () => {
    const msg = { from: STU, text: "oops", at: 5 };
    const unsent = { from: STU, text: "", at: 5, deleted: true };
    expect(await write("update", MSGS, "m1", msg, unsent, STU)).toBe("");
    expect(await write("update", MSGS, "m1", msg, { ...unsent, from: EMP }, EMP)).toMatch(/only unsend your own/);
    expect(await write("update", MSGS, "m1", msg, { ...msg, text: "edited" }, STU)).toMatch(/Only unsend/);
  });
});

describe("jobs hidden by an admin", () => {
  const hidden = { ...hourly(12000), status: "closed", hiddenByAdmin: true, hiddenInfo: { reason: "fake", at: 1, prevStatus: "open" } };
  it("the employer can't reopen it or remove the flag, but can still edit it", async () => {
    const old = posting(hidden);
    expect(await write("update", "postings", EMP, old, posting({ ...hidden, status: "open" }), EMP)).toMatch(/can't be reopened/);
    const { hiddenByAdmin, hiddenInfo, ...unflagged } = hidden;
    expect(await write("update", "postings", EMP, old, posting({ ...unflagged, status: "open" }), EMP)).toMatch(/Only an admin/);
    expect(await write("update", "postings", EMP, old, posting({ ...hidden, title: "New title" }), EMP)).toBe("");
  });
  it("an employer can't hide a job themselves", async () => {
    expect(await write("update", "postings", EMP, posting(hourly(12000)), posting({ ...hourly(12000), hiddenByAdmin: true }), EMP)).toMatch(/Only an admin/);
  });
});
