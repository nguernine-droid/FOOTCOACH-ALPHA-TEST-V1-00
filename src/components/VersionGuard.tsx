'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertTriangle, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

// ON PASSE EN 220 POUR LE DÉPLOIEMENT RÉUSSI DU HUB
export const CURRENT_APP_VERSION = '1.0.220';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked' | 'syncing'>('loading');
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

      const vMaster = data.value.trim();
      setServerVersion(vMaster);

      if (vMaster !== CURRENT_APP_VERSION) {
        // On vérifie si on n'a pas déjà essayé trop récemment
        const reloadKey = `nexus_sync_v${CURRENT_APP_VERSION}`;
        const lastAttempt = localStorage.getItem(reloadKey);
        const now = Date.now();

        if (lastAttempt && (now - parseInt(lastAttempt)) < 15000) {
          setStatus('ok');
          return;
        }

        setStatus('blocked');
      } else {
        setStatus('ok');
      }
    } catch (err) {
      setStatus('ok');
    }
  }, []);

  const handleUpdate = async () => {
    setStatus('syncing');
    const now = Date.now();
    localStorage.setItem(`nexus_sync_v${CURRENT_APP_VERSION}`, now.toString());

    // Nettoyage profond
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    setTimeout(() => {
      window.location.replace(window.location.pathname + '?update=' + now);
    }, 2000);
  };

  useEffect(() => {
    verifyVersion();
  }, [verifyVersion]);

  // CHARGEMENT INITIAL
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white">
        <ShieldCheck className="text-neon-cyan animate-pulse mb-8" size={60} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neon-cyan opacity-40">Verification_V.{CURRENT_APP_VERSION}</p>
      </div>
    );
  }

  // ÉCRAN DE BLOCAGE (DÉTECTION MAJ)
  if (status === 'blocked' || status === 'syncing') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-10 text-center">
        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 border-2 transition-all duration-1000 ${status === 'syncing' ? 'border-[#39FF14] bg-[#39FF14]/10' : 'border-neon-orange bg-neon-orange/10 shadow-[0_0_30px_#FF6B0044]'}`}>
          {status === 'syncing' ? <CheckCircle2 className="text-[#39FF14] animate-bounce" size={48} /> : <RefreshCw className="text-neon-orange animate-spin" size={48} />}
        </div>

        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
          {status === 'syncing' ? 'Synchronisation...' : 'Mise à jour_Détectée'}
        </h2>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-xs space-y-4 mt-4">
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-gray-500">Version Actuelle</span>
              <span className="text-white">V.{CURRENT_APP_VERSION}</span>
           </div>
           <div className="h-px bg-white/5 w-full" />
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neon-cyan">
              <span>Version Cible</span>
              <span>V.{serverVersion}</span>
           </div>
        </div>

        {status === 'blocked' && (
          <button
            onClick={handleUpdate}
            className="mt-12 bg-neon-cyan text-black px-10 py-5 rounded-2xl font-black uppercase italic text-sm shadow-[0_0_20px_#00F0FF66] active:scale-90 transition-all"
          >
            Installer Maintenant
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
