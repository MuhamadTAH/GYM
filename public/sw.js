/**
 * GYM PWA Service Worker
 * Enables full offline functionality on mobile devices:
 * - Caches application shell & navigation pages
 * - Caches styles, scripts, fonts, and exercise catalog assets
 * - Responds instantly from cache when phone has no internet connection
 */

const CACHE_NAME = "gym-offline-v1";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/favicon.ico",
];

// Install Event: Precache core assets & activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn("[SW] Some precache assets failed to load:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up stale caches & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Offline-first routing strategy
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Strategy 1: HTML Page Navigation (Phone browser navigation)
  // Try network first; if offline / no signal, return cached app shell immediately!
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached page or root app shell
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallbackShell = await caches.match("/");
          if (fallbackShell) return fallbackShell;
          return new Response(
            "<!DOCTYPE html><html><body style='background:#09090b;color:#fff;font-family:sans-serif;padding:2rem;text-align:center;'><h2>GYM Offline</h2><p>You are currently offline. Open your saved workout or reconnect.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Strategy 2: Static assets (JS chunks, CSS, fonts, SVG icons)
  // Stale-While-Revalidate: Return cached fast, update in background
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: API & data requests
  // Try network; if offline, return friendly JSON offline status
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            success: false,
            message: "Offline mode active. Your session data is cached locally.",
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // Default: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => cachedResponse)
      );
    })
  );
});
