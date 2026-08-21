const RESIDENT_CACHE = "alab-resident-shell-v2";
const RESIDENT_LOGIN = "/resident/login";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(RESIDENT_CACHE)
      .then((cache) => cache.add(RESIDENT_LOGIN))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("alab-resident-shell-") && key !== RESIDENT_CACHE).map((key) => caches.delete(key))))
      .then(() => clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  const requestUrl = new URL(event.request.url);
  const isResidentNavigation = requestUrl.pathname === "/resident"
    || requestUrl.pathname.startsWith("/resident/");
  if (requestUrl.origin !== self.location.origin || !isResidentNavigation) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(RESIDENT_LOGIN)),
  );
});
