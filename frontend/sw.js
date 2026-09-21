/* Cheapflix Nepal service worker — offline-first for static assets.
   API calls always go to network (never cached). Navigations fall back
   to offline.html when the network is unavailable. */
const VERSION = 'cf-v3';
const CORE = ['./offline.html', './css/design-system.css', './config.js', './js/app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) =>
      // addAll is all-or-nothing; add individually so one 404 can't kill install
      Promise.all(CORE.map((u) => c.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never cache API traffic (matches any host path containing /api/).
  if (url.pathname.includes('/api/')) return;
  // Navigations: network first, offline page fallback (relative URL = scope-safe).
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match('offline.html').then((o) => o || caches.match('./offline.html'))))
    );
    return;
  }
  // Static: cache first, refresh in background.
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
