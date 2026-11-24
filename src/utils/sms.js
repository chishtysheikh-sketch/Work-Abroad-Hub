// Text messages (SMS) through Solapi (CoolSMS), used for student phone codes.
//   smsMode: "sms"     → really sends (SOLAPI_API_KEY + SOLAPI_API_SECRET + SMS_FROM are set)
//            "console" → development only (SMS_DEV_CONSOLE=true): the text is printed in the server console
//            "off"     → phone codes are switched off; phones are only format-checked (010-XXXX-XXXX)
import crypto from "node:crypto";
import { env, isProd, smsEnabled } from "../config/env.js";
import { logger, shortHash } from "./logger.js";

export const smsMode = smsEnabled ? "sms" : (!isProd && process.env.SMS_DEV_CONSOLE === "true" ? "console" : "off");

export async function sendSms(to, text) {
  const digits = String(to).replace(/\D/g, "");
  if (smsMode === "console") { logger.info(`📱 SMS (not sent: SMS_DEV_CONSOLE)\n   to: ${digits}\n   ${text}\n`); return { printed: true }; }
  if (smsMode !== "sms") return { failed: true, error: "SMS is not set up" };
  const date = new Date().toISOString(), salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", env.SOLAPI_API_SECRET).update(date + salt).digest("hex");
  try {
    const r = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json",
                 Authorization: `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}` },
      body: JSON.stringify({ message: { to: digits, from: env.SMS_FROM, text } }),
    });
    if (!r.ok) throw new Error(`Solapi answered ${r.status}: ${(await r.text()).slice(0, 200)}`);
    logger.info({ to: shortHash(digits) }, "📱 SMS sent");
    return { sent: true };
  } catch (err) {
    logger.error({ to: shortHash(digits), err: err.message }, "📱 SMS FAILED");
    return { failed: true, error: err.message };
  }
}
