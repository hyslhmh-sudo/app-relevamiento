/* Service worker · App de relevamiento de edificios v0
   Guarda la app en el dispositivo para que abra sin señal. */
const CACHE = 'relevamiento-v0-7';
const BASE = ['./', './index.html', './manifest.json', './logo-hysl.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // los envíos al script no se tocan
  const url = new URL(req.url);
  if (url.hostname.includes('script.google')) return;
  // Primero la red (para tener siempre la última versión); si no hay señal, lo guardado.
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
