'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';

export const CURRENT_APP_VERSION = '1.002';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // 1. DÉTECTION DU MODE RACCOURCI (PWA)
  useEffect(() => {
    const checkPWA = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as any).standalone === true;
      setIsStandalone(isPWA);
    };
    checkPWA();
  }, []);

  // 2. FONCTION DE VÉRIFICATION DE VERSION
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

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        setTimeout(async () => {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) await reg.unregister();
          }
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          window.location.reload();
        }, 4000);
      } else {
        setStatus('ok');
      }
    } catch (err) {
      if (!isSilent) setStatus('ok');
    }
  }, []);

  // 3. LOGIQUE DE POLLING (Toutes les 5 minutes)
  useEffect(() => {
    // Premier check au lancement
    verifyVersion();

    // Si on est en mode raccourci, on lance le "Heartbeat" toutes les 5mn
    if (isStandalone) {
      const interval = setInterval(() => {
        console.log("📡 Nexus Heartbeat: Vérification de la version...");
        verifyVersion(true); // mode silent pour ne pas afficher le loader si tout est OK
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [isStandalone, verifyVersion]);

  // RENDU...
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white font-sans">
        <div className="relative">
          <Loader2 className="animate-spin text-neon-cyan opacity-20" size={80} />
          <Loader2 className="animate-spin text-neon-cyan absolute inset-0" size={80} style={{ animationDuration: '3s' }} />
        </div>
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse text-neon-cyan text-center">
          Initialisation_Unité<br/>
          <span className="opacity-40">{isStandalone ? 'Mode_Tactique_Actif' : 'Mode_Navigateur'}</span>
        </p>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-10 text-center font-sans">
        <div className="w-20 h-20 rounded-3xl bg-neon-orange/20 flex items-center justify-center mb-8 border-2 border-neon-orange shadow-[0_0_30px_#FF6B0066]">
          <AlertTriangle className="text-neon-orange" size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Mise à jour_Requise</h2>
        <p className="text-gray-400 text-xs leading-relaxed max-w-xs mb-10 uppercase font-bold tracking-widest opacity-60 text-left">
          Votre version locale est obsolète.<br/>
          Synchro vers <span className="text-white">V.{serverVersion}</span> forcée.
        </p>
        <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-neon-cyan animate-[progress_4s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Petit indicateur discret de mode PWA (uniquement pour toi en Alpha) */}
      {isStandalone && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-none opacity-20">
           <Smartphone size={8} className="text-neon-cyan" />
        </div>
      )}
    </>
  );
}
