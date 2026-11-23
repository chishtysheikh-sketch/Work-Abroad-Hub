import crypto from "node:crypto";
import FbDoc from "../models/FbDoc.js";
import { canRead, canWrite, NEED_VERIFY } from "./rules.js";

// ---------- small helpers ----------
export class FbError extends Error {
  constructor(code, message, status = 400) { super(message || code); this.code = code; this.status = status; }
}

const SEG = /^[A-Za-z0-9_\-]{1,128}$/;
const FIELD = /^[A-Za-z0-9_]{1,60}$/;

// "chats/abc/messages/xyz" → { col: "chats/abc/messages", id: "xyz" }
export function parsePath(path, kind) {
  const parts = String(path || "").split("/");
  if (parts.length > 4 || !parts.every(s => SEG.test(s))) throw new FbError("invalid-argument", "Bad path");
  if (kind === "doc") {
    if (parts.length % 2) throw new FbError("invalid-argument", "A document path needs an even number of parts");
    return { col: parts.slice(0, -1).join("/"), id: parts.at(-1) };
  }
  if (parts.length % 2 === 0) throw new FbError("invalid-argument", "A collection path needs an odd number of parts");
  return { col: parts.join("/") };
}

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

// Blocks keys like "$where" or "a.b" (they could be used to attack MongoDB)
export function checkData(v, depth = 0) {
  if (depth > 20) throw new FbError("invalid-argument", "Data is nested too deep");
  if (Array.isArray(v)) return v.forEach(x => checkData(x, depth + 1));
  if (!isObj(v)) return;
  for (const k of Object.keys(v)) {
    if (!k || k.length > 200 || k.startsWith("$") || k.includes(".")) throw new FbError("invalid-argument", `Bad field name: ${k.slice(0, 30)}`);
    checkData(v[k], depth + 1);
  }
}

export function deepMerge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v;
  return out;
}

// { readBy: { u1: 5 } } → { "data.readBy.u1": 5 }  (so two people can update at the same time safely)
export function flatten(obj, old, prefix = "data.", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    if (isObj(v) && Object.keys(v).length && isObj(old?.[k])) flatten(v, old[k], `${prefix}${k}.`, out);
    else out[prefix + k] = v;
  }
  return out;
}

export async function load(col, id) {
  const d = await FbDoc.findOne({ col, docId: id }).select("data").lean();
  return d ? d.data : null;
}

// P9: jobs an admin hid are only visible to their own employer (in their dashboard)
export function visible(col, id, data, uid) {
  if (col !== "postings" || !data || !Array.isArray(data.jobs) || uid === id) return data;
  if (!data.jobs.some(j => j && j.hiddenByAdmin)) return data;
  return { ...data, jobs: data.jobs.filter(j => !(j && j.hiddenByAdmin)) };
}

// P9: admin-only fields. Whatever the website sends, the stored value is kept.
//   users/<uid> and postings/<uid>: company.verified ("✓ Verified employer")
// (jobs[].hiddenByAdmin is checked in rules.js: changing it is refused)
function keepAdminFields(col, old, next, data) {
  if (col !== "users" && col !== "postings") return;
  const was = old?.company?.verified;
  if (data !== next && isObj(data?.company)) delete data.company.verified;     // merge / update: don't write it
  if (was === undefined) { if (isObj(next?.company)) delete next.company.verified; }
  else {
    next.company = { ...(isObj(next.company) ? next.company : {}), verified: was };
    if (data !== next && "company" in data && !isObj(data.company)) data.company = { verified: was };
  }
}

// ---------- read ----------
export async function readDoc(path, uid) {
  const { col, id } = parsePath(path, "doc");
  const data = await load(col, id);
  if (!(await canRead(col, id, data, uid, load))) throw new FbError("permission-denied", "Missing or insufficient permissions.", 403);
  return { id, exists: !!data, data: visible(col, id, data, uid) || null };
}

const OPS = { "==": "$eq", "!=": "$ne", "<": "$lt", "<=": "$lte", ">": "$gt", ">=": "$gte", "array-contains": "$eq" };

export async function runQuery(path, q = {}, uid) {
  const { col } = parsePath(path, "col");
  const filter = { col };
  for (const [field, op, value] of (q.where || []).slice(0, 5)) {
    if (!FIELD.test(field) || !OPS[op]) throw new FbError("invalid-argument", "Bad query");
    if (value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new FbError("invalid-argument", "Bad query value");
    filter[`data.${field}`] = { ...(filter[`data.${field}`] || {}), [OPS[op]]: value };
  }
  const sort = {};
  for (const [field, dir] of (q.orderBy || []).slice(0, 3)) {
    if (!FIELD.test(field)) throw new FbError("invalid-argument", "Bad orderBy");
    sort[`data.${field}`] = dir === "desc" ? -1 : 1;
  }
  sort.docId = 1;
  const limit = Math.min(Math.max(Number(q.limit) || 500, 1), 500);
  const rows = await FbDoc.find(filter).sort(sort).limit(limit).select("docId data").lean();
  const cache = {}, docs = [];
  for (const r of rows) if (await canRead(col, r.docId, r.data, uid, load, cache)) docs.push({ id: r.docId, data: visible(col, r.docId, r.data, uid) });
  return docs;
}

// ---------- write ----------
// op: "set" (merge or not) | "update" | "delete" | "add"
export async function writeDoc({ op, path, data, merge }, uid, ctx = {}) {
  if (op !== "delete") {
    if (!isObj(data)) throw new FbError("invalid-argument", "Data must be an object");
    checkData(data);
  }
  let col, id;
  if (op === "add") { ({ col } = parsePath(path, "col")); id = crypto.randomBytes(10).toString("hex"); }
  else ({ col, id } = parsePath(path, "doc"));

  const old = op === "add" ? null : await load(col, id);
  let next;
  if (op === "delete") next = null;
  else if (op === "update") {
    if (!old) throw new FbError("not-found", "No document to update.", 404);
    next = deepMerge(old, data);
  } else next = merge && old ? deepMerge(old, data) : data;

  const kind = op === "delete" ? "delete" : old ? "update" : "create";
  if (kind === "delete" && !old) return { id, col };
  if (kind !== "delete") keepAdminFields(col, old, next, data);
  const why = await canWrite(kind, col, id, old, next, uid, load, ctx);
  if (why) throw new FbError(why === NEED_VERIFY ? "failed-precondition" : "permission-denied", why, 403);

  if (kind === "delete") await FbDoc.deleteOne({ col, docId: id });
  else if (kind === "create") {
    try { await FbDoc.create({ col, docId: id, data: next }); }
    catch (e) {                                   // someone created it a moment earlier → update it instead
      if (e.code !== 11000) throw e;
      await FbDoc.updateOne({ col, docId: id }, { $set: flatten(data, await load(col, id)) });
    }
  } else if ((op === "set" && merge) || op === "update") {
    const sets = flatten(data, old);
    if (Object.keys(sets).length) await FbDoc.updateOne({ col, docId: id }, { $set: sets });
  } else await FbDoc.updateOne({ col, docId: id }, { $set: { data: next } });

  return { id, col, data: next, old, kind };     // old + kind: P8 notifications need them
}
