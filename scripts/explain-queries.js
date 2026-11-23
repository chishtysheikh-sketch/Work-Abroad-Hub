// P10: does every main query use an index? Runs explain("executionStats") on the same filter/sort/limit
// the server uses (src/fb/core.js runQuery / load, notifications routes) and prints the plan.
//   node scripts/explain-queries.js
import mongoose from "mongoose";
import { env } from "../src/config/env.js";

await mongoose.connect(env.MONGODB_URI);
const db = mongoose.connection.db, fb = db.collection("fbdocs"), notes = db.collection("notifications");
// use real ids from the perf seed data when it's there (node scripts/seed-perf.js --more), so the numbers mean something
const chat = await fb.findOne({ col: "chats", perfSeed: true }, { projection: { docId: 1, "data.employerUid": 1, "data.studentUid": 1 } });
const emp = chat?.data?.employerUid || (await db.collection("users").findOne({}, { projection: { _id: 1 } }))?._id?.toString() || "000000000000000000000000";
const stu = chat?.data?.studentUid || emp, chatId = chat?.docId || `${emp}_${stu}`;
const anyId = emp;
console.log(`fbdocs: ${await fb.estimatedDocumentCount()} · notifications: ${await notes.estimatedDocumentCount()} · test employer ${emp}, student ${stu}\n`);

const QUERIES = [
  ["users doc by docId (load)",           () => fb.find({ col: "users", docId: anyId }).limit(1)],
  ["postings list (job board)",           () => fb.find({ col: "postings" }).sort({ docId: 1 }).limit(500)],
  ["applications by employerUid",         () => fb.find({ col: "applications", "data.employerUid": anyId }).sort({ docId: 1 }).limit(500)],
  ["applications by studentUid",          () => fb.find({ col: "applications", "data.studentUid": stu }).sort({ docId: 1 }).limit(500)],
  ["chats by member (student)",           () => fb.find({ col: "chats", "data.studentUid": stu }).sort({ docId: 1 }).limit(500)],
  ["chats by member (employer)",          () => fb.find({ col: "chats", "data.employerUid": anyId }).sort({ docId: 1 }).limit(500)],
  ["messages of a chat, ordered by at",   () => fb.find({ col: `chats/${chatId}/messages` }).sort({ "data.at": 1, docId: 1 }).limit(300)],
  ["notifications by user (list)",        () => notes.find({ user: emp }).sort({ createdAt: -1, _id: -1 }).limit(21)],
  ["notifications unread count",          () => notes.find({ user: emp, read: false })],
];

function stages(p, out = []) {
  if (!p) return out;
  out.push(p.stage + (p.indexName ? `(${p.indexName})` : ""));
  stages(p.inputStage, out);
  (p.inputStages || []).forEach(s => stages(s, out));
  return out;
}

let bad = 0;
for (const [name, q] of QUERIES) {
  const ex = await q().explain("executionStats");
  const plan = stages(ex.queryPlanner.winningPlan.queryPlan || ex.queryPlanner.winningPlan);
  const s = ex.executionStats;
  const coll = plan.some(x => x.startsWith("COLLSCAN")), sort = plan.some(x => x === "SORT");
  if (coll || sort) bad++;
  console.log(`${coll ? "❌ COLLSCAN" : sort ? "⚠️  in-memory SORT" : "✅ IXSCAN"}  ${name.padEnd(36)} ${plan.join(" ← ")}  · keys ${s.totalKeysExamined} · docs ${s.totalDocsExamined} · returned ${s.nReturned}`);
}
console.log(bad ? `\n${bad} quer${bad > 1 ? "ies need" : "y needs"} a better index` : "\nall queries use an index without an in-memory sort");
await mongoose.disconnect();
