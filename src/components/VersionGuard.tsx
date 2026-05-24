'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertTriangle, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';

// VERSION AUTOMATIQUE (Incrémentée par le système à chaque déploiement)
export const CURRENT_APP_VERSION = '1.0.103'; // <-- Je l'augmente ici manuellement pour ce push

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                 (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);
  }, []);

  const verifyVersion = useCallback(async (isSilent = false) => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_version')
        .single();

      if (error || !data) {
        if (!isSilent) setStatus('ok');
        return;
      }

      const vMaster = data.value;
      setServerVersion(vMaster);

      if (vMaster !== CURRENT_APP_VERSION) {
        setStatus('blocked');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);

        setTimeout(async () => {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) await reg.unregister();
          }
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          window.location.reload();
        }, 3000);
      } else {
        setStatus('ok');
      }
    } catch (err) {
      if (!isSilent) setStatus('ok');
    }
  }, []);

  useEffect(() => {
    verifyVersion();
    if (isStandalone) {
      const interval = setInterval(() => verifyVersion(true), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isStandalone, verifyVersion]);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="relative mb-12">
          <div className="absolute inset-0 rounded-full border-4 border-neon-cyan opacity-20 animate-ping" />
          <ShieldCheck className="text-neon-cyan animate-pulse" size={80} />
        </div>

        {/* VERSION TRÈS LISIBLE */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-xs text-center space-y-2 shadow-2xl">
          <p className="text-[10px] font-black text-neon-cyan uppercase tracking-[0.5em]">Nexus_Core_Sync</p>
          <p className="text-3xl font-black italic tracking-tighter text-white">V.{CURRENT_APP_VERSION}</p>
          <div className="flex items-center justify-center gap-2 mt-4">
             <Loader2 size={14} className="animate-spin text-neon-cyan" />
             <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Analyse des protocoles...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center text-white p-10 text-center">
        <div className="w-24 h-24 rounded-[2rem] bg-neon-orange/20 flex items-center justify-center mb-8 border-2 border-neon-orange shadow-[0_0_40px_#FF6B0044]">
          <RefreshCw className="text-neon-orange animate-spin" size={48} />
        </div>
        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2 text-neon-orange">Sync_Requise</h2>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-10 opacity-60 leading-relaxed">
          Nouvelle version disponible : <span className="text-white">V.{serverVersion}</span><br/>
          Mise à jour du noyau en cours...
        </p>
        <div className="w-full max-w-[240px] h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-neon-orange animate-[width_3s_ease-in-out_infinite]" style={{width: '100%'}} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
