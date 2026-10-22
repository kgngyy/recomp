/* Service Worker: recomp-v7 — офлайн без вмешательства в синхронизацию */
const CACHE = 'recomp-v7';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/style.css',
  './js/app.js', './js/lazy.js', './js/ux-autotune.js',
  './content/templates.html',
  './content/macro1.html', './content/macro2.html', './content/macro3.html',
  './content/macro4.html', './content/macro5.html', './content/macro6.html',
  './content/macro7.html', './content/macro8.html', './content/macro9.html',
  './content/macro10.html', './content/macro11.html', './content/macro12.html',
  './content/ref-cooking.html', './content/ref-exercises.html', './content/ref-pool.html',
  './content/ref-care.html', './content/ref-beauty.html',
  './icon-192.png', './icon-512.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
function cacheable(r) { return r && r.status === 200 && r.type === 'basic'; }
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (resp) {
        if (cacheable(resp)) { var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put('./index.html', cp); }); }
        return resp;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (resp) {
        if (cacheable(resp)) { var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return resp;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
