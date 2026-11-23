// P10: live-update load test.
// N clients (default 300) connect to /fb and subscribe to the whole "postings" collection (like the job board).
// One writer (a throw-away employer account) changes a job 10 times, 1 second apart.
// For every write we measure how long until EACH client has the new version → median / 95th percentile / max.
// Then 5 writes back-to-back: how many updates does each client receive? (debounce check)
//   node scripts/socket-load.js [clients=300] [url=http://localhost:4000] [--json]
//   --json      = behave like an old client (plain JSON snaps instead of the shared binary ones)
//   --no-decode = don't JSON.parse the 300 copies (all clients share ONE Node process here, while real browsers
//                 each decode their own copy in parallel) → measures what the server delivers
// The writer account is deleted at the end (it is also marked perfSeed, in case the script is stopped).
import { io } from "socket.io-client";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const JSON_MODE = process.argv.includes("--json"), NO_DECODE = process.argv.includes("--no-decode");
const N = Number(args[0]) || 300;
const BASE = args[1] || "http://localhost:4000";
const WRITES = 10, GAP_MS = 1000, BURST = 5;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)] : NaN; };

// ---- writer account ----
let cookie = "";
async function api(path, body, method = "POST") {
  const r = await fetch(BASE + "/api/fb" + path, { method, headers: { "Content-Type": "application/json", cookie }, body: body && JSON.stringify(body) });
  for (const c of r.headers.getSetCookie?.() || []) if (c.startsWith("wah_token=")) cookie = c.split(";")[0];
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → ${r.status} ${JSON.stringify(d)}`);
  return d;
}
await mongoose.connect(env.MONGODB_URI);
const email = `perf.writer.${Date.now()}@gmail.com`;
const uid = (await api("/auth/signup", { email, password: "Perf-Writer-9x!Q" })).user.uid;
await mongoose.connection.db.collection("users").updateOne({ email }, { $set: { emailVerified: true, perfSeed: true } });
await sleep(50);
await api("/write", { op: "set", path: `users/${uid}`, data: { role: "employer", profile: { contact: "Writer" } } });
const job = v => ({ id: "perfw", title: `Load test job v${v}`, status: "open", payType: "hourly", pay: 11000, city: "Seoul", createdAt: Date.now() });
await api("/write", { op: "set", path: `postings/${uid}`, data: { company: { name: "Perf Writer Co" }, jobs: [job(0)] } });

// ---- clients ----
const clients = [];
let connectMs = 0;
{
  const t0 = Date.now();
  await Promise.all(Array.from({ length: N }, (_, i) => new Promise((resolve, reject) => {
    const c = { i, seen: new Map(), snaps: 0, ready: false };
    c.sock = io(BASE + "/fb", { transports: ["websocket"], forceNew: true, reconnection: false, timeout: 20000 });
    c.sock.on("connect_error", reject);
    c.sock.on("connect", () => c.sock.emit("sub", { id: "board", kind: "query", path: "postings", q: {}, ...(JSON_MODE ? {} : { bin: true }) }));
    c.sock.on("snap", m => {
      const now = Date.now();
      c.snaps++;
      let v;
      if (m.bin && NO_DECODE) {                    // find "Load test job v<N>" in the bytes, no parsing
        const b = Buffer.from(m.bin), at = b.indexOf("Load test job v");
        v = at < 0 ? NaN : parseInt(b.toString("utf8", at + 15, at + 22), 10);
      } else {
        if (m.bin) m.docs = JSON.parse(Buffer.from(m.bin).toString("utf8"));     // same decoding as the browser
        const mine = m.docs && m.docs.find(d => d.id === uid);
        v = mine && mine.data.jobs[0] && Number(String(mine.data.jobs[0].title).split(" v")[1]);
      }
      if (Number.isFinite(v) && !c.seen.has(v)) c.seen.set(v, now);
      if (!c.ready) { c.ready = true; resolve(); }
    });
    clients.push(c);
  })));
  connectMs = Date.now() - t0;
}
console.log(`mode: ${JSON_MODE ? "plain JSON (old clients)" : "shared binary snaps"}${NO_DECODE ? ", no client-side decoding" : ""}`);
console.log(`${N} clients connected + got the job board in ${connectMs} ms`);
await sleep(500);

// ---- 10 spaced writes ----
const lat = [], perWrite = [];
for (let v = 1; v <= WRITES; v++) {
  const t0 = Date.now();
  await api("/write", { op: "set", path: `postings/${uid}`, data: { company: { name: "Perf Writer Co" }, jobs: [job(v)] } });
  await sleep(GAP_MS);
  const got = clients.map(c => c.seen.has(v) ? c.seen.get(v) - t0 : null);
  const ok = got.filter(x => x != null);
  lat.push(...ok);
  perWrite.push({ v, received: ok.length, median: pct(ok, 50), p95: pct(ok, 95), max: Math.max(...ok) });
}
for (const w of perWrite) console.log(`  write ${String(w.v).padStart(2)}: ${w.received}/${N} clients · median ${w.median} ms · p95 ${w.p95} ms · max ${w.max} ms`);
const missed = WRITES * N - lat.length;

// ---- burst: 5 writes back-to-back ----
await sleep(300);
clients.forEach(c => { c.snaps = 0; });
const tb = Date.now();
for (let k = 1; k <= BURST; k++) await api("/write", { op: "set", path: `postings/${uid}`, data: { company: { name: "Perf Writer Co" }, jobs: [job(100 + k)] } });
const burstWriteMs = Date.now() - tb;
await sleep(1500);
const burstSnaps = clients.map(c => c.snaps);
const finalOk = clients.filter(c => c.seen.has(100 + BURST)).length;

const result = {
  clients: N, writes: WRITES, samples: lat.length, missed,
  median: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: Math.max(...lat),
  connectMs, burst: { writes: BURST, writeMs: burstWriteMs, updatesPerClientAvg: +(burstSnaps.reduce((a, b) => a + b, 0) / N).toFixed(2),
    updatesPerClientMax: Math.max(...burstSnaps), clientsWithFinalVersion: finalOk },
};
console.log("\nRESULT " + JSON.stringify(result));
console.log(`\nAll ${WRITES} writes: median ${result.median} ms · p95 ${result.p95} ms · p99 ${result.p99} ms · max ${result.max} ms · missed ${missed}`);
console.log(`Burst of ${BURST} quick writes: each client got ${result.burst.updatesPerClientAvg} updates on average (max ${result.burst.updatesPerClientMax}); ${finalOk}/${N} ended on the last version`);

// ---- clean up ----
clients.forEach(c => c.sock.close());
await api("/auth/me", null, "DELETE").catch(e => console.log("cleanup:", e.message));
await mongoose.disconnect();
process.exit(0);
