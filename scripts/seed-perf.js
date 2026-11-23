// P10: fake data for performance tests — 30 employers with 5 open jobs each.
// Everything it creates is marked perfSeed: true, so it can be removed again.
//   node scripts/seed-perf.js            → create (skips if seed data already exists)
//   node scripts/seed-perf.js --count    → how many seed documents exist
//   node scripts/seed-perf.js --delete   → delete ONLY the perfSeed documents
// The fake accounts can't log in (their password hash is not a real bcrypt hash).
import mongoose from "mongoose";
import { env } from "../src/config/env.js";

const EMPLOYERS = 30, JOBS_EACH = 5;
const CITIES = [["Seoul", 37.5665, 126.978], ["Busan", 35.1796, 129.0756], ["Incheon", 37.4563, 126.7052], ["Daegu", 35.8714, 128.6014], ["Daejeon", 36.3504, 127.3845]];
const CATS = ["cafe", "retail", "tutor", "translate", "office", "tourism", "events", "online"];
const TITLES = ["Barista", "Store assistant", "English tutor", "Translator (KR-EN)", "Office helper", "Hotel front desk", "Event staff", "Content writer"];
const FLAGS = ["english", "weekend", "noexp", "evening", "remote"];

await mongoose.connect(env.MONGODB_URI);
const db = mongoose.connection.db, users = db.collection("users"), fbdocs = db.collection("fbdocs");
const arg = process.argv[2];

const notes = db.collection("notifications");
async function counts() {
  return { users: await users.countDocuments({ perfSeed: true }), fbdocs: await fbdocs.countDocuments({ perfSeed: true }),
           notifications: await notes.countDocuments({ perfSeed: true }) };
}

if (arg === "--more") {
  // extra data so index tests (scripts/explain-queries.js) have something real to search through:
  // 600 applications, 60 chats × 50 messages, 1,500 notifications — all perfSeed
  const emps = (await fbdocs.find({ col: "postings", perfSeed: true }).project({ docId: 1 }).toArray()).map(d => d.docId);
  if (!emps.length) { console.log("run without arguments first"); process.exit(1); }
  if (await fbdocs.countDocuments({ col: "applications", perfSeed: true })) { console.log("extra data already exists:", await counts()); process.exit(0); }
  const students = Array.from({ length: 50 }, () => String(new mongoose.Types.ObjectId()));
  const now = Date.now(), rows = [], nrows = [];
  const ST = ["new", "contacted", "interview", "hired", "rejected"];
  emps.forEach((e, i) => { for (let k = 0; k < 20; k++) {
    const s = students[(i * 7 + k) % students.length];
    rows.push({ perfSeed: true, col: "applications", docId: `perfapp${i}x${k}`, createdAt: new Date(), updatedAt: new Date(),
      data: { perfSeed: true, jobId: `perf${i}x${k % 5}`, jobTitle: "Perf job", company: `Perf Test Company ${i + 1}`, employerUid: e, studentUid: s, name: "Perf Student", status: ST[k % 5], createdAt: now - k * 60000 } });
  } });
  for (let c = 0; c < 60; c++) {
    const e = emps[c % emps.length], s = students[c % students.length], chatId = `${e}_${s}`;
    rows.push({ perfSeed: true, col: "chats", docId: chatId, createdAt: new Date(), updatedAt: new Date(), data: { perfSeed: true, employerUid: e, studentUid: s, jobTitle: "Perf job", readBy: {} } });
    for (let m = 0; m < 50; m++) rows.push({ perfSeed: true, col: `chats/${chatId}/messages`, docId: `perfm${c}x${m}`, createdAt: new Date(), updatedAt: new Date(),
      data: { perfSeed: true, from: m % 2 ? e : s, text: `perf message ${m}`, at: now - (50 - m) * 60000 } });
  }
  [...emps.slice(0, 10), ...students.slice(0, 5)].forEach((u, i) => { for (let k = 0; k < 100; k++)
    nrows.push({ perfSeed: true, user: u, type: "application", title: `Perf notification ${k}`, body: "", link: {}, count: 1, read: k % 3 === 0, createdAt: new Date(now - (i * 100 + k) * 60000) }); });
  await fbdocs.insertMany(rows);
  await notes.insertMany(nrows);
  console.log("extra data created:", await counts());
} else if (arg === "--count") {
  console.log("perf seed documents:", await counts());
} else if (arg === "--delete") {
  const before = await counts();
  const u = await users.deleteMany({ perfSeed: true });
  const f = await fbdocs.deleteMany({ perfSeed: true });
  const n = await notes.deleteMany({ perfSeed: true });
  console.log(`deleted ${u.deletedCount} users + ${f.deletedCount} fbdocs + ${n.deletedCount} notifications (there were ${JSON.stringify(before)})`);
} else {
  const have = await counts();
  if (have.users || have.fbdocs) { console.log("seed data already exists:", have, "→ run with --delete first"); }
  else {
    const now = new Date(), userRows = [], docRows = [];
    for (let i = 0; i < EMPLOYERS; i++) {
      const _id = new mongoose.Types.ObjectId(), uid = String(_id);
      const [city, lat, lng] = CITIES[i % CITIES.length];
      const name = `Perf Test Company ${String(i + 1).padStart(2, "0")}`;
      userRows.push({ _id, perfSeed: true, email: `perf-employer-${i + 1}@perf.invalid`, name, role: "employer",
        passwordHash: "perf-seed-not-a-real-hash", emailVerified: true, blocked: false, isAdmin: false, tokenVersion: 0,
        createdAt: now, updatedAt: now });
      const company = { name, biz: `${100 + i}-${10 + (i % 90)}-${String(10000 + i * 37).slice(0, 5)}`, type: CATS[i % CATS.length],
        contact: "Perf Tester", email: `perf-employer-${i + 1}@perf.invalid`, phone: "010-0000-0000", city, address: `${i + 1} Test-ro, ${city}`,
        langs: "Korean, English", about: "A pretend company made by scripts/seed-perf.js for load testing. ".repeat(3) };
      const jobs = [];
      for (let k = 0; k < JOBS_EACH; k++) {
        const c = (i + k) % TITLES.length;
        jobs.push({ id: `perf${i}x${k}`, title: `${TITLES[c]} (perf ${i + 1}-${k + 1})`, ko: TITLES[c], cat: CATS[c], city, area: "Test-dong",
          hours: "Mon–Fri 10:00–14:00", payType: "hourly", pay: 10320 + 500 * k, payHours: null, lvl: [0, 1, 3, 5][k % 4],
          flags: FLAGS.slice(0, 1 + (k % 3)), deadline: "", status: "open",
          desc: "Pretend job for performance testing. Friendly team, flexible hours, training given. ".repeat(4),
          lat: lat + (k - 2) * 0.01, lng: lng + (i % 7 - 3) * 0.01, createdAt: now.getTime() - (i * JOBS_EACH + k) * 3600_000 });
      }
      docRows.push({ perfSeed: true, col: "users", docId: uid, data: { perfSeed: true, role: "employer", loggedIn: true, createdAt: now.getTime(), profile: { contact: "Perf Tester" } }, createdAt: now, updatedAt: now });
      docRows.push({ perfSeed: true, col: "postings", docId: uid, data: { perfSeed: true, company, jobs, updatedAt: now.getTime() }, createdAt: now, updatedAt: now });
    }
    await users.insertMany(userRows);
    await fbdocs.insertMany(docRows);
    console.log(`created ${EMPLOYERS} employers × ${JOBS_EACH} jobs:`, await counts());
  }
}
await mongoose.disconnect();
