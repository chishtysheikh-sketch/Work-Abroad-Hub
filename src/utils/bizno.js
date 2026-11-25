// Korean business registration numbers (사업자등록번호), e.g. 123-45-67890.
//   normalizeBiz(s) → "123-45-67890" when s is exactly 10 digits (spaces, dashes, dots and full-width
//                     characters allowed around them), otherwise null. No check-digit test.
//   validBizNo(s)   → normalizeBiz(s) !== null
//   bizCheckDigitOk(s) → the official check digit matches (shown to admins as a hint only, never blocks)
//   ntsStatus(s)    → what the National Tax Service says (needs NTS_API_KEY), or null when not set up / unreachable
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const bizDigits = s => String(s ?? "").replace(/\D/g, "");

export function normalizeBiz(s) {
  if (typeof s !== "string" && typeof s !== "number") return null;
  const t = String(s).normalize("NFKC").trim();          // full-width ０-９ / － → normal digits / dash
  if (!/^[\d\s.\-‐-―−]+$/.test(t)) return null;            // only digits and separators: letters → invalid
  const d = t.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : null;
}
export const validBizNo = s => normalizeBiz(s) !== null;

export function bizCheckDigitOk(s) {
  const d = bizDigits(normalizeBiz(s));
  if (d.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * w[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]);
}

const cache = new Map();          // digits → { at, value }   (6 hours)
const STATUS = { "01": "active", "02": "suspended", "03": "closed" };

// → { status: "active" | "suspended" | "closed" | "unknown", label, taxType } or null
export async function ntsStatus(s) {
  const d = bizDigits(s);
  if (!env.NTS_API_KEY || d.length !== 10) return null;
  const hit = cache.get(d);
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit.value;
  try {
    const r = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(env.NTS_API_KEY)}&returnType=JSON`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ b_no: [d] }), signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`NTS answered ${r.status}`);
    const row = (await r.json())?.data?.[0] || {};
    const value = { status: STATUS[row.b_stt_cd] || "unknown", label: row.b_stt || row.tax_type || "", taxType: row.tax_type || "" };
    cache.set(d, { at: Date.now(), value });
    return value;
  } catch (err) {
    logger.warn({ err: err.message }, "NTS business-number lookup failed");
    return null;
  }
}
