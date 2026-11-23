# Performance — AFTER (P10)

Same laptop, same data and same tests as [perf-before.md](perf-before.md) (Apple M4, Node v26.13.1, MongoDB 9.0.8,
31 employers / 151 jobs on the job board). The read limit was again raised only for the local runs and put back.

## Before / after in one table

| What we measured | Before | After | |
|---|---:|---:|---|
| Health check, requests per second | 43,824 | 43,370 | same (no database here) |
| **Job board query**, requests per second | 1,362 | **7,090** | **5.2× more** |
| Job board query, typical wait (median) | 35 ms | **6 ms** | |
| Job board query, slowest 1% | 52 ms | **13 ms** | |
| MongoDB reads of the job board per change, 300 visitors watching | 300 | **1** | checked with the MongoDB profiler |
| JSON encodings of the job board per change | 300 | **1** | |
| Live update reaches all 300 visitors — median | 169 ms | 178 ms | includes the new 100 ms batch window (see below) |
| Live update — 95% of visitors had it within | 280 ms | **211 ms** | |
| Live update — last visitor | 302 ms | **235 ms** | |
| Live update, server delivery only (median / 95% / last) | — | 144 / 157 / 160 ms | `--no-decode`, explained below |
| 5 quick changes → updates each visitor receives | 5 | **1** | |
| Time the employer waits for those 5 saves | 1,034 ms | **41 ms** | saves no longer wait behind 300 refreshes |
| 300 visitors connect and get the job board | 320 ms | **172 ms** | |
| Main queries that sort in memory | 6 of 9 | **0 of 9** | |
| Notifications list: entries read to show 21 | 100 | **21** | |

**In simple words:** reading the job board is now about 5 times faster, and when an employer changes a job
the server does the work **once** instead of once per visitor. The employer's save stays fast even with
hundreds of people watching, every visitor still gets every change (0 missed in all runs), and the slowest
visitors get it sooner than before.

