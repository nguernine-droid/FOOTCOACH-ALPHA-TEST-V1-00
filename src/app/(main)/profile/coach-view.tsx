'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { ChevronLeft } from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

/**
 * COACH_VIEW (v15.0 - REFINED FLOATING CARD)
 * Carte "Objet Précieux" centrée avec marges.
 * Immersion totale : TopBar et BottomNav masqués.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo } = useTeam();

  // Stats simulées (À brancher sur Supabase plus tard)
  const stats = {
    matchesPlayed: 12,
    announcementsSent: 8,
    contactsMade: 15,
    engagementRate: 100
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-black overflow-hidden animate-in fade-in duration-1000">

      {/* BOUTON RETOUR DISCRET (HAUT GAUCHE - SANS OVERLAP) */}
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-12 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-[60] shadow-2xl"
      >
        <ChevronLeft size={24} strokeWidth={3} />
      </button>

      {/* LA FICHE MAÎTRE (FLOTTANTE AVEC MARGES) */}
      <div className="w-full flex justify-center px-6">
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto}
          clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
          clubLogo={teamInfo?.clubLogo}
          category={teamInfo?.category || 'SÉNIORS'}
          points={teamInfo?.xp || 0}
          status={teamInfo?.coachStatus || 'actif'}
          // Stats
          matchesPlayed={stats.matchesPlayed}
          announcementsSent={stats.announcementsSent}
          contactsMade={stats.contactsMade}
          engagementRate={stats.engagementRate}
          // Rayons (Verso)
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

    </div>
  );
}
