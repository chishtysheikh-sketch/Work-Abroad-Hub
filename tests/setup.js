// Runs before EVERY test file:
//  · safety: refuse to run against anything but the in-memory MongoDB, never "workabroadhub"
//  · connect mongoose to a fresh database just for this file, empty it after every test
//  · no real emails: src/utils/mailer.js is replaced; sent mails land in `outbox` (tests read the links there)
//  · no real DNS: the "does this domain receive email?" check is answered locally
import { beforeAll, afterAll, afterEach, inject, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("../src/utils/mailer.js", async importOriginal => {
  const real = await importOriginal();
  const outbox = [];
  return {
    ...real,                                   // keeps emailTemplate (real email text)
    mailEnabled: false,
    outbox,
    sendMail: vi.fn(async mail => { outbox.push(mail); return { printed: true }; }),
  };
});

vi.mock("node:dns", async importOriginal => {
  const real = await importOriginal();
  // domains ending in ".invalid" (or no-mail.example) "can't receive email"; everything else can
  const resolveMx = async domain => {
    if (domain.endsWith(".invalid") || domain === "no-mail.example") throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    return [{ exchange: `mx.${domain}`, priority: 10 }];
  };
  const promises = { ...real.promises, resolveMx };
  return { ...real, promises, default: { ...real, promises } };
});

const uri = inject("mongoUri");
const dbName = `test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;

beforeAll(async () => {
  const u = new URL(uri);
  if (process.env.NODE_ENV !== "test" || !["127.0.0.1", "localhost"].includes(u.hostname) || u.port === "27017" || dbName === "workabroadhub")
    throw new Error(`Refusing to run tests against ${u.host}/${dbName}: tests only use the in-memory MongoDB.`);
  await mongoose.connect(uri, { dbName });
});

afterEach(async () => {
  for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
  const { outbox } = await import("../src/utils/mailer.js");
  outbox.length = 0;
  // the shared job-board cache (P10) must not carry postings from one test into the next
  const { changed } = await import("../src/fb/shared.js");
  changed("postings");
});

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
});
