# Performance — BEFORE (P10 step 1)

Measured on 2026-11-24, **before** any P10 change, on a development laptop (Apple M4, 10 cores, 16 GB,
Node v26.13.1, MongoDB 9.0.8, server and test tools on the same machine, `npm run dev`).
These numbers are for comparing before/after on the same machine, not a promise for production.

**Test data** (`node scripts/seed-perf.js`): 30 fake employers × 5 open jobs, plus the real data →
the job board (`postings`) = **31 employers, 151 jobs, 118 KB of JSON** per read (5.6 KB gzipped).
For the index test also `node scripts/seed-perf.js --more`: 600 applications, 60 chats × 50 messages,
1,500 notifications. Everything is marked `perfSeed: true` and removed with `node scripts/seed-perf.js --delete`.

**Rate limit:** the read limit (300 per minute per IP) was raised **only for these local runs** and put back
afterwards (otherwise almost every request would be a 429).

## 1. Health check (no database)

```
npx autocannon -c 50 -d 20 http://localhost:4000/api/health
```
```
Running 20s test @ http://localhost:4000/api/health
50 connections
┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 0 ms │ 1 ms │ 2 ms  │ 2 ms │ 0.89 ms │ 0.56 ms │ 42 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┤
│ Req/Sec   │ 40,959  │ 40,959  │ 44,415  │ 45,119  │ 43,824  │ 1,351.94 │ 40,940  │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┤
│ Bytes/Sec │ 52.7 MB │ 52.7 MB │ 57.1 MB │ 58.1 MB │ 56.4 MB │ 1.74 MB  │ 52.7 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┘
876k requests in 20.01s, 1.13 GB read
```

## 2. Job board query (all postings)

```
npx autocannon -c 50 -d 20 -m POST -H "Content-Type: application/json" -b '{"path":"postings","q":{}}' http://localhost:4000/api/fb/query
```
```
Running 20s test @ http://localhost:4000/api/fb/query
50 connections
┌─────────┬───────┬───────┬───────┬───────┬──────────┬─────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max    │
├─────────┼───────┼───────┼───────┼───────┼──────────┼─────────┼────────┤
│ Latency │ 29 ms │ 35 ms │ 48 ms │ 52 ms │ 36.17 ms │ 6.84 ms │ 311 ms │
└─────────┴───────┴───────┴───────┴───────┴──────────┴─────────┴────────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev   │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Req/Sec   │ 1,187  │ 1,187  │ 1,377  │ 1,391  │ 1,362.3 │ 44.81   │ 1,187  │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Bytes/Sec │ 142 MB │ 142 MB │ 165 MB │ 167 MB │ 163 MB  │ 5.35 MB │ 142 MB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴─────────┴────────┘
27k requests in 20.01s, 3.26 GB read
```
(Bytes/sec is uncompressed: autocannon doesn't ask for gzip. Browsers do.)

## 3. Live updates: 300 visitors watching the job board

`node scripts/socket-load.js 300` — 300 Socket.IO clients subscribe to `postings`; one employer changes a job
10 times (1 s apart); we time how long until **each** client has the new version. Then 5 writes back-to-back.

```
300 clients connected + got the job board in 320 ms
  write  1: 300/300 clients · median 167 ms · p95 282 ms · max 293 ms
  write  2: 300/300 clients · median 163 ms · p95 267 ms · max 279 ms
  write  3: 300/300 clients · median 170 ms · p95 281 ms · max 293 ms
  write  4: 300/300 clients · median 171 ms · p95 280 ms · max 292 ms
  write  5: 300/300 clients · median 175 ms · p95 290 ms · max 302 ms
  write  6: 300/300 clients · median 173 ms · p95 281 ms · max 293 ms
  write  7: 300/300 clients · median 170 ms · p95 279 ms · max 291 ms
  write  8: 300/300 clients · median 170 ms · p95 287 ms · max 297 ms
  write  9: 300/300 clients · median 165 ms · p95 280 ms · max 292 ms
  write 10: 300/300 clients · median 162 ms · p95 266 ms · max 277 ms
All 10 writes: median 169 ms · p95 280 ms · p99 292 ms · max 302 ms · missed 0
Burst of 5 quick writes: each client got 5 updates on average (max 5); 300/300 ended on the last version
```

What it shows:
- every write made the server read **all postings once per visitor**: 300 MongoDB queries and 300 × 118 KB of JSON encoding per change;
- 5 quick writes → **5 full refreshes** for every visitor (1,500 reads), and the writes themselves slowed down to ~200 ms each (1,034 ms for 5).

## 4. Indexes (`node scripts/explain-queries.js`, with the `--more` data)

```
fbdocs: 3724 · notifications: 1501 · test employer 6b047dec81ddae5ce1388063, student 6b047e91e4cc3953568e8892

✅ IXSCAN  users doc by docId (load)            LIMIT ← FETCH ← IXSCAN(col_1_docId_1)  · keys 1 · docs 1 · returned 1
✅ IXSCAN  postings list (job board)            LIMIT ← FETCH ← IXSCAN(col_1_docId_1)  · keys 31 · docs 31 · returned 31
⚠️  in-memory SORT  applications by employerUid          SORT ← FETCH ← IXSCAN(col_1_data.employerUid_1)  · keys 20 · docs 20 · returned 20
⚠️  in-memory SORT  applications by studentUid           SORT ← FETCH ← IXSCAN(col_1_data.studentUid_1)  · keys 13 · docs 13 · returned 13
⚠️  in-memory SORT  chats by member (student)            SORT ← FETCH ← IXSCAN(col_1_data.studentUid_1)  · keys 2 · docs 2 · returned 2
⚠️  in-memory SORT  chats by member (employer)           SORT ← FETCH ← IXSCAN(col_1_data.employerUid_1)  · keys 2 · docs 2 · returned 2
⚠️  in-memory SORT  messages of a chat, ordered by at    SORT ← FETCH ← IXSCAN(col_1_docId_1)  · keys 50 · docs 50 · returned 50
⚠️  in-memory SORT  notifications by user (list)         SORT ← FETCH ← IXSCAN(user_1_createdAt_-1)  · keys 100 · docs 100 · returned 21
✅ IXSCAN  notifications unread count           FETCH ← IXSCAN(user_1_read_1)  · keys 66 · docs 66 · returned 66

6 queries need a better index
```

No query scanned a whole collection, but **6 of 9 sorted in memory**: the index found the right documents but
not in the right order (e.g. notifications read 100 entries to return 21). With more data this gets slower and
uses more memory per request.
