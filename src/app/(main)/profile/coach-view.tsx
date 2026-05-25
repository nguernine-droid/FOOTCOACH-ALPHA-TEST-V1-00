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
 * COACH_VIEW (v14.0 - FULL COCKPIT INTEGRATION)
 * Immersion 100% : Cockpit de commandement intégral.
 * Zéro boutons superflus. Navigation via le bouton (+) central.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo } = useTeam();

  // Stats simulées pour la démo (À brancher sur Supabase plus tard)
  const stats = {
    matchesPlayed: 12,
    announcementsSent: 8,
    contactsMade: 15,
    engagementRate: 100
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-black overflow-hidden animate-in fade-in duration-1000">

      {/* BOUTON RETOUR (DISCRET) */}
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-10 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-[60] shadow-2xl backdrop-blur-md"
      >
        <ChevronLeft size={24} strokeWidth={3} />
      </button>

      {/* LE COCKPIT INTÉGRAL (CARTE FULL SCREEN) */}
      <div className="flex-1 flex flex-col">
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto}
          clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
          clubLogo={teamInfo?.clubLogo}
          category={teamInfo?.category || 'SÉNIORS'}
          points={teamInfo?.xp || 0}
          status={teamInfo?.coachStatus || 'actif'}
          // Stats intégrées
          matchesPlayed={stats.matchesPlayed}
          announcementsSent={stats.announcementsSent}
          contactsMade={stats.contactsMade}
          engagementRate={stats.engagementRate}
          // Rayons d'action (Verso)
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
