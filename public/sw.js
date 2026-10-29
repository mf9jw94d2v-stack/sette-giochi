/* Sette Giochi — service worker.
 *
 * - Pages: network first, so a new version is picked up as soon as you are
 *   online; offline, the last copy of the app shell opens instead.
 * - Built files (hashed names, never change), icons and preview images:
 *   cache first.
 * - Fonts from Google: served from cache, refreshed in the background.
 * - Everything else — notably the Supabase API — is never cached here.
 */
const VERSION = "v1";
const SHELL = `sgp-shell-${VERSION}`;
const ASSETS = `sgp-assets-${VERSION}`;
const FONTS = `sgp-fonts-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname; // e.g. /sette-giochi/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.add(SCOPE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k.startsWith("sgp-") && ![SHELL, ASSETS, FONTS].includes(k),
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  ) {
    event.respondWith(staleWhileRevalidate(req, FONTS));
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE))
    return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put(SCOPE, res.clone()));
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r || Response.error())),
    );
    return;
  }
  const path = url.pathname.slice(SCOPE.length);
  if (
    /^(assets|icons|og)\//.test(path) ||
    path === "hero-illustration.png" ||
    path === "hero-illustration.webp" ||
    path === "favicon.svg"
  ) {
    event.respondWith(cacheFirst(req, ASSETS));
  }
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(name)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}
