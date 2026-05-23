'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * PWA_UPDATER (v1.2 - PERSISTENT SYNC)
 * Gère les mises à jour sans déconnecter l'utilisateur.
 */
export function PWAUpdater() {
  useEffect(() => {
    const handleSync = async () => {
      // 1. Vérification de la session Supabase au lancement
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Gestion intelligente du rafraîchissement (Évite les boucles)
      const lastSync = localStorage.getItem('pwa_last_sync');
      const now = Date.now();
      const twelveHours = 12 * 60 * 60 * 1000; // Rafraîchissement 2 fois par jour

      if (!lastSync || (now - parseInt(lastSync)) > twelveHours) {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        }
        localStorage.setItem('pwa_last_sync', now.toString());
        console.log("📡 TEAM NEXUS : Synchronisation bi-quotidienne effectuée.");
      }
    };

    handleSync();
  }, []);

  return null;
}
