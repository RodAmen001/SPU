// Enregistrement du Service Worker (PWA installable — 7.5 du cahier)
// v4.4 : gestion active des mises à jour — quand une nouvelle version du SPU
// prend le contrôle de la page, elle est rechargée une seule fois
// automatiquement. Fini les versions figées dans le cache du navigateur.
'use client';

import { useEffect } from 'react';

let rechargeDeja = false;

export function EnregistreurSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const ilYAvaitUnControleur = !!navigator.serviceWorker.controller;

    const installer = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* PWA best-effort */
      });

      // Une nouvelle version vient de prendre le contrôle → rechargement unique.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (ilYAvaitUnControleur && !rechargeDeja) {
          rechargeDeja = true;
          window.location.reload();
        }
      });

      // Un service worker en attente (installé mais pas encore actif) → on
      // demande son activation immédiate pour ne jamais rester sur l'ancien.
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg.waiting && navigator.serviceWorker.controller) {
            reg.waiting.postMessage('NOUVELLE_VERSION');
          }
        })
        .catch(() => {});
    };

    if (document.readyState === 'complete') installer();
    else window.addEventListener('load', installer);
    return () => window.removeEventListener('load', installer);
  }, []);
  return null;
}
