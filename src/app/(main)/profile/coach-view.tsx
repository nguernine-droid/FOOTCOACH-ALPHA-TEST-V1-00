'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { Settings, Share2 } from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

/**
 * COACH_VIEW (v12.0 - MASTER CLASSIC CLEAN CARD)
 * Affichage exclusif de la Fiche Coach. Actions déportées dans le menu central (+).
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo } = useTeam();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center animate-in fade-in duration-1000">

      {/* 1. LA FICHE MAÎTRE (CENTRE DE L'ÉCRAN XXL) */}
      <div className="w-full flex justify-center px-1">
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto} // FIX PHOTO MANQUANTE
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

      {/* 2. PIED DE PAGE DISCRET */}
      <section className="w-full max-w-sm mt-8 px-6 pb-10">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `Fiche Coach - ${teamInfo?.coachName}`,
                text: `Découvrez mon profil sur FootCoach !`,
                url: window.location.href,
              });
            }
          }}
          className="w-full py-4 flex items-center justify-center gap-2 text-gray-400 font-black uppercase text-[8px] tracking-[0.3em] active:opacity-50 transition-opacity"
        >
          <Share2 size={12} /> Diffuser ma carte d'identité
        </button>
      </section>

      {/* Accès discret réglages (Haut Droite) */}
      <button
        onClick={() => router.push('/settings')}
        className="fixed top-6 right-6 p-3 rounded-2xl bg-black/5 text-gray-400 active:scale-90 transition-all z-50"
      >
        <Settings size={20} />
      </button>

    </div>
  );
}
