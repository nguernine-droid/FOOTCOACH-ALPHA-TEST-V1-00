'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { Settings, Edit3, Calendar, Share2 } from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

/**
 * COACH_VIEW (v11.0 - MASTER CLASSIC UNIQUE CARD)
 * Affichage exclusif de la Fiche Coach avec système de Flip.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo, theme } = useTeam();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-1000">

      {/* 1. LA FICHE MAÎTRE (CENTRE DE L'ÉCRAN) */}
      <div className="w-full flex justify-center px-4">
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          slogan={teamInfo?.bio || "DROIT AU BUT"}
          clubName={teamInfo?.clubName || 'MON CLUB'}
          clubLogo={teamInfo?.clubLogo}
          category={teamInfo?.category || 'SÉNIORS'}
          points={teamInfo?.xp || 0}
          grade={teamInfo?.grade || 'COACH ENGAGÉ'}
          status={teamInfo?.coachStatus || 'actif'}
          matchDist={teamInfo?.matchDistMax || 30}
          plateauDist={teamInfo?.plateauDistMax || 20}
          tournamentReach={
            teamInfo?.tournamentReach === 'departemental' ? 'DÉPARTEMENT' :
            teamInfo?.tournamentReach === 'regional' ? 'RÉGIONAL' :
            teamInfo?.tournamentReach === 'national' ? 'NATIONAL' :
            `${teamInfo?.tournamentDistMax} KM`
          }
        />
      </div>

      {/* 2. COMMANDES TACTIQUES (DISCRÈTES EN BAS) */}
      <section className="w-full max-w-sm space-y-4 px-6 pb-10">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/profile/edit')}
            className="bg-orange-600 text-white py-5 rounded-[2.5rem] font-black uppercase italic text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Edit3 size={18} /> Modifier
          </button>

          <button
            onClick={() => router.push('/events')}
            className="bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-[2.5rem] font-black uppercase italic text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Calendar size={18} /> Mon Agenda
          </button>
        </div>

        {/* Bouton de Partage rapide */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `Fiche Coach - ${teamInfo?.coachName}`,
                text: `Découvrez mon profil coach sur Team Nexus !`,
                url: window.location.href,
              });
            }
          }}
          className="w-full py-4 flex items-center justify-center gap-2 text-gray-400 font-black uppercase text-[9px] tracking-[0.3em] active:opacity-50 transition-opacity"
        >
          <Share2 size={14} /> Diffuser ma carte d'identité
        </button>
      </section>

      {/* Accès discret aux réglages */}
      <button
        onClick={() => router.push('/settings')}
        className="fixed top-6 right-6 p-3 rounded-2xl bg-black/5 text-gray-400 active:scale-90 transition-all z-50"
      >
        <Settings size={20} />
      </button>

    </div>
  );
}
