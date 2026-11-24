// Removes the collections of the first version of the backend (before the website moved to /api/fb).
// Nothing reads them any more: jobs, applications, conversations, messages, hello (a connection test).
//
//   node scripts/cleanup-legacy.js         → dry run: shows what would be removed
//   node scripts/cleanup-legacy.js --run   → removes them (make a backup first: node scripts/backup.js)
import "dotenv/config";
import mongoose from "mongoose";

const LEGACY = ["jobs", "applications", "conversations", "messages", "hello"];
const run = process.argv.includes("--run");

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const have = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
const found = LEGACY.filter(c => have.has(c));
if (!found.length) console.log("Nothing to clean: no old collections found.");
for (const c of found) {
  const n = await db.collection(c).countDocuments();
  if (run) { await db.collection(c).drop(); console.log(`   🗑️  ${c} (${n} documents) removed`); }
  else console.log(`   would remove ${c} (${n} documents)`);
}
if (found.length && !run) console.log("\nDry run: nothing changed. Add --run to remove them.");
await mongoose.disconnect();
