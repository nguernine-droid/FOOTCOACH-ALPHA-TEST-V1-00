'use client';

import React, { useState, useRef } from 'react';
import { ShieldCheck, User, Loader2 } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';

import { CURRENT_APP_VERSION } from '@/components/VersionGuard';

/**
 * TOP_BAR (v9.6 - VISIBLE VERSION)
 */
export function TopBar() {
  const { teamInfo, theme } = useTeam();
  const [isSyncing, setIsSyncing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-neon-orange' : 'text-neon-cyan';
  const accentBorder = isPro ? 'border-neon-orange/30' : 'border-neon-cyan/30';

  const coachStatus: 'Actif' | 'Inactif' | 'Toujours Partant' = 'Actif';

  // LOGIQUE DE SYNCHRONISATION PAR APPUI LONG
  const startPress = () => {
    timerRef.current = setTimeout(() => {
      setIsSyncing(true);
      if (navigator.vibrate) navigator.vibrate(50); // Petit retour haptique
      window.location.reload();
    }, 800); // 800ms pour déclencher
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const getStatusBorder = () => {
    switch (coachStatus as any) {
      case 'Actif': return 'border-[#39FF14] shadow-[0_0_15px_#39FF1466]';
      case 'Inactif': return 'border-gray-500 opacity-50';
      case 'Toujours Partant': return 'border-red-500 shadow-[0_0_15px_#EF444466]';
      default: return accentBorder;
    }
  };

  return (
    <header className="flex-shrink-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-3 z-40 sticky top-0 overflow-hidden">
      <div className="grid grid-cols-[60px_1fr_60px] gap-3 items-center">

        {/* COLONNE GAUCHE : LOGO CLUB | CATEGORIE */}
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

        {/* COLONNE CENTRE : INFOS */}
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
             <p className="text-[7px] font-bold text-gray-500 uppercase tracking-[0.3em]">S. 2026-2027</p>
             <div className={`px-4 py-1 rounded-full border-2 ${isPro ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_10px_#00F0FF33]'} text-[10px] font-black tracking-widest animate-pulse`}>
                V.{CURRENT_APP_VERSION}
             </div>
          </div>
        </Link>

        {/* COLONNE DROITE : PHOTO PROFIL (AVEC GESTURE SYNC) */}
        <div className="flex flex-col items-center">
          <div
            onMouseDown={startPress}
            onMouseUp={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            className={`aspect-square w-full rounded-xl border-2 transition-all active:scale-90 ${getStatusBorder()} bg-black/40 shadow-lg relative overflow-hidden cursor-pointer`}
          >
            {isSyncing ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
                <Loader2 size={24} className={`animate-spin ${accentColor}`} />
              </div>
            ) : null}

            <Link href="/profile" className="block w-full h-full">
              {teamInfo?.coachPhoto ? (
                <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className={accentColor} />
              )}
              <div className={`absolute bottom-0 inset-x-0 py-0.5 text-center text-[5px] font-black uppercase bg-black/60 text-white`}>
                COACH
              </div>
            </Link>
          </div>
          <p className="text-[5px] font-bold text-gray-600 uppercase mt-1 tracking-tighter">Appui long: Sync</p>
        </div>

      </div>
    </header>
  );
}
