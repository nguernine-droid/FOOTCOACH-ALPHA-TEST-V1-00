'use client';

import { useEffect } from 'react';

/**
 * PWA_UPDATER (v1.1 - AGGRESSIVE SYNC)
 * Force la détection de mise à jour au lancement et gère le rafraîchissement.
 */
export function PWAUpdater() {
  useEffect(() => {
    // 1. Vérification si on est en mode PWA (Standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;

    // 2. Gestion de la mise à jour forcée du Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          // Force la recherche d'une nouvelle version sur le serveur
          registration.update();

          // Si un nouveau SW attend, on le force à prendre le contrôle
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });

      // Écoute les changements de contrôle (quand le nouveau SW s'active)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log("🔄 Nouvelle version détectée et activée !");
        window.location.reload();
      });
    }

    // 3. Rafraîchissement au lancement Standalone
    if (isStandalone) {
      const lastRefresh = sessionStorage.getItem('pwa_last_refresh');
      const now = Date.now();

      // Si dernier rafraîchissement il y a plus de 30 secondes (pour éviter les boucles)
      if (!lastRefresh || (now - parseInt(lastRefresh)) > 30000) {
        sessionStorage.setItem('pwa_last_refresh', now.toString());
        console.log("🚀 Sync PWA : Hard reload au lancement.");

        // On utilise un paramètre aléatoire pour bypasser le cache CDN/Vercel
        const url = new URL(window.location.href);
        url.searchParams.set('v', now.toString());
        window.location.replace(url.toString());
      }
    }
  }, []);

  return null;
}
