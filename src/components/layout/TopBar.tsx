'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Bell } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_APP_VERSION } from '@/components/VersionGuard';

/**
 * TOP_BAR (v10.0 - SMART SYNC)
 * Version avec badge clignotant si mise à jour dispo.
 * Suppression de l'appui long sur l'avatar.
 */
export function TopBar() {
  const { teamInfo, theme } = useTeam();
  const [isOutdated, setIsOutdated] = useState(false);

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-neon-orange' : 'text-neon-cyan';
  const accentBorder = isPro ? 'border-neon-orange/30' : 'border-neon-cyan/30';

  // Vérification silencieuse de la version pour le clignotement
  useEffect(() => {
    const checkVer = async () => {
      const { data } = await supabase.from('app_config').select('value').eq('key', 'min_version').single();
      if (data && data.value !== CURRENT_APP_VERSION) {
        setIsOutdated(true);
      }
    };
    checkVer();
    const interval = setInterval(checkVer, 60000); // Check toutes les minutes
    return () => clearInterval(interval);
  }, []);

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

        {/* CENTRE : INFOS & VERSION */}
        <Link href="/profile" className="flex flex-col gap-1 justify-center cursor-pointer">
          <div className="text-center">
            <GlitchText
              text={teamInfo?.clubName || 'UNITÉ_NEXUS'}
              className={`text-sm font-black italic tracking-tighter uppercase ${accentColor} leading-none line-clamp-1`}
            />
          </div>
          <div className="py-1 border-y border-white/5 text-center">
            <p className={`text-lg font-black uppercase italic tracking-widest ${accentColor} leading-none`}>
              {teamInfo?.coachName || 'COACH'}
            </p>
          </div>
          <div className="text-center flex flex-col items-center gap-1">
             {/* BADGE VERSION CLIGNOTANT SI MAJ */}
             <div className={`px-3 py-0.5 rounded-full border ${
               isOutdated
               ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-[0_0_15px_#ef4444]'
               : (isPro ? 'bg-orange-600/20 border-orange-400/40 text-orange-400' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan')
             } text-[8px] font-black tracking-widest transition-all duration-500`}>
                {isOutdated ? 'MAJ DISPONIBLE' : `V.${CURRENT_APP_VERSION}`}
             </div>
          </div>
        </Link>

        {/* PHOTO PROFIL (SIMPLE CLIC) */}
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
