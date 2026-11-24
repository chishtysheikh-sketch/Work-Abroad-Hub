// P13: service worker — makes the site installable and gives a friendly offline experience.
//
//   pages (navigation)          network first → saved app shell "/" → /offline.html
//   our own css / js / images   stale-while-revalidate (answer from the cache at once, refresh it in the background)
//   NEVER cached                /api/ (data, uploaded photos), /socket.io/ (live updates), admin + password-reset
//                               pages, and everything from other sites (Google, map tiles, address lookup, fonts)
//
// Files are cached by their FULL address, ?v= included, so a new ?v= number is simply a new file.
// VERSION must equal the ?v= number in index.html (tests/pwa.test.js checks it). Changing it
// installs a new worker → the site shows "A new version is available · Reload".
const VERSION = "1796000002";
const SHELL = `wah-shell-v${VERSION}`;
const RUNTIME = `wah-runtime-v${VERSION}`;

const PRECACHE = [
  "/", "/offline.html", "/offline.js", "/manifest.webmanifest", "/favicon.ico",
  `/style.css?v=${VERSION}`, `/script.js?v=${VERSION}`, `/wah-fb.js?v=${VERSION}`, `/firebase-config.js?v=${VERSION}`,
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png", "/icons/favicon-16.png", "/icons/logo.svg",
];

// things that must always come fresh from the server (or not at all)
const NEVER = [/^\/api\//, /^\/socket\.io\//, /^\/admin(\.html|\.js|\.css)?$/, /^\/reset-password(\.html|\.js)?$/, /^\/sw\.js$/];
const never = url => NEVER.some(re => re.test(url.pathname));
const STATIC = /\.(css|js|mjs|png|webp|jpe?g|gif|svg|ico|woff2?|webmanifest)$/i;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // cache: "reload" → really ask the server (not the browser's HTTP cache)
    await cache.addAll(PRECACHE.map(u => new Request(u, { cache: "reload" })));
  })());
  // no skipWaiting() here: a NEW version waits until the user presses "Reload" (see the message below)
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys())
      if (name.startsWith("wah-") && name !== SHELL && name !== RUNTIME) await caches.delete(name);
    await self.clients.claim();
  })());
});

// the page asks the waiting worker to take over (after the user pressed "Reload")
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // other sites: the browser handles them, never cached

  if (req.mode === "navigate") {
    event.respondWith(never(url) ? pageNoCache(req) : pageNetworkFirst(req, url));
    return;
  }
  if (never(url) || !STATIC.test(url.pathname)) return;      // API, sockets, anything unusual: straight to the network
  event.respondWith(staleWhileRevalidate(event, req));
});

// admin / reset pages: only from the network; offline → the offline page
async function pageNoCache(req) {
  try { return await fetch(req); }
  catch { return (await caches.match("/offline.html")) || Response.error(); }
}

async function pageNetworkFirst(req, url) {
  try {
    const res = await fetch(req);
    // keep the newest app shell for offline use (the page itself holds no personal data)
    if (res.ok && res.type === "basic" && (url.pathname === "/" || url.pathname === "/index.html")) {
      const cache = await caches.open(SHELL);
      await cache.put("/", res.clone());
    }
    return res;
  } catch {
    return (await caches.match("/")) || (await caches.match("/offline.html")) || Response.error();
  }
}

async function staleWhileRevalidate(event, req) {
  const cached = await caches.match(req);                     // exact URL, ?v= included
  const refresh = fetch(req).then(async res => {
    if (res.ok && res.type === "basic") {
      const cache = await caches.open(RUNTIME);
      await cache.put(req, res.clone());
    }
    return res;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));                 // update quietly for next time
    return cached;
  }
  return refresh.catch(() => Response.error());
}
