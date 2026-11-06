// Enregistrement du Service Worker (PWA installable — 7.5 du cahier)
'use client';

import { useEffect } from 'react';

export function EnregistreurSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const installer = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* PWA best-effort */
      });
    };
    if (document.readyState === 'complete') installer();
    else window.addEventListener('load', installer);
    return () => window.removeEventListener('load', installer);
  }, []);
  return null;
}