**Why the live median didn't drop:** changes now wait up to **100 ms** so that several quick changes become one
refresh (that's what turned 5 refreshes into 1). Without that wait the server delivers in about 40–60 ms
(144 ms median minus the 100 ms window). Also, the load test runs all 300 "browsers" in **one** Node process,
which has to decode 300 copies of the 118 KB list one after another; real browsers each decode their own copy
at the same time. `--no-decode` shows the server's part on its own.

## What changed

1. **Indexes** — compound indexes that match both the filter and the sort, so MongoDB reads exactly the
   documents it returns, already in order:
   `fbdocs {col, data.employerUid, docId}`, `{col, data.studentUid, docId}`, `{col, data.at, docId}` (replacing the
   three shorter ones) and `notifications {user, createdAt, _id}` (replacing `{user, createdAt}`).
   Applied with `node scripts/sync-indexes.js --run`; checked with `node scripts/explain-queries.js`.
2. **Shared job board** (`src/fb/shared.js`) — the public `postings` list is read and JSON-encoded once per change
   and reused by every live subscriber **and** every `POST /api/fb/query`. A change drops the cached copy at once
   (no stale reads: tested 5 × write-then-read); a 5-second safety limit also catches edits made outside the app.
   An employer whose own posting has admin-hidden jobs still gets a personal copy with those jobs.
3. **Live updates** (`src/sockets/fbLive.js`) — `notify()` collects changes per collection for 100 ms, then refreshes
   once. The window starts at the first change and is never extended, so updates are never held back longer than
   100 ms. New browsers receive the shared bytes as a binary attachment (no re-encoding per visitor); older open
   tabs keep getting plain JSON (`--json` test: median 197 ms, p95 241 ms, 0 missed).
4. **Rules cost** — one loader per request (`requestLoader()` in `src/fb/core.js`): the users/chats document the rules
   need is read at most once per request, and the message notification reuses the chat the rules already read.
   `/auth/me`, the profile-save sync and the notifications list now use `.lean()` with only the needed fields.
5. **Browser caching** — `.css/.js/.png/.webp/.woff2/…` requested with `?v=` are cached for 7 days
   (`Cache-Control: public, max-age=604800, immutable`); pages (`.html`) and anything without `?v=` are `no-cache`
   (the browser checks first and gets a quick 304 if nothing changed). The three files that had no `?v=`
   (`firebase-config.js`, `reset-password.js`, `chat-test.js`) now have one. Compression is unchanged.
6. **MongoDB pool** — `maxPoolSize` is 20 (logged at start-up). Any request slower than 500 ms is logged as
   `🐢 slow request <ms> ms: <METHOD> <path> → <status>` (path only, never the query string).

## Raw results

### Health check
```
Running 20s test @ http://localhost:4000/api/health
50 connections
┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬──────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max  │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼──────┤
│ Latency │ 0 ms │ 1 ms │ 2 ms  │ 2 ms │ 1.02 ms │ 0.38 ms │ 9 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴──────┘
┌───────────┬─────────┬─────────┬────────┬─────────┬──────────┬────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%    │ 97.5%   │ Avg      │ Stdev  │ Min     │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼────────┼─────────┤
│ Req/Sec   │ 40,255  │ 40,255  │ 43,487 │ 44,159  │ 43,369.6 │ 772.83 │ 40,228  │
├───────────┼─────────┼─────────┼────────┼─────────┼──────────┼────────┼─────────┤
│ Bytes/Sec │ 51.8 MB │ 51.8 MB │ 56 MB  │ 56.8 MB │ 55.8 MB  │ 1 MB   │ 51.8 MB │
└───────────┴─────────┴─────────┴────────┴─────────┴──────────┴────────┴─────────┘
867k requests in 20.01s, 1.12 GB read
```

### Job board query
```
Running 20s test @ http://localhost:4000/api/fb/query
50 connections
┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 5 ms │ 6 ms │ 12 ms │ 13 ms │ 6.47 ms │ 1.72 ms │ 79 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev   │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Req/Sec   │ 5,983  │ 5,983  │ 7,167  │ 7,287  │ 7,089.6 │ 291.9   │ 5,982  │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Bytes/Sec │ 717 MB │ 717 MB │ 859 MB │ 873 MB │ 850 MB  │ 34.9 MB │ 717 MB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴─────────┴────────┘
142k requests in 20.01s, 17 GB read
```
(Bytes/sec is uncompressed because autocannon doesn't ask for gzip.)

### Live updates — 300 visitors (`node scripts/socket-load.js 300`)
```
mode: shared binary snaps
300 clients connected + got the job board in 172 ms
  write  1: 300/300 clients · median 181 ms · p95 211 ms · max 213 ms
  write  2: 300/300 clients · median 175 ms · p95 205 ms · max 211 ms
  write  3: 300/300 clients · median 179 ms · p95 230 ms · max 235 ms
  write  4: 300/300 clients · median 177 ms · p95 205 ms · max 208 ms
  write  5: 300/300 clients · median 176 ms · p95 208 ms · max 214 ms
  write  6: 300/300 clients · median 178 ms · p95 208 ms · max 212 ms
  write  7: 300/300 clients · median 177 ms · p95 212 ms · max 215 ms
  write  8: 300/300 clients · median 182 ms · p95 210 ms · max 214 ms
  write  9: 300/300 clients · median 177 ms · p95 203 ms · max 206 ms
  write 10: 300/300 clients · median 176 ms · p95 202 ms · max 205 ms
All 10 writes: median 178 ms · p95 211 ms · p99 227 ms · max 235 ms · missed 0
Burst of 5 quick writes: each client got 1 updates on average (max 1); 300/300 ended on the last version
```

Server delivery only (`node scripts/socket-load.js 300 --no-decode`):
```
mode: shared binary snaps, no client-side decoding
300 clients connected + got the job board in 68 ms
  write  1: 300/300 clients · median 146 ms · p95 158 ms · max 159 ms
  write  2: 300/300 clients · median 144 ms · p95 154 ms · max 155 ms
  write  3: 300/300 clients · median 144 ms · p95 156 ms · max 156 ms
  write  4: 300/300 clients · median 148 ms · p95 155 ms · max 155 ms
  write  5: 300/300 clients · median 146 ms · p95 155 ms · max 156 ms
  write  6: 300/300 clients · median 134 ms · p95 144 ms · max 145 ms
  write  7: 300/300 clients · median 143 ms · p95 153 ms · max 154 ms
  write  8: 300/300 clients · median 149 ms · p95 159 ms · max 160 ms
  write  9: 300/300 clients · median 141 ms · p95 152 ms · max 152 ms
  write 10: 300/300 clients · median 149 ms · p95 157 ms · max 158 ms
All 10 writes: median 144 ms · p95 157 ms · p99 159 ms · max 160 ms · missed 0
Burst of 5 quick writes: each client got 1 updates on average (max 1); 300/300 ended on the last version
```

Old clients that still get plain JSON (`node scripts/socket-load.js 300 --json`):
```
mode: plain JSON (old clients)
300 clients connected + got the job board in 221 ms
  write  1: 300/300 clients · median 194 ms · p95 239 ms · max 244 ms
  write  2: 300/300 clients · median 198 ms · p95 242 ms · max 246 ms
  write  3: 300/300 clients · median 196 ms · p95 240 ms · max 244 ms
  write  4: 300/300 clients · median 196 ms · p95 239 ms · max 244 ms
  write  5: 300/300 clients · median 194 ms · p95 238 ms · max 242 ms
  write  6: 300/300 clients · median 201 ms · p95 244 ms · max 249 ms
  write  7: 300/300 clients · median 205 ms · p95 253 ms · max 258 ms
  write  8: 300/300 clients · median 195 ms · p95 238 ms · max 243 ms
  write  9: 300/300 clients · median 196 ms · p95 239 ms · max 244 ms
  write 10: 300/300 clients · median 195 ms · p95 237 ms · max 242 ms
All 10 writes: median 197 ms · p95 241 ms · p99 248 ms · max 258 ms · missed 0
Burst of 5 quick writes: each client got 1 updates on average (max 1); 300/300 ended on the last version
```

### Indexes (`node scripts/explain-queries.js`)
```
fbdocs: 3724 · notifications: 1501 · test employer 6b047dec81ddae5ce1388063, student 6b047e91e4cc3953568e8892

✅ IXSCAN  users doc by docId (load)            LIMIT ← FETCH ← IXSCAN(col_1_docId_1)  · keys 1 · docs 1 · returned 1
✅ IXSCAN  postings list (job board)            LIMIT ← FETCH ← IXSCAN(col_1_docId_1)  · keys 31 · docs 31 · returned 31
✅ IXSCAN  applications by employerUid          LIMIT ← FETCH ← IXSCAN(col_1_data.employerUid_1_docId_1)  · keys 20 · docs 20 · returned 20
✅ IXSCAN  applications by studentUid           LIMIT ← FETCH ← IXSCAN(col_1_data.studentUid_1_docId_1)  · keys 13 · docs 13 · returned 13
✅ IXSCAN  chats by member (student)            LIMIT ← FETCH ← IXSCAN(col_1_data.studentUid_1_docId_1)  · keys 2 · docs 2 · returned 2
✅ IXSCAN  chats by member (employer)           LIMIT ← FETCH ← IXSCAN(col_1_data.employerUid_1_docId_1)  · keys 2 · docs 2 · returned 2
✅ IXSCAN  messages of a chat, ordered by at    LIMIT ← FETCH ← IXSCAN(col_1_data.at_1_docId_1)  · keys 50 · docs 50 · returned 50
✅ IXSCAN  notifications by user (list)         LIMIT ← FETCH ← IXSCAN(user_1_createdAt_-1__id_-1)  · keys 21 · docs 21 · returned 21
✅ IXSCAN  notifications unread count           FETCH ← IXSCAN(user_1_read_1)  · keys 66 · docs 66 · returned 66

all queries use an index without an in-memory sort
```

## How to run the tests again
```
node scripts/seed-perf.js            # 30 fake employers × 5 jobs   (--more: applications, chats, notifications)
node scripts/explain-queries.js      # every main query: index used?
node scripts/socket-load.js 300      # live updates (add --no-decode or --json)
npx autocannon -c 50 -d 20 http://localhost:4000/api/health
node scripts/seed-perf.js --delete   # remove ONLY the perfSeed data
```
Remember: the read limit (300 per minute per IP) turns most autocannon requests into 429s unless it is raised
for the local run — and put back afterwards.
