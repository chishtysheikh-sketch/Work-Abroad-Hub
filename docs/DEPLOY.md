# Deploying Work Abroad Hub (Render + MongoDB Atlas)

Render runs the Node server. It keeps Socket.IO (live chat and notifications) working, which Vercel can't do.
MongoDB Atlas holds the database. Render gives the site HTTPS automatically.

## 1. Database: MongoDB Atlas
1. In Atlas, create a cluster. Pick **AWS / Seoul (ap-northeast-2)**, or Singapore, close to Render's region.
2. **Database Access → Add user**: a username and a long generated password, with the role *Read and write to any database*.
3. **Network Access → Add IP address → 0.0.0.0/0**. Render's addresses change, so the strong password is what protects the database.
4. **Connect → Drivers** gives a connection string. Put a database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/workabroadhub?retryWrites=true&w=majority`

## 2. Email: Gmail App Password (required)
Production refuses to start without working email, because nobody could confirm their address.
1. Turn on 2-Step Verification for the Gmail account at <https://myaccount.google.com/security>.
2. Create an app password at <https://myaccount.google.com/apppasswords> (16 letters).
3. Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<the gmail address>`, `SMTP_PASS=<the 16 letters>`,
   and `MAIL_FROM="Work Abroad Hub <the gmail address>"`.
4. Test it locally first: put the values in `.env` and run `npm run mail:test`.

Gmail sends about 500 emails a day. For more, use a provider such as Brevo, Resend or Amazon SES. Any SMTP server works.

## 3. Render
1. Go to <https://dashboard.render.com> → **New → Blueprint** → connect GitHub and pick **Work-Abroad-Hub**.
2. Render reads `render.yaml` and asks for each value marked `sync: false`:
   - `MONGODB_URI`: from step 1
   - `APP_URL`: `https://work-abroad-hub.onrender.com` (the name Render shows; change it later if you add a domain)
   - `SMTP_*`, `MAIL_FROM`: from step 2
   - The optional values can stay empty. Empty means that feature is off.
3. **Apply**. The first build takes about 3 minutes. After that, `https://<name>.onrender.com/api/health` returns `{"ok":true,…}`.
4. Every push to `main` deploys again, once the GitHub tests have passed.

The plan in `render.yaml` is **Starter**, which is always on. **Free** works too, but it sleeps after 15 idle minutes and the next visit waits about a minute.

## 4. After the first deploy
- **Google sign-in**: in Google Cloud → Credentials → your OAuth client, add `https://<name>.onrender.com` under *Authorized JavaScript origins*.
- **Make yourself admin**: sign up on the live site, then in Atlas → Browse Collections → `users`, set `isAdmin: true` on your account.
- **Backups**: GitHub → Settings → Secrets and variables → Actions → add `PROD_MONGODB_URI` (same as `MONGODB_URI`)
  and `BACKUP_PASSPHRASE` (long and random; keep a copy in a password manager). The daily **Backup** workflow then keeps
  encrypted copies for 30 days. To make one now, open Actions → Backup → *Run workflow*.
- **Uptime monitor**: add a free check at <https://uptimerobot.com> on `https://<name>.onrender.com/api/health` (every 5 minutes, alert by email).
- **Error alerts**: create a Slack or Discord incoming webhook and set `ALERT_WEBHOOK_URL` on Render.

## Restoring a backup
```
# download the artifact from GitHub Actions → unzip → then:
BACKUP_PASSPHRASE=… node scripts/restore.js wah-….wahb                     # dry run: shows what's inside
BACKUP_PASSPHRASE=… RESTORE_MONGODB_URI=<test db> node scripts/restore.js wah-….wahb --run --drop
```
Restore into a test database first. Restore into the real one only when you mean to.

## Every January
Add the new minimum wage to `MIN_WAGE_BY_YEAR` in `src/utils/pay.js` **and** `public/script.js`, then push.
Until you do, the server log warns on every start and the latest known rate is used.
