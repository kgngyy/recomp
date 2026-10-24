/* Service Worker: офлайн-кэш. При изменении файлов проекта увеличьте номер в CACHE. */
const CACHE = 'recomp-v13';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/style.css', './js/app.js', './js/lazy.js', './js/ui.js',
  ...Array.from({ length: 12 }, (_, i) => `./content/macro${i + 1}.html`),
  './content/ref-cooking.html', './content/ref-exercises.html', './content/ref-pool.html',
  './content/ref-care.html', './content/ref-beauty.html',
  './img/makeup.webp', './img/hair.webp', './img/styling.webp',
  './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

const cacheable = (r) => r && r.status === 200 && r.type === 'basic';

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Страница: сначала сеть, при отсутствии связи — кэш
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (cacheable(resp)) { const cp = resp.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); }
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Остальное: из кэша, в фоне обновляем
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((resp) => {
          if (cacheable(resp)) { const cp = resp.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
          return resp;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
