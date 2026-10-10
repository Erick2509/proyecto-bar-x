const CACHE = 'proyecto-x-v29';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./pages.js','./store.js','./auth.js',
  './utils.js','./components.js','./firebase-config.js','./manifest.webmanifest',
  './logo-proyecto-x.png','./icon-192.png','./icon-512.png','./favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Firebase/CDN siguen su flujo normal.

  event.respondWith((async () => {
    try {
      // Preferir la versión desplegada. no-store evita quedarse pegado a un HTML/JS viejo.
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
