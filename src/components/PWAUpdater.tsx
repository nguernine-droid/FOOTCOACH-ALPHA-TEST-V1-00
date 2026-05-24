'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * PWA_UPDATER (v2.0 - MASTER VERSION LOCK)
 * Force le rafraîchissement si la version locale est obsolète.
 */
export const CURRENT_APP_VERSION = '1.001'; // <-- On incrémente ici à chaque commit

export function PWAUpdater() {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // 1. On demande la version Maître à Supabase
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'min_version')
          .single();

        if (error || !data) return;

        const masterVersion = data.value;

        // 2. COMPARAISON
        if (masterVersion !== CURRENT_APP_VERSION) {
          console.log(`🚀 MISE À JOUR DÉTECTÉE : ${CURRENT_APP_VERSION} -> ${masterVersion}`);
          setIsUpdating(true);

          // 3. NETTOYAGE RADICAL
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.unregister(); // On désinstalle le vieux service worker
            }
          }

          // On vide tout le cache navigateur
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));

          // On attend un peu pour l'effet visuel
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        console.error("Version Check Error:", err);
      }
    };

    checkVersion();
  }, []);

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-8" />
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Mise à jour_Critique</h2>
        <p className="text-[10px] font-mono text-neon-cyan uppercase tracking-[0.4em] mt-4 animate-pulse">
          Synchronisation V.{CURRENT_APP_VERSION}...
        </p>
      </div>
    );
  }

  return null;
}
