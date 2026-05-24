'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

// ==========================================
// VERSION MAITRE : À INC RÉMENTER ICI
// ==========================================
export const CURRENT_APP_VERSION = '1.0.202';

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
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => window.location.reload(), 3000);
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
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="relative mb-16">
          <div className="absolute inset-0 rounded-full border-8 border-neon-cyan opacity-10 animate-ping" />
          <ShieldCheck className="text-neon-cyan animate-pulse" size={100} />
        </div>

        {/* VERSION ULTRA LISIBLE POUR ALPHA */}
        <div className="bg-white/5 border-2 border-white/10 rounded-[3rem] p-10 w-full max-w-sm text-center space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <p className="text-[12px] font-black text-neon-cyan uppercase tracking-[0.6em] mb-2">Nexus_Protocol_Active</p>
          <div className="py-4 border-y border-white/5">
             <p className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
               V.{CURRENT_APP_VERSION}
             </p>
          </div>
          <div className="flex items-center justify-center gap-3 mt-6">
             <Loader2 size={20} className="animate-spin text-neon-cyan" />
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vérification de l'unité...</span>
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
        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2 text-neon-orange">MISE À JOUR</h2>
        <p className="text-white text-lg font-black uppercase mb-10">Passage vers V.{serverVersion}</p>
        <div className="w-full max-w-[240px] h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-neon-orange animate-[width_3s_ease-in-out_infinite]" style={{width: '100%'}} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
