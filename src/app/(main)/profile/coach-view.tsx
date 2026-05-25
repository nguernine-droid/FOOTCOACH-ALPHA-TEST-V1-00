'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import { ChevronLeft, Info, Settings } from 'lucide-react';

/**
 * COACH_VIEW (v26.0 - MASTER CLASSIC FINAL)
 * Calibrage ultime : Sommet libéré, Photo XXL, 4 lignes de stats.
 */
export function CoachView({ onActivateParent }: { onActivateParent?: () => void }) {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Stats réelles (ou simulées pour l'Alpha)
  const stats = {
    matchesPlayed: 12,
    announcementsSent: 8,
    contactsMade: 15,
    engagementRate: 100
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-black overflow-hidden animate-in fade-in duration-1000">

      {/* BOUTON RETOUR TRÈS DISCRET & HAUT PLACÉ */}
      <button
        onClick={() => router.push('/dashboard')}
        className="absolute top-10 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 active:text-white active:scale-90 transition-all z-[60]"
      >
        <ChevronLeft size={20} strokeWidth={3} />
      </button>

      {/* BOUTON RÉGLAGES (HAUT DROITE) */}
      <button
        onClick={() => router.push('/settings')}
        className="absolute top-10 right-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 active:text-white active:scale-90 transition-all z-[60]"
      >
        <Settings size={20} />
      </button>

      {/* LE COCKPIT FINAL */}
      <div
        className="w-full flex justify-center px-6 transition-all active:scale-95 duration-500 cursor-pointer"
        onClick={() => router.push('/profile/edit')} // Redirection directe ou ouverture dossier selon ton choix
      >
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto}
          clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
          clubLogo={teamInfo?.clubLogo}
          category={teamInfo?.category || 'SÉNIORS'}
          points={teamInfo?.xp || 0}
          status={teamInfo?.coachStatus || 'actif'}
          // Stats complètes
          matchesPlayed={stats.matchesPlayed}
          announcementsSent={stats.announcementsSent}
          contactsMade={stats.contactsMade}
          engagementRate={stats.engagementRate}
        />
      </div>

      {/* GUIDE VISUEL ÉCLAIRCI */}
      <div className="absolute bottom-20 flex flex-col items-center gap-3">
        <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.5em] flex items-center gap-2">
          <Info size={12} /> Toucher pour configurer
        </p>
        <div className="flex gap-1 opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
      </div>

    </div>
  );
}
