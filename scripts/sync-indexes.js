// P10: make the MongoDB indexes match the models (adds new ones, drops the ones the models no longer list).
//   node scripts/sync-indexes.js          → show what would change
//   node scripts/sync-indexes.js --run    → change it
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import FbDoc from "../src/models/FbDoc.js";
import Notification from "../src/models/Notification.js";

await mongoose.connect(env.MONGODB_URI);
for (const M of [FbDoc, Notification]) {
  const d = await M.diffIndexes();
  console.log(`${M.collection.name}: add ${JSON.stringify(d.toCreate.map(i => i.key ?? i))} · drop ${JSON.stringify(d.toDrop)}`);
  if (process.argv[2] === "--run") { const dropped = await M.syncIndexes(); console.log(`   done (dropped: ${JSON.stringify(dropped)})`); }
}
await mongoose.disconnect();
