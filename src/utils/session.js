// Is this login cookie still valid?
// A token stops working when the user pressed "log out everywhere" / changed password
// (tokenVersion went up) or when the account was blocked or deleted.
// To avoid asking MongoDB on every request, answers are cached for 30 seconds.
import User from "../models/User.js";
import { readToken } from "../middleware/auth.js";

const TTL = 30 * 1000;
const cache = new Map();          // uid → { v, blocked, gone, at }

async function lookup(uid) {
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < TTL) return hit;
  let u = null;
  try { u = await User.findById(uid).select("tokenVersion blocked").lean(); } catch { /* bad id */ }
  const entry = { v: u ? (u.tokenVersion || 0) : -1, blocked: !!(u && u.blocked), gone: !u, at: Date.now() };
  cache.set(uid, entry);
  if (cache.size > 5000) cache.delete(cache.keys().next().value);   // keep memory small
  return entry;
}

// raw cookie value → { id, role, v } or null
export async function checkToken(token) {
  const t = readToken(token);
  if (!t || !t.id) return null;
  const s = await lookup(t.id);
  if (s.gone || s.blocked || s.v !== (t.v || 0)) return null;
  return t;
}

// call after tokenVersion / blocked changes or the account is deleted
export function forgetSession(uid) { cache.delete(String(uid)); }
