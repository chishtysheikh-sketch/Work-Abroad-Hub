// P13: installable app (PWA) — the files a browser needs are there, with the right types.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import sharp from "sharp";
import { client } from "./helpers.js";

const read = f => fs.readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8");
const binary = res => res.buffer(true).parse((r, cb) => { const b = []; r.on("data", c => b.push(c)); r.on("end", () => cb(null, Buffer.concat(b))); });

// what the service worker precaches (read from public/sw.js)
function swPlan() {
  const sw = read("sw.js");
  const version = sw.match(/const VERSION = "(\d+)"/)[1];
  const list = sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1];
  const urls = [...list.matchAll(/["`]([^"`]+)["`]/g)].map(m => m[1].replace("${VERSION}", version));
  return { version, urls };
}

describe("installable app (PWA)", () => {
  it("/manifest.webmanifest is served as application/manifest+json and is complete", async () => {
    const r = await (await client()).get("/manifest.webmanifest");
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/^application\/manifest\+json/);
    const m = JSON.parse(r.text);
    expect(m).toMatchObject({ name: "Work Abroad Hub", short_name: "WorkAbroad", start_url: "/?source=pwa", scope: "/",
                              display: "standalone", lang: "en", categories: ["jobs", "education"] });
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.icons.some(i => i.purpose === "maskable")).toBe(true);
  });

  it("every icon in the manifest exists with the size it claims", async () => {
    const a = await client();
    const m = JSON.parse(read("manifest.webmanifest"));
    for (const icon of m.icons.filter(i => i.type === "image/png")) {
      const r = await binary(a.get(icon.src));
      expect(r.status, icon.src).toBe(200);
      expect(r.headers["content-type"]).toBe("image/png");
      const { width, height } = await sharp(r.body).metadata();
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }
    for (const [f, size] of [["/icons/apple-touch-icon.png", 180], ["/icons/favicon-32.png", 32], ["/icons/favicon-16.png", 16]])
      expect((await sharp((await binary(a.get(f))).body).metadata()).width, f).toBe(size);
    const ico = await binary(a.get("/favicon.ico"));
    expect(ico.status).toBe(200);                                     // no more favicon 404
    expect(ico.body.readUInt16LE(2)).toBe(1);                         // ICO header
  });

  it("/sw.js is served as JavaScript and is never cached long (so updates are seen)", async () => {
    const r = await (await client()).get("/sw.js");
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/^(text|application)\/javascript/);
    expect(r.headers["cache-control"]).toBe("no-cache");
  });

  it("the service worker's VERSION matches the ?v= numbers the pages use", () => {
    const { version } = swPlan();
    const index = read("index.html"), script = read("script.js");
    expect(index).toContain(`style.css?v=${version}`);
    expect(index).toContain(`script.js?v=${version}`);
    expect(script).toContain(`wah-fb.js?v=${version}`);
    expect(script).toContain(`firebase-config.js?v=${version}`);
  });

  it("every file the service worker precaches exists", async () => {
    const a = await client();
    for (const url of swPlan().urls) expect((await a.get(url)).status, url).toBe(200);
  });

  // run the real sw.js in a sandbox with a fake browser around it, and watch what it does
  function runSW() {
    const handlers = {}, stored = [];
    const cache = { put: async req => { stored.push(typeof req === "string" ? req : req.url); }, addAll: async () => {} };
    const sandbox = {
      self: { addEventListener: (type, fn) => { handlers[type] = fn; }, location: { origin: "http://localhost:4000" }, clients: { claim: async () => {} }, skipWaiting() {} },
      caches: { open: async () => cache, match: async () => undefined, keys: async () => [], delete: async () => true },
      fetch: async () => ({ ok: true, type: "basic", clone() { return this; } }),
      Request: class { constructor(u) { this.url = u; } }, Response: { error: () => ({}) }, URL, console,
    };
    vm.runInNewContext(read("sw.js"), sandbox);
    // → does the worker answer this request itself, and what ends up in the cache?
    return async (url, { mode = "no-cors", method = "GET" } = {}) => {
      let answer = null; const waits = [];
      handlers.fetch({ request: { url, mode, method }, respondWith: p => { answer = p; }, waitUntil: p => waits.push(p) });
      if (answer) await answer; await Promise.all(waits);
      const r = { handled: !!answer, cached: [...stored] }; stored.length = 0; return r;
    };
  }

  it("the service worker never caches data, live updates, private pages or other sites", async () => {
    const sw = runSW(), O = "http://localhost:4000";
    for (const url of [`${O}/api/fb/query`, `${O}/api/files/${"a".repeat(24)}`, `${O}/socket.io/?EIO=4&transport=polling`,
                       "https://a.tile.openstreetmap.org/12/3/4.png", "https://nominatim.openstreetmap.org/search?q=x",
                       "https://accounts.google.com/gsi/client", "https://fonts.googleapis.com/css2?family=x", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"])
      expect(await sw(url), url).toEqual({ handled: false, cached: [] });
    for (const page of ["/admin.html", "/reset-password.html?token=abc"])
      expect((await sw(O + page, { mode: "navigate" })).cached, page).toEqual([]);     // answered (offline page if needed) but never stored
    expect(await sw(`${O}/style.css?v=1`, { method: "POST" })).toEqual({ handled: false, cached: [] });
  });

  it("the service worker caches our css/js/icons by FULL address and keeps the newest home page", async () => {
    const sw = runSW(), O = "http://localhost:4000";
    expect(await sw(`${O}/style.css?v=123`)).toEqual({ handled: true, cached: [`${O}/style.css?v=123`] });   // ?v= kept
    expect((await sw(`${O}/icons/icon-192.png`)).cached).toEqual([`${O}/icons/icon-192.png`]);
    expect((await sw(`${O}/?source=pwa`, { mode: "navigate" })).cached).toEqual(["/"]);
  });

  it("the CSP allows our own worker and manifest", async () => {
    const csp = (await (await client()).get("/")).headers["content-security-policy"];
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("manifest-src 'self'");
  });

  it("pages link the manifest and icons; offline.html has no inline script", async () => {
    for (const page of ["index.html", "admin.html", "reset-password.html", "offline.html"]) {
      const html = read(page);
      expect(html, page).toContain('<link rel="manifest" href="/manifest.webmanifest">');
      expect(html, page).toContain('rel="apple-touch-icon"');
      expect(html, page).toMatch(/<meta name="theme-color"/);
    }
    const offline = read("offline.html");
    expect([...offline.matchAll(/<script([^>]*)>/g)].every(m => /src=/.test(m[1]))).toBe(true);
    expect(offline).toContain("You're offline");
    expect(offline).toContain("인터넷에 연결되어 있지 않아요");
  });
});
