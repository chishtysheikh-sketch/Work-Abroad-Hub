// Restore a backup made by scripts/backup.js.
//
//   node scripts/restore.js <file>                    → dry run: checks the file, shows what's inside, changes nothing
//   node scripts/restore.js <file> --run              → restores into MONGODB_URI (or RESTORE_MONGODB_URI)
//   node scripts/restore.js <file> --run --drop       → empties each collection first (a clean copy of the backup)
//
// Encrypted files (.wahb) need BACKUP_PASSPHRASE. Without --drop, documents that already exist
// (same _id) are replaced by the backup's version and everything else is kept.
// Tip: restore into an EMPTY test database first (RESTORE_MONGODB_URI=…/wah-restore-test) to check a backup.
import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import zlib from "node:zlib";
import readline from "node:readline";
import { Readable } from "node:stream";
import mongoose from "mongoose";

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
const run = args.includes("--run"), drop = args.includes("--drop");
if (!file || !fs.existsSync(file)) { console.error("❌ Usage: node scripts/restore.js <backup file> [--run] [--drop]"); process.exit(1); }

function openBackup() {
  const raw = fs.readFileSync(file);
  if (raw.subarray(0, 5).toString() !== "WAHB1") return zlib.gunzipSync(raw);            // --plain backup
  const pass = process.env.BACKUP_PASSPHRASE || "";
  if (!pass) { console.error("❌ This backup is encrypted: set BACKUP_PASSPHRASE."); process.exit(1); }
  const salt = raw.subarray(5, 21), iv = raw.subarray(21, 33), tag = raw.subarray(raw.length - 16), body = raw.subarray(33, raw.length - 16);
  const key = crypto.scryptSync(pass, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv); d.setAuthTag(tag);
  try { return zlib.gunzipSync(Buffer.concat([d.update(body), d.final()])); }
  catch { console.error("❌ Wrong passphrase, or the file is damaged."); process.exit(1); }
}

const { EJSON } = mongoose.mongo.BSON;
const data = openBackup();
const rl = readline.createInterface({ input: Readable.from(data) });
const docs = new Map();         // collection → documents
let meta = null;
for await (const line of rl) {
  if (!line) continue;
  const { c, d } = JSON.parse(line);
  if (c === "_meta") { meta = d; continue; }
  if (!docs.has(c)) docs.set(c, []);
  docs.get(c).push(EJSON.deserialize(d, { relaxed: false }));
}
console.log(`📦 Backup from ${meta?.at || "?"} (database "${meta?.db || "?"}")`);
for (const c of meta?.collections || []) console.log(`   ${c}: ${(docs.get(c) || []).length}`);

if (!run) { console.log("\nDry run: nothing changed. Add --run to restore (and --drop for a clean copy)."); process.exit(0); }

const uri = process.env.RESTORE_MONGODB_URI || process.env.MONGODB_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;
console.log(`\n♻️  Restoring into "${db.databaseName}"${drop ? " (collections emptied first)" : ""}…`);
for (const c of meta?.collections || [...docs.keys()]) {
  const list = docs.get(c) || [];
  if (drop) await db.collection(c).deleteMany({});
  for (let i = 0; i < list.length; i += 500) {
    const ops = list.slice(i, i + 500).map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }));
    if (ops.length) await db.collection(c).bulkWrite(ops, { ordered: false });
  }
  console.log(`   ✓ ${c}: ${list.length}`);
}
await mongoose.disconnect();
console.log("✅ Restore finished. Restart the server, then run: node scripts/sync-indexes.js --run");
