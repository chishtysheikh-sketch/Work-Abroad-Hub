// P7: images (profile photos, company logos) are stored as files in MongoDB GridFS,
// bucket "images". Documents only keep a short URL: /api/files/<id>.
// Used by routes/files.routes.js, the account-delete route and scripts/migrate-images.js.
import mongoose from "mongoose";
import sharp from "sharp";

export const KINDS = ["photo", "logo"];
export const FILE_URL_RE = /^\/api\/files\/[a-f0-9]{24}$/;
export const MAX_UPLOAD = 5 * 1024 * 1024;

sharp.cache(false);                       // don't keep decoded images in memory between requests

let bucket = null;
export function images() {
  if (!bucket) bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "images" });
  return bucket;
}

// What is this file REALLY? Looks at the first bytes, not at the name or the browser's claim.
export function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

// turn the photo upright (phones store rotation in EXIF), shrink to fit 512×512,
// drop ALL metadata (EXIF can hold the GPS location where the photo was taken), save as WEBP
export function processImage(buf) {
  return sharp(buf, { limitInputPixels: 40_000_000, failOn: "error" })   // 40 MP max: blocks "decompression bombs"
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();                          // sharp writes no metadata unless asked (.keepMetadata)
}

export function saveImage(webp, { owner, kind }) {
  return new Promise((resolve, reject) => {
    const up = images().openUploadStream(`${kind}.webp`, { metadata: { owner: String(owner), kind, contentType: "image/webp" } });
    up.on("error", reject);
    up.on("finish", () => resolve(String(up.id)));
    up.end(webp);
  });
}

export const urlOf = id => `/api/files/${id}`;

// every image this user uploaded (account deleted)
export async function deleteImagesOf(owner) {
  const files = await images().find({ "metadata.owner": String(owner) }, { projection: { _id: 1 } }).toArray();
  for (const f of files) await images().delete(f._id).catch(() => {});
  return files.length;
}
