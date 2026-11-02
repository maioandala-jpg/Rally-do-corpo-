/* Rally & Voo do Corpo · service worker (offline-first)
   Troque VERSION a cada atualização do jogo para os celulares baixarem a versão nova. */
const VERSION = 'v2';
const CACHE = 'corpo-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/og-image.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('corpo-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Abrir o jogo: responde na hora do cache e atualiza em segundo plano quando há internet.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(cached => {
        const net = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res;
        }).catch(() => null);
        if (cached) { e.waitUntil(net); return cached; }
        return net.then(res => res || new Response('Sem internet e o jogo ainda não foi baixado.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      })
    );
    return;
  }

  // Demais arquivos: cache primeiro; se não houver, busca e guarda.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
