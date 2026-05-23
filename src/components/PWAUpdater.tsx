'use client';

import { useEffect } from 'react';

/**
 * PWA_UPDATER (v1.0)
 * Force un rafraîchissement unique lors du lancement de l'application
 * pour garantir que le coach voit toujours la dernière version déployée.
 */
export function PWAUpdater() {
  useEffect(() => {
    // 1. On vérifie si on est en mode "Application" (PWA / Écran d'accueil)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      // 2. On utilise le sessionStorage pour ne rafraîchir qu'UNE SEULE FOIS par ouverture
      // Le sessionStorage se vide dès que l'application est fermée.
      const hasRefreshed = sessionStorage.getItem('pwa_launch_refresh');

      if (!hasRefreshed) {
        console.log("🚀 Lancement PWA détecté : Rafraîchissement forcé pour mise à jour...");
        sessionStorage.setItem('pwa_launch_refresh', 'true');

        // Petit délai pour laisser le temps au splash screen de passer
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }

    // 3. Gestion automatique du Service Worker pour les mises à jour en arrière-plan
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.update();
        }
      });
    }
  }, []);

  return null;
}
