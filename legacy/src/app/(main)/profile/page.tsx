'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachView } from './coach-view';
import { ParentView } from './parent-view';
import { PlayerView } from './player-view';
import SupporterView from './supporter-view';
import OnboardingPage from '@/app/(setup)/onboarding/page';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { role, theme, isProfileComplete, hasSeenWelcome, setHasSeenWelcome, isLoading } = useTeam();
  const router = useRouter();
  const [isAddingParent, setIsAddingParent] = useState(false);

  // 1. ATTENTE DE SYNCHRONISATION
  // Si l'application est en train de charger les données réelles, on affiche un loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#15171C] flex flex-col items-center justify-center space-y-4">
        <Loader2 size={40} className="animate-spin text-neon-cyan" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Synchronisation Profil...</p>
      </div>
    );
  }

  // 2. LOGIQUE D'AIGUILLAGE (Une fois les données chargées)
  const showWelcome = !hasSeenWelcome && !isProfileComplete;

  const getBackgroundClass = () => {
    if (showWelcome) return 'bg-[#15171C] text-white';
    if (role === 'coach') return 'bg-[#15171C] text-white p-0'; // FOND ANTHRACITE CHALEUREUX POUR COACH
    if (role === 'parent' || role === 'supporter') return 'bg-gray-50 text-gray-900';
    return theme === 'nexus' ? 'bg-[#15171C] text-white' : 'bg-gray-50 text-gray-900';
  };

  const handleSkipWelcome = () => {
    setHasSeenWelcome(true);
  };

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 ${getBackgroundClass()}`}>

      {/* ÉCRAN DE BIENVENUE (Proposition non bloquante) */}
      {showWelcome && (
        <div className="space-y-6">
          <div className="flex justify-end px-2">
             <button
               onClick={handleSkipWelcome}
               className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-cyan hover:text-white transition-colors border border-neon-cyan/50 px-6 py-3 rounded-full bg-neon-cyan/10 shadow-sm"
             >
               Passer pour l'instant
             </button>
          </div>
          <OnboardingPage />
        </div>
      )}

      {/* VUE COACH (Carte FIFA) */}
      {!showWelcome && role === 'coach' && !isAddingParent && (
        <CoachView onActivateParent={() => setIsAddingParent(true)} />
      )}

      {/* AUTRES RÔLES */}
      {!showWelcome && (role === 'parent' || isAddingParent) && (
        <ParentView showBackButton={isAddingParent} onBackToCoach={() => setIsAddingParent(false)} />
      )}
      {!showWelcome && role === 'player' && <PlayerView />}
      {!showWelcome && role === 'supporter' && <SupporterView />}

    </div>
  );
}
