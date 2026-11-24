// Database backup: every collection (users, profiles, jobs, chats, notifications, uploaded images…)
// into ONE compressed, encrypted file.
//
//   BACKUP_PASSPHRASE=… node scripts/backup.js              → backups/wah-<date>.wahb   (encrypted)
//   node scripts/backup.js --plain                          → backups/wah-<date>.ndjson.gz (NOT encrypted, local use only)
//   node scripts/backup.js --out some/dir                   → choose the folder
//
// Restore with scripts/restore.js. Keep the passphrase somewhere safe (password manager):
// without it an encrypted backup can't be opened by anyone, including you.
//
// Format: NDJSON lines {"c":"<collection>","d":<document as Extended JSON>} → gzip → AES-256-GCM.
// File = "WAHB1" + salt(16) + iv(12) + ciphertext + tag(16). Key = scrypt(passphrase, salt).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import mongoose from "mongoose";

const args = process.argv.slice(2);
const plain = args.includes("--plain");
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "backups";
const pass = process.env.BACKUP_PASSPHRASE || "";
const uri = process.env.BACKUP_MONGODB_URI || process.env.MONGODB_URI;

if (!uri) { console.error("❌ Set MONGODB_URI (or BACKUP_MONGODB_URI)."); process.exit(1); }
if (!plain && pass.length < 12) { console.error("❌ Set BACKUP_PASSPHRASE (12+ characters), or use --plain for an unencrypted local copy."); process.exit(1); }

const { EJSON } = mongoose.mongo.BSON;
await mongoose.connect(uri);
const db = mongoose.connection.db;
const cols = (await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name).filter(n => !n.startsWith("system.")).sort();
const counts = {};

async function* lines() {
  yield JSON.stringify({ c: "_meta", d: { app: "work-abroad-hub", at: new Date().toISOString(), db: db.databaseName, collections: cols } }) + "\n";
  for (const c of cols) {
    counts[c] = 0;
    for await (const doc of db.collection(c).find({}, { batchSize: 500 })) {
      counts[c]++;
      yield JSON.stringify({ c, d: EJSON.serialize(doc, { relaxed: false }) }) + "\n";
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = path.join(outDir, plain ? `wah-${stamp}.ndjson.gz` : `wah-${stamp}.wahb`);
const out = fs.createWriteStream(file, { mode: 0o600 });

if (plain) {
  await pipeline(Readable.from(lines()), zlib.createGzip({ level: 9 }), out);
} else {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(pass, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  out.write(Buffer.concat([Buffer.from("WAHB1"), salt, iv]));
  await pipeline(Readable.from(lines()), zlib.createGzip({ level: 9 }), cipher, out, { end: false });
  await new Promise((ok, bad) => out.end(cipher.getAuthTag(), err => (err ? bad(err) : ok())));
}
await mongoose.disconnect();

const size = (fs.statSync(file).size / 1024).toFixed(1);
console.log(`✅ Backup written: ${file} (${size} KB)`);
for (const [c, n] of Object.entries(counts)) console.log(`   ${c}: ${n}`);
