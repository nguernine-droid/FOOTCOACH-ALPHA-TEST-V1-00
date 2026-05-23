'use client';

import React from 'react';
import { ShieldCheck, User } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';

/**
 * TOP_BAR (v9.2 - COMPACT ALPHA)
 * Version ultra-compacte pour optimiser l'espace écran sur mobile.
 * Suppression du Niveau, des Stats et de l'Effectif.
 */
export function TopBar() {
  const { teamInfo, theme, isProfileComplete } = useTeam();

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-neon-orange' : 'text-neon-cyan';
  const accentBorder = isPro ? 'border-neon-orange/30' : 'border-neon-cyan/30';

  const coachStatus: 'Actif' | 'Inactif' | 'Toujours Partant' = 'Actif';

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

      {/* STRUCTURE EN GRILLE COMPACTE */}
      <div className="grid grid-cols-[60px_1fr_60px] gap-3 items-center">

        {/* COLONNE GAUCHE : LOGO CLUB | CATEGORIE */}
        <div className="flex flex-col gap-1.5">
          {/* Box 1: LOGO CLUB */}
          <Link href={isProfileComplete ? "/profile" : "/onboarding"} className="block">
            <div className={`aspect-square w-full rounded-xl overflow-hidden border-2 flex items-center justify-center bg-black/40 ${accentBorder} shadow-lg`}>
              {teamInfo?.clubLogo ? (
                <img src={teamInfo.clubLogo} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <ShieldCheck size={24} className={accentColor} />
              )}
            </div>
          </Link>
          {/* Box 2: CATEGORIE */}
          <div className={`py-1 rounded-md border text-center ${isPro ? 'bg-neon-orange/10' : 'bg-neon-cyan/10'} ${accentBorder}`}>
             <p className={`text-[8px] font-black uppercase tracking-tighter ${accentColor}`}>{teamInfo?.category || 'U13'}</p>
          </div>
        </div>

        {/* COLONNE CENTRE : NOM CLUB | NOM COACH | SAISON */}
        <Link href="/profile" className="flex flex-col gap-1 justify-center cursor-pointer">
          {/* Box 4: ID CLUB */}
          <div className="text-center">
            <GlitchText
              text={teamInfo?.clubName || 'MON_UNITÉ'}
              className={`text-sm font-black italic tracking-tighter uppercase ${accentColor} leading-none line-clamp-1`}
            />
          </div>
          {/* Box 5: PRENOM COACH */}
          <div className="py-1 border-y border-white/5 text-center">
            <p className={`text-lg font-black uppercase italic tracking-widest ${accentColor} leading-none`}>
              {teamInfo?.coachName || 'COACH'}
            </p>
          </div>
          {/* Box 6: SAISON */}
          <div className="text-center">
             <p className="text-[7px] font-bold text-gray-500 uppercase tracking-[0.3em]">S. 2026-2027</p>
          </div>
        </Link>

        {/* COLONNE DROITE : PHOTO PROFIL */}
        <div className="flex flex-col items-center">
          {/* Box 7: PHOTO */}
          <Link href="/profile" className="block group w-full">
            <div className={`aspect-square w-full rounded-xl border-2 transition-all group-hover:scale-105 active:scale-95 ${getStatusBorder()} bg-black/40 shadow-lg relative overflow-hidden`}>
              {teamInfo?.coachPhoto ? (
                <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className={accentColor} />
              )}
              {/* Badge Rôle Coach */}
              <div className={`absolute bottom-0 inset-x-0 py-0.5 text-center text-[5px] font-black uppercase bg-black/60 text-white`}>
                COACH
              </div>
            </div>
          </Link>
        </div>

      </div>

    </header>
  );
}
