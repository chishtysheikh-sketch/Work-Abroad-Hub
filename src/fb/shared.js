// P10: shared results for PUBLIC queries (the whole "postings" collection = the job board).
// Everyone sees the same list, so it is read from MongoDB and JSON-encoded ONCE, then reused by
// every live subscriber (sockets/fbLive.js) and every POST /api/fb/query until something changes.
//   · changed(col) is called on every write (from notify) → the cached result is dropped at once
//   · a 5 s safety limit also catches changes made outside the app (mongosh, scripts)
//   · an employer whose own posting has admin-hidden jobs gets a personal copy (only they may see those jobs)
import { queryRows, visible, isPublicCol } from "./core.js";

const MAX_AGE_MS = 5000;
const gen = new Map();         // col → change counter
const cache = new Map();       // query key → { gen, at, promise }

export { isPublicCol };

export function changed(col) { gen.set(col, (gen.get(col) || 0) + 1); }

// → { docs, json, bin, personal: Map(ownerUid → full data) }
export function sharedResult(path, col, q) {
  const key = path + "\n" + JSON.stringify(q || {}), g = gen.get(col) || 0, now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.gen === g && now - hit.at < MAX_AGE_MS) return hit.promise;
  const promise = (async () => {
    const { rows } = await queryRows(path, q);                // public: canRead is true for everyone
    const docs = [], personal = new Map();
    for (const r of rows) {
      const pub = visible(col, r.docId, r.data, null);
      docs.push({ id: r.docId, data: pub });
      if (pub !== r.data) personal.set(r.docId, r.data);
    }
    const json = JSON.stringify(docs);
    return { docs, json, bin: Buffer.from(json), personal };
  })();
  cache.set(key, { gen: g, at: now, promise });
  promise.catch(() => { if (cache.get(key)?.promise === promise) cache.delete(key); });
  if (cache.size > 100) cache.delete(cache.keys().next().value);   // odd queries can't fill memory
  return promise;
}

// the docs one viewer may see (null = same as everybody)
export function personalDocs(r, uid) {
  return uid && r.personal.has(uid) ? r.docs.map(d => d.id === uid ? { id: uid, data: r.personal.get(uid) } : d) : null;
}
