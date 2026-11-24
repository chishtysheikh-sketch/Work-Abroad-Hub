// Korean business registration numbers (사업자등록번호), e.g. 123-45-67890.
//   validBizNo(s)  → true when the 10 digits pass the official check digit (catches typos and made-up numbers)
//   ntsStatus(s)   → what the National Tax Service says (needs NTS_API_KEY), or null when not set up / unreachable
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const bizDigits = s => String(s ?? "").replace(/\D/g, "");

export function validBizNo(s) {
  const d = bizDigits(s);
  if (!/^\d{10}$/.test(d) || d === "0000000000") return false;
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
  if (!env.NTS_API_KEY || !validBizNo(d)) return null;
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
