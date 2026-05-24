'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, RefreshCw } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_APP_VERSION } from '@/components/VersionGuard';

/**
 * TOP_BAR (v10.1 - INTERACTIVE SYNC)
 * Correction : Le badge MAJ déclenche le rechargement forcé.
 */
export function TopBar() {
  const { teamInfo, theme } = useTeam();
  const [isOutdated, setIsOutdated] = useState(false);

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-neon-orange' : 'text-neon-cyan';
  const accentBorder = isPro ? 'border-neon-orange/30' : 'border-neon-cyan/30';

  useEffect(() => {
    const checkVer = async () => {
      const { data } = await supabase.from('app_config').select('value').eq('key', 'min_version').single();
      if (data && data.value.trim() !== CURRENT_APP_VERSION) {
        setIsOutdated(true);
      }
    };
    checkVer();
    const interval = setInterval(checkVer, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleForceUpdate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Nettoyage radical et rechargement
    if (typeof window !== 'undefined') {
      console.log("🚀 Lancement de la synchronisation forcée...");
      localStorage.setItem(`nexus_sync_v${CURRENT_APP_VERSION}`, Date.now().toString());

      setTimeout(async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) await reg.unregister();
        }
        window.location.replace(window.location.pathname + '?v=' + Date.now());
      }, 500);
    }
  };

  return (
    <header className="flex-shrink-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-3 z-40 sticky top-0 overflow-hidden">
      <div className="grid grid-cols-[60px_1fr_60px] gap-3 items-center">

        {/* LOGO CLUB */}
        <div className="flex flex-col gap-1.5">
          <Link href="/profile" className="block">
            <div className={`aspect-square w-full rounded-xl overflow-hidden border-2 flex items-center justify-center bg-black/40 ${accentBorder} shadow-lg`}>
              {teamInfo?.clubLogo ? (
                <img src={teamInfo.clubLogo} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <ShieldCheck size={24} className={accentColor} />
              )}
            </div>
          </Link>
          <div className={`py-1 rounded-md border text-center ${isPro ? 'bg-neon-orange/10' : 'bg-neon-cyan/10'} ${accentBorder}`}>
             <p className={`text-[8px] font-black uppercase tracking-tighter ${accentColor}`}>{teamInfo?.category || 'U13'}</p>
          </div>
        </div>

        {/* CENTRE : INFOS & BADGE MAJ */}
        <div className="flex flex-col gap-1 justify-center">
          <Link href="/profile" className="text-center cursor-pointer">
            <GlitchText
              text={teamInfo?.clubName || 'UNITÉ_NEXUS'}
              className={`text-sm font-black italic tracking-tighter uppercase ${accentColor} leading-none line-clamp-1`}
            />
            <div className="py-1 border-y border-white/5 mt-1">
              <p className={`text-lg font-black uppercase italic tracking-widest ${accentColor} leading-none`}>
                {teamInfo?.coachName || 'COACH'}
              </p>
            </div>
          </Link>

          <div className="text-center flex flex-col items-center gap-1 mt-1">
             {isOutdated ? (
               <button
                 onClick={handleForceUpdate}
                 className="px-3 py-1 rounded-full bg-red-600 border border-red-400 text-white animate-pulse shadow-[0_0_20px_#ef4444] text-[8px] font-black tracking-widest flex items-center gap-2 active:scale-90 transition-all"
               >
                 <RefreshCw size={10} className="animate-spin" />
                 MAJ DISPONIBLE
               </button>
             ) : (
               <div className={`px-3 py-0.5 rounded-full border ${isPro ? 'bg-orange-600/20 border-orange-400/40 text-orange-400' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[8px] font-black tracking-widest`}>
                 V.{CURRENT_APP_VERSION}
               </div>
             )}
          </div>
        </div>

        {/* PHOTO PROFIL */}
        <div className="flex flex-col items-center">
          <Link href="/profile" className="block w-full">
            <div className={`aspect-square w-full rounded-xl border-2 transition-all active:scale-90 border-[#39FF14] shadow-[0_0_15px_#39FF1444] bg-black/40 relative overflow-hidden`}>
              {teamInfo?.coachPhoto ? (
                <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className={accentColor} />
              )}
              <div className={`absolute bottom-0 inset-x-0 py-0.5 text-center text-[5px] font-black uppercase bg-black/60 text-white`}>
                COACH
              </div>
            </div>
          </Link>
          <p className="text-[5px] font-bold text-gray-600 uppercase mt-1 tracking-tighter">Profil</p>
        </div>

      </div>
    </header>
  );
}
