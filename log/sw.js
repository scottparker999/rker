// Tennis Fitness Tracker service worker: keeps the app shell available offline.
// Bump VERSION whenever app.css, app.js or the fonts change.
const VERSION = "tft-v1";
const SHELL = [
  "/log/",
  "/log/app.css?v=1",
  "/log/app.js?v=1",
  "/log/fonts/barlow-condensed-latin-600-normal.woff2",
  "/log/fonts/barlow-condensed-latin-700-normal.woff2",
  "/log/fonts/ibm-plex-sans-latin-400-normal.woff2",
  "/log/fonts/ibm-plex-sans-latin-500-normal.woff2",
  "/log/fonts/ibm-plex-sans-latin-600-normal.woff2",
  "/log/fonts/ibm-plex-mono-latin-500-normal.woff2",
];
const NAV_TIMEOUT_MS = 2500;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tft-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// A response is safe to cache only if it is our own page or file, not a sign-in redirect.
const cacheable = (res) => res && res.ok && res.type === "basic" && !res.redirected;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/log/")) return;

  if (req.mode === "navigate") {
    event.respondWith(navigate(event));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, req));
});

// Pages: try the network briefly (so an expired sign-in can redirect to the
// login screen), and fall back to the saved copy when offline or slow.
async function navigate(event) {
  const cache = await caches.open(VERSION);
  const network = fetch(event.request).then(async (res) => {
    if (cacheable(res)) await cache.put("/log/", res.clone());
    return res;
  });
  event.waitUntil(network.catch(() => {}));
  const timeout = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {}
  const cached = await cache.match("/log/");
  return cached || network;
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req).then(async (res) => {
    if (cacheable(res)) await cache.put(req, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}
