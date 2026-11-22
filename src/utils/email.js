// "Is this a real email address?" checks used at sign-up.
// checkEmail(email) → "" when OK, otherwise a message for the user.
import dns from "node:dns";
import { z } from "zod";

export const normalizeEmail = e => String(e || "").trim().toLowerCase();

const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "10minutemail.net", "guerrillamail.com", "guerrillamail.net",
  "guerrillamailblock.com", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "yopmail.com",
  "yopmail.net", "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "sharklasers.com",
  "dispostable.com", "maildrop.cc", "mintemail.com", "throwawaymail.com", "fakeinbox.com", "mailnesia.com",
  "mohmal.com", "emailondeck.com", "spamgourmet.com", "tempinbox.com", "burnermail.io", "moakt.com",
  "mailcatch.com", "tempr.email", "discard.email", "inboxkitten.com", "1secmail.com", "emailfake.com",
]);

// common typos → the domain the person probably meant
const TYPOS = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmali.com": "gmail.com", "gnail.com": "gmail.com",
  "gmail.om": "gmail.com", "gmaill.com": "gmail.com", "gmal.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com",
  "naver.co": "naver.com", "naver.con": "naver.com", "nave.com": "naver.com", "navr.com": "naver.com",
  "nate.con": "nate.com", "nate.co": "nate.com", "daum.ner": "daum.net", "daum.nte": "daum.net",
  "hanmail.ner": "hanmail.net", "hanmail.com": "hanmail.net", "icloud.co": "icloud.com", "icoud.com": "icloud.com",
};

const emailSchema = z.email();

// does the domain accept email? (MX record). Slow or broken DNS → allow, so real users aren't blocked.
async function hasMailServer(domain) {
  const timeout = new Promise(ok => setTimeout(() => ok("timeout"), 3000));
  const lookup = dns.promises.resolveMx(domain).then(
    list => list.some(r => r.exchange && r.exchange !== "."),     // "null MX" = domain says it takes no email
    e => (["ENOTFOUND", "ENODATA", "ENODOMAIN"].includes(e.code) ? false : "error"));
  const r = await Promise.race([lookup, timeout]);
  return r !== false;                                               // timeout/error → allow
}

export async function checkEmail(raw) {
  const email = normalizeEmail(raw);
  if (email.length > 120) return "That email is too long.";
  if (!emailSchema.safeParse(email).success) return "Please enter a valid email.";
  const [name, domain] = email.split("@");
  if (TYPOS[domain]) return `Did you mean ${name}@${TYPOS[domain]}?`;
  if (DISPOSABLE.has(domain)) return "Please use your real email, not a temporary inbox.";
  if (!(await hasMailServer(domain))) return `The domain "${domain}" can't receive email. Please check the address.`;
  return "";
}
