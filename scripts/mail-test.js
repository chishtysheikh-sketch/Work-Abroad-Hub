// Sends one test email:  npm run mail:test -- you@example.com
import { sendMail, emailTemplate, mailEnabled } from "../src/utils/mailer.js";
import { env } from "../src/config/env.js";

const to = process.argv[2];
if (!to) { console.log("Usage: npm run mail:test -- you@example.com"); process.exit(1); }
if (!mailEnabled) console.log("ℹ️  SMTP is not set up in .env, so the email will only be printed here.");

const r = await sendMail({ to, subject: "Work Abroad Hub test email", ...emailTemplate({
  title: "It works! 🎉",
  lines: ["This is a test email from your Work Abroad Hub server.", "If you can read this, email sending is set up correctly."],
  button: "Open the site", url: env.APP_URL,
}) });
console.log(r.sent ? "✅ Sent. Check the inbox (and spam)." : r.printed ? "✅ Printed above." : `❌ Failed: ${r.error}`);
process.exit(r.failed ? 1 : 0);
