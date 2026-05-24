'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, RefreshCw } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { CURRENT_APP_VERSION } from '@/components/VersionGuard';

export function TopBar() {
  const { teamInfo, theme } = useTeam();
  const [isOutdated, setIsOutdated] = useState(false);
  const [targetVersion, setTargetVersion] = useState('');

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-neon-orange' : 'text-neon-cyan';
  const accentBorder = isPro ? 'border-neon-orange/30' : 'border-neon-cyan/30';

  useEffect(() => {
    const checkVer = async () => {
      const { data } = await supabase.from('app_config').select('value').eq('key', 'min_version').single();
      if (data) {
        const vMaster = data.value.trim();
        setTargetVersion(vMaster);
        if (vMaster !== CURRENT_APP_VERSION) {
          setIsOutdated(true);
        } else {
          setIsOutdated(false);
        }
      }
    };
    checkVer();
    const interval = setInterval(checkVer, 30000);
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
        <div className="flex flex-col gap-1 justify-center">
          <Link href="/profile" className="text-center">
            <GlitchText
              text={teamInfo?.clubName || 'UNITÉ_NEXUS'}
              className={`text-sm font-black italic tracking-tighter uppercase ${accentColor} leading-none line-clamp-1`}
            />
            <div className="py-1 border-y border-white/5 mt-1 text-center">
              <p className={`text-lg font-black uppercase italic tracking-widest ${accentColor} leading-none`}>
                {teamInfo?.coachName || 'COACH'}
              </p>
            </div>
          </Link>

          <div className="text-center flex flex-col items-center gap-1 mt-1">
             {isOutdated ? (
               <div
                 onClick={() => window.location.reload()}
                 className="flex flex-col items-center gap-0.5"
               >
                 <div className="px-3 py-1 rounded-full bg-red-600 border border-red-400 text-white animate-pulse shadow-[0_0_15px_#ef4444] text-[8px] font-black tracking-widest cursor-pointer">
                    MAJ DISPONIBLE (V.{targetVersion})
                 </div>
                 <p className="text-[6px] text-gray-500 font-bold uppercase">Locale: V.{CURRENT_APP_VERSION}</p>
               </div>
             ) : (
               <div className={`px-3 py-0.5 rounded-full border ${isPro ? 'bg-orange-600/20 border-orange-400/40 text-orange-400' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[8px] font-black tracking-widest`}>
                 V.{CURRENT_APP_VERSION} (À JOUR)
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
