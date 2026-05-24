'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

// ON PASSE EN 203 POUR SORTIR DE LA BOUCLE
export const CURRENT_APP_VERSION = '1.0.203';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const verifyVersion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_version')
        .single();

      if (error || !data) {
        setStatus('ok');
        return;
      }

      const vMaster = data.value;
      setServerVersion(vMaster);

      if (vMaster !== CURRENT_APP_VERSION) {
        setStatus('blocked');

        // --- NETTOYAGE AGRESSIF ---
        setTimeout(async () => {
          // 1. Désinstaller le Service Worker
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) await reg.unregister();
          }
          // 2. Vider tous les caches
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));

          // 3. Rechargement forcé avec paramètre anti-cache
          window.location.href = window.location.pathname + '?v=' + Date.now();
        }, 2000);
      } else {
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
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-cyan animate-pulse">Initialisation_Unité...</p>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-10 text-center">
        <RefreshCw className="text-neon-orange animate-spin mb-6" size={48} />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-neon-orange">Sync_Requise</h2>
        <p className="text-white text-sm font-bold uppercase tracking-widest mt-2">Passage vers V.{serverVersion}</p>
        <p className="text-gray-500 text-[8px] mt-4 uppercase">Nettoyage du cache en cours...</p>
      </div>
    );
  }

  return <>{children}</>;
}
