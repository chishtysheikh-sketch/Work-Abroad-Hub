// P7 migration: move images stored INSIDE documents (data:image/...;base64,...) into GridFS.
//
//   node scripts/migrate-images.js          → dry run: only counts, changes nothing
//   node scripts/migrate-images.js --run    → uploads each image and replaces it with "/api/files/<id>"
//
// Same processing as uploads (real type check, upright, max 512×512, no metadata, WEBP 80).
// The same picture used in several documents (e.g. a student photo copied into every
// application) is stored only once and all of them get the same URL.
// Safe to run again: already-migrated fields are plain URLs and are skipped.
import { env } from "../src/config/env.js";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import FbDoc from "../src/models/FbDoc.js";
import { sniff, processImage, saveImage, urlOf } from "../src/utils/images.js";

const RUN = process.argv.includes("--run");
const DATA_RE = /^data:image\/[a-z0-9.+-]+;base64,/i;

// every data:image string inside a document → [{ path: "data.profile.photo", key: "photo", value }]
function findImages(v, path, out = []) {
  if (typeof v === "string") { if (DATA_RE.test(v)) out.push({ path, key: path.split(".").filter(p => !/^\d+$/.test(p)).at(-1), value: v }); }
  else if (Array.isArray(v)) v.forEach((x, i) => findImages(x, `${path}.${i}`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) findImages(x, `${path}.${k}`, out);
  return out;
}

// who owns the image (so it's deleted with their account)
function ownerOf(doc) {
  if (doc.col === "users" || doc.col === "postings") return doc.docId;
  return doc.data?.studentUid || doc.data?.from || doc.data?.employerUid || "unknown";
}

await connectDB(env.MONGODB_URI);
console.log(RUN ? "🚚 MIGRATING images into GridFS…" : "🔎 DRY RUN (nothing is changed). Add --run to migrate.");

// users first, then postings: their photo becomes the "original" that copies point to
const ORDER = { users: 0, postings: 1 };
// scan every document (this collection is small; data:image can sit at any depth)
const all = await FbDoc.find({}).select("col docId data").lean();
all.sort((a, b) => (ORDER[a.col] ?? 2) - (ORDER[b.col] ?? 2));

let docs = 0, images = 0, bytes = 0, done = 0, failed = 0;
const byCol = {};
const seen = new Map();                         // sha256 of the data URL → "/api/files/<id>"

for (const d of all) {
  const found = findImages(d.data, "data");
  if (!found.length) continue;
  docs++; images += found.length;
  byCol[d.col.split("/")[0]] = (byCol[d.col.split("/")[0]] || 0) + found.length;
  for (const f of found) bytes += f.value.length;
  if (!RUN) continue;

  const set = {};
  for (const f of found) {
    const h = crypto.createHash("sha256").update(f.value).digest("hex");
    try {
      if (!seen.has(h)) {
        const buf = Buffer.from(f.value.slice(f.value.indexOf(",") + 1), "base64");
        if (!sniff(buf)) throw new Error("not a JPEG/PNG/WEBP");
        const kind = f.key === "logo" ? "logo" : "photo";
        seen.set(h, urlOf(await saveImage(await processImage(buf), { owner: ownerOf(d), kind })));
      }
      set[f.path] = seen.get(h);
      done++;
    } catch (e) {
      failed++;
      console.warn(`   ⚠️  ${d.col}/${d.docId} ${f.path}: ${e.message} (left as it was)`);
    }
  }
  // only these fields change, and only if they still hold the same image (someone may have saved meanwhile)
  if (Object.keys(set).length) {
    const filter = { _id: d._id };
    for (const f of found) if (set[f.path]) filter[f.path] = f.value;
    const r = await FbDoc.updateOne(filter, { $set: set });
    if (!r.modifiedCount) console.warn(`   ⚠️  ${d.col}/${d.docId}: changed while migrating, skipped (run again)`);
  }
}

console.log(`\n   documents with images: ${docs}`);
console.log(`   images found:          ${images}  ${JSON.stringify(byCol)}`);
console.log(`   size inside documents: ${(bytes / 1024).toFixed(1)} KB`);
if (RUN) console.log(`   migrated: ${done} (unique files: ${seen.size}) · failed: ${failed}`);
await mongoose.disconnect();
