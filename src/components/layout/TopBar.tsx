'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, RefreshCw } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_APP_VERSION } from '@/lib/config/version';

export function TopBar() {
  const { teamInfo, theme } = useTeam();
  const [isOutdated, setIsOutdated] = useState(false);
  const [targetVersion, setTargetVersion] = useState('');

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-orange-600' : 'text-neon-orange';
  const accentBorder = isPro ? 'border-orange-200' : 'border-neon-orange/30';

  useEffect(() => {
    const checkVer = async () => {
      const { data } = await supabase.from('app_config').select('value').eq('key', 'min_version').single();
      if (data) {
        const vMaster = data.value.trim();
        setTargetVersion(vMaster);
        setIsOutdated(vMaster !== CURRENT_APP_VERSION);
      }
    };
    checkVer();
    const interval = setInterval(checkVer, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    window.location.href = window.location.pathname + '?v=' + Date.now();
  };

  return (
    <header className={`flex-shrink-0 backdrop-blur-xl border-b p-3 z-40 sticky top-0 overflow-hidden ${isPro ? 'bg-white/90 border-gray-100' : 'bg-[#15171C]/90 border-white/[0.06]'}`}>
      <div className="grid grid-cols-[60px_1fr_60px] gap-3 items-center">

        {/* LOGO CLUB */}
        <div className="flex flex-col gap-1.5">
          <Link href="/profile" className="block">
            <div className={`aspect-square w-full rounded-2xl overflow-hidden border flex items-center justify-center shadow-sm ${isPro ? 'bg-orange-50' : 'bg-white/5'} ${accentBorder}`}>
              {teamInfo?.clubLogo ? (
                <img src={teamInfo.clubLogo} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <ShieldCheck size={24} className={accentColor} />
              )}
            </div>
          </Link>
          <div className={`py-1 rounded-lg border text-center ${isPro ? 'bg-orange-50' : 'bg-neon-orange/10'} ${accentBorder}`}>
             <p className={`text-[8px] font-bold uppercase tracking-tight ${accentColor}`}>{teamInfo?.category || 'U13'}</p>
          </div>
        </div>

        {/* CENTRE : INFOS & VERSION */}
        <div className="flex flex-col gap-1 justify-center">
          <div className="text-center">
            <GlitchText
              text={teamInfo?.clubName || 'Mon Club'}
              className={`text-sm font-bold tracking-tight uppercase ${accentColor} leading-none line-clamp-1`}
            />
            <div className={`py-1 border-y mt-1 text-center ${isPro ? 'border-gray-100' : 'border-white/[0.06]'}`}>
              <p className={`text-lg font-black uppercase tracking-tight leading-none ${isPro ? 'text-gray-900' : 'text-[#F5F3EF]'}`}>
                {teamInfo?.coachName || 'Coach'}
              </p>
            </div>
          </div>

          <div className="text-center flex flex-col items-center gap-1 mt-1">
             {isOutdated ? (
               <div
                 onClick={handleManualSync}
                 className="flex flex-col items-center gap-0.5 cursor-pointer"
               >
                 <div className="px-3 py-1 rounded-full bg-rose-500 text-white shadow-sm text-[8px] font-bold tracking-wide flex items-center gap-1">
                    <RefreshCw size={9} /> MAJ DISPONIBLE (V.{targetVersion})
                 </div>
                 <p className="text-[8px] text-gray-400 font-semibold uppercase tracking-wide">Version installée : {CURRENT_APP_VERSION}</p>
               </div>
             ) : (
               <div className="px-4 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold tracking-wide flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 V.{CURRENT_APP_VERSION} (À JOUR)
               </div>
             )}
          </div>
        </div>

        {/* PHOTO PROFIL */}
        <div className="flex flex-col items-center">
          <Link href="/profile" className="block w-full">
            <div className={`aspect-square w-full rounded-2xl border-2 transition-all active:scale-90 border-emerald-400/60 shadow-sm ${isPro ? 'bg-orange-50' : 'bg-white/5'} relative overflow-hidden flex items-center justify-center`}>
              {teamInfo?.coachPhoto ? (
                <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className={accentColor} />
              )}
            </div>
          </Link>
          <p className={`text-[8px] font-bold uppercase mt-1 tracking-tight ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>Profil</p>
        </div>

      </div>
    </header>
  );
}
