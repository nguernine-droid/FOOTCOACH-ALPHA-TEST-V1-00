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
 * COACH_VIEW (v17.0 - MASTER FLIP EXPERIENCE)
 * Immersion totale. Fiche XXL centrée.
 * Flip 3D pour voir les détails et le bouton Modifier.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo } = useTeam();

  // Stats simulées
  const stats = { matchesPlayed: 12, announcementsSent: 8, contactsMade: 15, engagementRate: 100 };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-[#050510] overflow-hidden animate-in fade-in duration-1000">

      {/* BOUTON RETOUR DISCRET */}
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-12 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-[60] shadow-2xl"
      >
        <ChevronLeft size={24} strokeWidth={3} />
      </button>

      {/* LE COCKPIT MASTER FLIP */}
      <div className="w-full flex justify-center px-6">
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto}
          clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
          clubLogo={teamInfo?.clubLogo}
          category={teamInfo?.category || 'SÉNIORS'}
          points={teamInfo?.xp || 0}
          status={teamInfo?.coachStatus || 'actif'}
          bio={teamInfo?.bio}
          city={teamInfo?.clubCity}
          stadium={teamInfo?.clubStadium}
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
          onEdit={() => router.push('/profile/edit')}
        />
      </div>

    </div>
  );
}
