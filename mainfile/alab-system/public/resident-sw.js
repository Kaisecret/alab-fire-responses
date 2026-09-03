const RESIDENT_CACHE = "alab-resident-shell-v4";
const PRECACHE_URLS = [
  "/resident",
  "/resident/login",
  "/resident/reports",
  "/resident/guide",
  "/resident/notifications",
  "/resident/profile",
  "/resident/report-fire",
  "/resident-manifest.webmanifest",
  "/images/resident-pwa-192.png",
  "/images/resident-pwa-512.png",
  "/images/fire logo.webp",
  "/images/Logo.webp",
  "/images/LOGO FIRE.webp",
  "/images/logo white tint.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(RESIDENT_CACHE)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_URLS.map(async (url) => {
            try {
              const res = await fetch(url, { cache: "reload" });
              if (res.ok) await cache.put(url, res);
            } catch (err) {
              console.warn("Precache failed for", url, err);
            }
          }),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("alab-resident-shell-") && key !== RESIDENT_CACHE)
            .map((key) => caches.delete(key)),
      ))
      .then(() => clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const isResidentNavigation = requestUrl.pathname === "/resident"
    || requestUrl.pathname.startsWith("/resident/");

  // 1. Navigation requests (Opening pages offline)
  if (event.request.mode === "navigate") {
    if (!isResidentNavigation) return;

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(RESIDENT_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: serve matching cached page or resident home/login shell
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = await caches.match("/resident");
          if (fallback) return fallback;
          return caches.match("/resident/login");
        }),
    );
    return;
  }

  // 2. Static Assets (_next/static, images, icons, fonts) for offline rendering
  const isStaticAsset = requestUrl.pathname.startsWith("/_next/static/")
    || requestUrl.pathname.startsWith("/images/")
    || requestUrl.pathname.endsWith(".png")
    || requestUrl.pathname.endsWith(".webp")
    || requestUrl.pathname.endsWith(".svg")
    || requestUrl.pathname.endsWith(".css")
    || requestUrl.pathname.endsWith(".js")
    || requestUrl.pathname === "/resident-manifest.webmanifest";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately, revalidate in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(RESIDENT_CACHE).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => undefined);
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(RESIDENT_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
      }),
    );
  }
});
