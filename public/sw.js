// SPU v4.4 — Service Worker (PWA + mode dégradé hors-ligne, 7.5 du cahier)
//
// Correction majeure v4.4 : l'ancienne stratégie « cache d'abord » sur les
// fichiers JS/CSS gardait l'application figée sur une vieille version dans le
// navigateur (impossible de voir les mises à jour). Désormais :
//   • HTML, JS, CSS, manifest et corpus → RÉSEAU D'ABORD (version toujours à
//     jour), cache en secours si hors-ligne ;
//   • musiques MP3, icônes, polices → CACHE D'ABORD (théâtre sonore complet
//     hors-ligne, ces fichiers ne changent presque jamais) ;
//   • chaque nouvelle version a un nom de cache différent → les caches
//     anciens sont effacés à l'activation.
const VERSION = 'spu-v4.4.0';
const COQUILLE = `${VERSION}-shell`;
const DONNEES = `${VERSION}-data`;
const MEDIA = `${VERSION}-media`;
const URL_COQUILLE = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

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

// Le client peut demander l'activation immédiate d'une mise à jour en attente.
self.addEventListener('message', (event) => {
  if (event.data === 'NOUVELLE_VERSION') self.skipWaiting();
});

// Réseau d'abord, cache en secours (hors-ligne). La réponse fraîche est
// recopiée dans le cache à chaque succès.
function reseauDabord(request, cacheName, secours) {
  return fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const copie = res.clone();
        caches.open(cacheName).then((c) => c.put(request, copie));
      }
      return res;
    })
    .catch(() =>
      caches.match(request).then((r) => r || (secours ? secours() : undefined))
    );
}

// Cache d'abord, réseau en secours (médias hors-ligne).
function cacheDabord(request, cacheName) {
  return caches.match(request).then(
    (r) =>
      r ||
      fetch(request).then((res) => {
        const copie = res.clone();
        caches.open(cacheName).then((c) => c.put(request, copie));
        return res;
      })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ── Navigation (pages HTML) : réseau d'abord, accueil en dernier secours ──
  if (request.mode === 'navigate') {
    event.respondWith(reseauDabord(request, COQUILLE, () => caches.match('/')));
    return;
  }

  // ── Corpus : réseau d'abord, cache ensuite → consultation hors-ligne ──
  if (url.pathname === '/api/corpus') {
    event.respondWith(
      reseauDabord(request, DONNEES, () =>
        new Response(JSON.stringify({ paraboles: [], familles: [], total: 0, horsLigne: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── Musiques et icônes : cache d'abord (théâtre sonore hors-ligne) ──
  if (/\.(mp3|png|svg|jpg|jpeg|ico)$/.test(url.pathname) || url.pathname.startsWith('/audio/')) {
    event.respondWith(cacheDabord(request, MEDIA));
    return;
  }

  // ── Polices : cache d'abord (stables) ──
  if (/\.woff2?$/.test(url.pathname)) {
    event.respondWith(cacheDabord(request, MEDIA));
    return;
  }

  // ── JS, CSS, manifest : RÉSEAU D'ABORD (correctif v4.4 — plus de version figée) ──
  if (
    /\.(js|css|webmanifest)$/.test(url.pathname) ||
    url.pathname.startsWith('/_next/static')
  ) {
    event.respondWith(reseauDabord(request, COQUILLE));
    return;
  }
});
