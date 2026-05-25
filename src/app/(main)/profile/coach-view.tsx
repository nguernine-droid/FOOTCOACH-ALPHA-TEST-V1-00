'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { ChevronLeft, Share2 } from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

/**
 * COACH_VIEW (v13.0 - FULL IMMERSION MODE)
 * Immersion totale : TopBar et BottomNav masqués.
 * Fiche XXL centrée sur fond noir pur.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo } = useTeam();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050510] relative animate-in fade-in duration-1000">

      {/* BOUTON RETOUR (Indispensable car TopBar masquée) */}
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-8 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-50 shadow-2xl"
      >
        <ChevronLeft size={24} strokeWidth={3} />
      </button>

      {/* 1. LA FICHE MAÎTRE XXL */}
      <div className="w-full flex justify-center px-2">
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto}
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

      {/* 2. PIED DE PAGE DISCRET (PARTAGE) */}
      <div className="mt-4 pb-20">
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
          className="flex items-center gap-2 text-white/20 font-black uppercase text-[10px] tracking-[0.4em] active:opacity-100 transition-opacity"
        >
          <Share2 size={14} /> Partager
        </button>
      </div>

    </div>
  );
}
