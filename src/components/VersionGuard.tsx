'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';

// ON PASSE EN 206 AVEC TON SYSTÈME DE DISJONCTEUR UNIQUE
export const CURRENT_APP_VERSION = '1.0.208';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked' | 'error'>('loading');
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const verifyVersion = useCallback(async () => {
    try {
      // 1. DISJONCTEUR ANTI-BOUCLE (Ton idée optimisée)
      const reloadKey = `nexus_sync_v${CURRENT_APP_VERSION}`;
      const lastAttempt = localStorage.getItem(reloadKey);
      const now = Date.now();

      // Si on a déjà essayé de recharger il y a moins de 30 secondes -> On arrête la boucle
      if (lastAttempt && (now - parseInt(lastAttempt)) < 30000) {
        console.warn('🛑 Boucle évitée. Chargement forcé de la version actuelle.');
        setStatus('ok');
        return;
      }

      // 2. CHECK SUPABASE
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_version')
        .single();

      if (error || !data) {
        setStatus('ok');
        return;
      }

      const vMaster = data.value.trim();
      setServerVersion(vMaster);

      if (vMaster !== CURRENT_APP_VERSION) {
        // 3. MISMATCH : On prépare le rechargement
        setStatus('blocked');
        localStorage.setItem(reloadKey, now.toString()); // On marque la tentative

        setTimeout(async () => {
          // Nettoyage radical avant reload
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
          }

          // Reload avec cache-buster
          window.location.replace(window.location.pathname + '?update=' + now);
        }, 2000);
      } else {
        // 4. OK : On nettoie le disjoncteur
        localStorage.removeItem(reloadKey);
        setStatus('ok');
      }
    } catch (err) {
      setStatus('ok');
    }
  }, []);

  useEffect(() => {
    verifyVersion();
  }, [verifyVersion]);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white">
        <ShieldCheck className="text-neon-cyan animate-pulse mb-8" size={80} />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-cyan">Vérification_Version_V.{CURRENT_APP_VERSION}</p>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-10 text-center">
        <RefreshCw className="text-neon-orange animate-spin mb-6" size={48} />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-neon-orange">MISE À JOUR</h2>
        <p className="text-white text-sm font-bold uppercase tracking-widest mt-2">Passage vers V.{serverVersion}</p>
        <p className="text-gray-600 text-[8px] mt-6 uppercase tracking-widest">Initialisation des nouveaux protocoles...</p>
      </div>
    );
  }

  return <>{children}</>;
}
