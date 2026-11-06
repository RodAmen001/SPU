// SPU v4.1 — Service Worker (PWA + mode dégradé hors-ligne, 7.5 du cahier)
// Stratégies : réseau d'abord pour la navigation et les API (contenu frais),
// cache de secours pour la coquille de l'app et le corpus (consultation passive hors-ligne),
// cache d'abord pour les musiques MP3 (fonctionnement hors-ligne complet).
const VERSION = 'spu-v4.1.0';
const COQUILLE = `${VERSION}-shell`;
const DONNEES = `${VERSION}-data`;
const URL_COQUILLE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(COQUILLE).then((cache) => cache.addAll(URL_COQUILLE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Corpus : réseau d'abord, cache ensuite → consultation hors-ligne
  if (url.pathname === '/api/corpus') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copie = res.clone();
          caches.open(DONNEES).then((c) => c.put(request, copie));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || new Response(JSON.stringify({ paraboles: [], familles: [], total: 0, horsLigne: true }), { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // Navigation : réseau d'abord, coquille en secours
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copie = res.clone();
          caches.open(COQUILLE).then((c) => c.put(request, copie));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Ressources statiques et musiques : cache d'abord (musiques disponibles hors-ligne)
  if (/\.(js|css|png|svg|jpg|jpeg|woff2?|webmanifest|mp3)$/.test(url.pathname) || url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.match(request).then(
        (r) =>
          r ||
          fetch(request).then((res) => {
            const copie = res.clone();
            caches.open(COQUILLE).then((c) => c.put(request, copie));
            return res;
          })
      )
    );
  }
});
