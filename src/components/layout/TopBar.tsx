'use client';

import React from 'react';
import { ShieldCheck, User, Users } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import Link from 'next/link';

/**
 * TOP_BAR (v9.1 - ALPHA TEST V1)
 * Restructuration complète selon le schéma fourni par l'utilisateur.
 * Grille 3 colonnes : [LOGO/CAT/NIV] [ID/PRENOM/SAISON/STATS] [PHOTO/EFFECTIF]
 */
export function TopBar() {
  const { teamInfo, theme } = useTeam();

  const isPro = theme === 'classic';
  const accentColor = isPro ? 'text-neon-orange' : 'text-neon-cyan';
  const accentBg = isPro ? 'bg-neon-orange/10' : 'bg-neon-cyan/10';
  const accentBorder = isPro ? 'border-neon-orange/30' : 'border-neon-cyan/30';

  // Stats simulées pour la V1 (à lier à la DB plus tard)
  const coachRPGStats = { doctrine: 45, synergie: 30, influence: 15 };
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
    <header className="flex-shrink-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 z-40 sticky top-0 overflow-hidden">

      {/* STRUCTURE EN GRILLE (SCHÉMA UTILISATEUR) */}
      <div className="grid grid-cols-[90px_1fr_90px] gap-3">

        {/* COLONNE GAUCHE : LOGO CLUB | CATEGORIE | NIVEAU */}
        <div className="flex flex-col gap-2">
          {/* Box 1: LOGO CLUB */}
          <div className={`aspect-square w-full rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-black/40 ${accentBorder} shadow-lg`}>
            {teamInfo?.clubLogo ? (
              <img src={teamInfo.clubLogo} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <ShieldCheck size={32} className={accentColor} />
            )}
          </div>
          {/* Box 2: CATEGORIE */}
          <div className={`py-1.5 rounded-lg border text-center ${accentBg} ${accentBorder}`}>
             <p className={`text-[10px] font-black uppercase tracking-tighter ${accentColor}`}>{teamInfo?.category || 'U13'}</p>
          </div>
          {/* Box 3: NIVEAU */}
          <div className={`py-1.5 rounded-lg border border-white/5 bg-white/5 text-center`}>
             <p className="text-[10px] font-black uppercase tracking-tighter text-gray-500">D1</p>
          </div>
        </div>

        {/* COLONNE CENTRE : ID CLUB | PRENOM COACH | SAISON | BARRE DE PROGRESSION */}
        <div className="flex flex-col gap-2">
          {/* Box 4: ID CLUB */}
          <div className="h-12 flex items-center justify-center text-center">
            <GlitchText
              text={teamInfo?.clubName || 'NEXUS_UNIT'}
              className={`text-xl font-black italic tracking-tighter uppercase ${accentColor} leading-none line-clamp-2`}
            />
          </div>
          {/* Box 5: PRENOM COACH */}
          <div className="py-2 border-y border-white/5 text-center">
            <p className={`text-2xl font-black uppercase italic tracking-widest ${accentColor} leading-none`}>
              {teamInfo?.coachName || 'AGENT'}
            </p>
          </div>
          {/* Box 6: SAISON */}
          <div className="text-center">
             <p className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.4em]">S. 2026-2027</p>
          </div>

          {/* Box 9: BARRE DE PROGRESSION (Intégrée au centre selon schéma) */}
          <div className="mt-2 space-y-1.5 px-1">
             <MiniTopBar label="DOC" value={coachRPGStats.doctrine} color="bg-neon-orange" />
             <MiniTopBar label="SYN" value={coachRPGStats.synergie} color={isPro ? 'bg-blue-600' : 'bg-neon-cyan'} />
             <MiniTopBar label="INF" value={coachRPGStats.influence} color="bg-neon-magenta" />
          </div>
        </div>

        {/* COLONNE DROITE : PHOTO | EFFECTIF */}
        <div className="flex flex-col gap-2">
          {/* Box 7: PHOTO */}
          <Link href="/profile" className="block group">
            <div className={`aspect-square w-full rounded-2xl border-2 transition-all group-hover:scale-105 active:scale-95 ${getStatusBorder()} bg-black/40 shadow-lg relative overflow-hidden`}>
              {teamInfo?.coachPhoto ? (
                <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className={accentColor} />
              )}
              {/* Badge Rôle Coach */}
              <div className={`absolute bottom-0 inset-x-0 py-0.5 text-center text-[6px] font-black uppercase bg-black/60 text-white`}>
                COACH
              </div>
            </div>
          </Link>
          {/* Box 8: EFFECTIF */}
          <div className={`flex-1 min-h-[50px] rounded-2xl border ${accentBorder} ${accentBg} flex flex-col items-center justify-center p-1`}>
             <Users size={16} className={accentColor} />
             <p className={`text-[12px] font-black ${accentColor}`}>22</p>
             <p className="text-[6px] font-bold text-gray-500 uppercase">
               {isPro ? 'Effectif' : 'Unités'}
             </p>
          </div>
        </div>

      </div>

    </header>
  );
}

function MiniTopBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-0.5">
       <div className="flex justify-between items-center text-[5px] font-black font-mono">
         <span className="text-gray-500">{label}</span>
         <span className="text-white opacity-80">{value}%</span>
       </div>
       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
         <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
       </div>
    </div>
  );
}
