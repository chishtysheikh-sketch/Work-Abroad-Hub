# Security: how Work Abroad Hub keeps accounts safe

Simple notes on what the server does to protect users, and what you must do when you run it for real.

## Passwords
- Passwords are **hashed with bcrypt (cost 12)**. A hash is one-way: it **cannot be decoded** back into the password, not even by us. At login, bcrypt hashes what was typed and compares the two hashes.
- If an old account has a weaker hash (cost below 12), it is upgraded automatically the next time that person logs in.
- New passwords must be **8–72 characters**, with **at least one letter and one number**. They must not contain the part of the email before `@`, and must not be on our list of very common passwords. (Rule: `src/utils/password.js`.)
- Passwords and hashes are **never written to the logs**.

## Logging in
- **5 wrong passwords in a row → the account is locked for 15 minutes.** A correct login resets the counter.
- There is also a limit **per IP address**: 20 login/sign-up tries per 15 minutes.
- Blocked accounts (`blocked: true` on the user) cannot log in, and their open sessions stop working.

## Login cookie (`wah_token`)
- **httpOnly**: page scripts can't read it, so a malicious script can't steal it.
- **sameSite=lax**: other websites can't use it to send forms on your behalf.
- **secure** in production: it is only sent over **HTTPS**.
- It lasts 7 days.
- **"Log out of all devices"** (`POST /api/fb/auth/logout-all`) raises the account's `tokenVersion`, so every old cookie stops working within 30 seconds at most.

## HTTPS is required in production
Without HTTPS, passwords and cookies travel as plain text and anyone on the same Wi-Fi could read them. Always run behind HTTPS (Render, Railway etc. do this for you) and set `NODE_ENV=production`.

## Rate limits (per IP)
| What | Limit |
|---|---|
| Sign-up / login | 20 per 15 minutes |
| Saving data (`/api/fb/write`) | 120 per minute |
| Reading data (`/api/fb/doc`, `/api/fb/query`) | 300 per minute |
| CSP reports | 60 per minute |

Over the limit, the server answers `429 Too many requests, slow down.`

## Other protections
- **Security rules** (`src/fb/rules.js`) are checked on every read and write: only you can read your profile, only employers post jobs, only students apply, minimum wage is enforced, and so on.
- **Content-Security-Policy**: the browser may only load scripts, styles, fonts, images and connections from our own site and a short list of trusted places (OpenStreetMap, unpkg, Google Fonts, Google sign-in). Injected scripts from anywhere else are blocked.
- **Size limits**: 1 MB for website data, 300 KB elsewhere.
- In production, error messages never include internal details or stack traces.
- Field names starting with `$` or containing `.` are rejected (they could be used to attack MongoDB).

## How to rotate `JWT_SECRET`
Do this if the secret may have leaked (shown in a screenshot, committed by mistake) and every 3 months.
1. Make a new secret:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Put it in `.env` as `JWT_SECRET=...` (on the hosting service: in its environment settings).
3. Restart the server.

**Everyone is logged out once**. That is expected: old cookies were signed with the old secret.
The server refuses to start if `JWT_SECRET` is shorter than 32 characters.

## Real email, real phone, real business
- **Email ownership**: after sign-up a 6-digit code (30 minutes, 5 wrong tries) and a link (24 hours) are emailed.
  Until one is used, the server refuses applying, publishing jobs and chatting. Only hashes of the code and link are stored.
- **Sign-up email check**: misspelled domains, temporary-inbox services and domains without a mail server are refused, live on the form and again on the server.
- **Profile email** on a student profile is always the confirmed login email (the server overwrites anything else).
- **Phones**: students must give a Korean mobile number (`010-XXXX-XXXX`). With SMS set up (`SOLAPI_*`), they must also confirm it with a texted code before applying.
- **Business numbers** must pass the official check digit. With `NTS_API_KEY`, admins can ask the National Tax Service whether the business is active.

## Backups
`scripts/backup.js` writes every collection into one file encrypted with AES-256-GCM (key from `BACKUP_PASSPHRASE` via scrypt).
Without the passphrase the file can't be read, so keep it in a password manager. The daily GitHub workflow keeps 30 days of backups.

## Alerts
With `ALERT_WEBHOOK_URL` set, every error log line is also posted to Slack or Discord, throttled to the same message
once per 10 minutes and 20 alerts an hour. Log messages never contain passwords, codes or raw emails.
