# Work-Abroad-Hub
A job seeking platform for international student in South Korea

This repository is the **server** for Work Abroad Hub. It serves the website (in `public/`) and replaces Firebase with our own backend.

**Stack:** Node.js + Express 5 (ES modules), MongoDB (Mongoose), Socket.IO for live updates and chat.

## Start it

1. Create `.env` from the example and fill in real values:
   ```
   cp .env.example .env
   ```
2. Make sure MongoDB is running (`brew services start mongodb-community`).
3. Install and run:
   ```
   cd ~/Documents/work-abroad-hub-server && npm install && npm run dev
   ```
4. Open http://localhost:4000

Never commit `.env`. It holds the real database address and secret key.

## Testing

```
npm test            # run every test once (about 10 seconds)
npm run test:watch  # re-run the tests while you edit
```

The tests start their own **in-memory MongoDB** (`mongodb-memory-server`). They never read `.env` and never touch your real `workabroadhub` database. No emails are sent: the tests read the verification and reset links from a captured list. Google sign-in is faked, so there's no network either. The first run downloads a MongoDB binary (~100 MB), once.

What is covered (`tests/`):

| File | What it checks |
|---|---|
| `auth` | sign-up checks (bad / temporary / misspelled email, weak password), sign up → me → log out, lockout after 5 wrong passwords, “log out everywhere” |
| `email` | verification link works once, expired link fails, unverified employers can't post jobs |
| `password-reset` | same answer for unknown emails, reset link works once, old password and other sessions stop working, change password |
| `google` | the client secret is never sent, friendly message for password login on a Google-only account |
| `rules` | security rules: private profiles, only employers post, minimum wage (hourly / daily / monthly), applications, chats, unsend, admin-hidden jobs |
| `uploads` | real PNG accepted and converted, fake / broken images and files over 5 MB refused, only the owner deletes |
| `notifications` | application → employer, status change → student, 5 messages → one grouped notification, read state |
| `admin` | non-admins get 403, blocking logs out at once and hides open jobs, unblocking restores them |
| `security` | `$` / dotted field names, odd paths, bodies over 1 MB, broken JSON, rate limits, security headers |

GitHub runs the same tests on Node 22 and 24 for every push and pull request (`.github/workflows/test.yml`). See the **Actions** tab.
