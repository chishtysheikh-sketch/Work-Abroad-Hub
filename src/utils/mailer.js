// Sends emails with Gmail (or any SMTP server) using nodemailer.
// If SMTP isn't set up in .env, the email is printed in the server console instead,
// so sign-up and everything else still work while developing.
import nodemailer from "nodemailer";
import { env, isProd } from "../config/env.js";
import { logger, shortHash } from "./logger.js";

export const mailEnabled = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transport = mailEnabled ? nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT || 465,
  secure: (env.SMTP_PORT || 465) === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
}) : null;

const FROM = env.MAIL_FROM || (env.SMTP_USER ? `Work Abroad Hub <${env.SMTP_USER}>` : "Work Abroad Hub <no-reply@localhost>");

export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled) {
    // development: print the email so the links can be clicked / copied (one link per line, nothing else on it)
    // production: links hold login / reset tokens → never in the logs; only say that nothing was sent
    if (isProd) { logger.warn({ to: shortHash(to), subject }, "📧 email NOT sent: SMTP is not set up"); return { printed: false }; }
    const links = (text || "").match(/https?:\/\/\S+/g) || [];
    logger.info(`📧 EMAIL (not sent: SMTP is not set up in .env)\n   to: ${to}\n   subject: ${subject}${links.map(l => "\n   link: " + l).join("")}\n`);
    return { printed: true };
  }
  try {
    const info = await transport.sendMail({ from: FROM, to, subject, html, text });
    logger.info({ to: shortHash(to), subject }, "📧 email sent");
    return { sent: true, id: info.messageId };
  } catch (e) {
    // don't crash a sign-up because Gmail is down; the user can press "Resend"
    logger.error({ to: shortHash(to), subject, err: e }, "📧 email FAILED");
    return { failed: true, error: e.message };
  }
}

const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Branded email: title, a few lines of text, one big button, plain-text fallback.
// → { html, text } ready for sendMail
export function emailTemplate({ title, lines = [], button, url, note, footer = "If you didn't ask for this, ignore this email." }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f9;font-family:Arial,Helvetica,sans-serif;color:#14213d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#2563eb;padding:18px 28px;color:#ffffff;font-size:20px;font-weight:bold">Work Abroad Hub</td></tr>
      <tr><td style="padding:28px">
        <h1 style="font-size:22px;margin:0 0 14px">${escHtml(title)}</h1>
        ${lines.map(l => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${escHtml(l)}</p>`).join("")}
        ${url ? `<p style="margin:24px 0"><a href="${escHtml(url)}" style="display:inline-block;background:#ff8a3d;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 26px;border-radius:12px">${escHtml(button || "Open")}</a></p>
        <p style="font-size:12px;color:#6b7490;word-break:break-all">Or copy this link: ${escHtml(url)}</p>` : ""}
        ${note ? `<p style="font-size:13px;color:#6b7490">${escHtml(note)}</p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f8f9fc;font-size:12px;color:#6b7490">${escHtml(footer)}</td></tr>
    </table></td></tr></table></body></html>`;
  const text = [title, "", ...lines, "", url ? `${button || "Open"}: ${url}` : "", note || "", "", footer].join("\n");
  return { html, text };
}
