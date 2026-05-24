'use client';

import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_APP_VERSION } from './VersionGuard';

/**
 * UPDATE_PROMPT (v1.0 - NEXUS SOFT SYNC)
 * Affiche une bannière non-bloquante quand une nouvelle version est détectée.
 */
export function UpdatePrompt() {
  const [show, setShow] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    const checkVersion = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_version')
        .single();

      if (data && data.value !== CURRENT_APP_VERSION) {
        setNewVersion(data.value);
        setShow(true);
      }
    };

    // Check toutes les 15 minutes (Bon compromis Alpha)
    const interval = setInterval(checkVersion, 15 * 60 * 1000);
    checkVersion();

    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-[#0A0A0A] border-2 border-neon-cyan/50 p-4 rounded-[2rem] shadow-[0_0_30px_rgba(0,240,255,0.2)] flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
            <DownloadCloud className="text-neon-cyan animate-bounce" size={20} />
          </div>
          <div className="text-left">
            <p className="text-white font-black uppercase italic text-[10px] tracking-tight">Mise à jour prête</p>
            <p className="text-gray-500 font-bold text-[8px] uppercase tracking-widest">Passage vers V.{newVersion}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button
             onClick={handleRefresh}
             className="bg-neon-cyan text-black px-5 py-2.5 rounded-xl font-black text-[9px] uppercase italic hover:bg-cyan-400 transition-all active:scale-90 flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
           >
             <RefreshCw size={12} strokeWidth={3} /> Synchroniser
           </button>
           <button onClick={() => setShow(false)} className="p-2 text-gray-600 hover:text-white transition-colors">
              <X size={16} />
           </button>
        </div>

      </div>
    </div>
  );
}
