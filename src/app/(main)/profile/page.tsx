'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachView } from './coach-view';
import { ParentView } from './parent-view';
import { PlayerView } from './player-view';
import SupporterView from './supporter-view';
import OnboardingPage from '@/app/(setup)/onboarding/page';

export default function ProfilePage() {
  const { role, theme, isProfileComplete, hasSeenWelcome, setHasSeenWelcome } = useTeam();
  const router = useRouter();
  const [isAddingParent, setIsAddingParent] = useState(false);

  // Aiguillage Intelligent
  // Si première visite et profil pas complet -> On affiche l'onboarding au sein de la page profil
  const showWelcome = !hasSeenWelcome && !isProfileComplete;

  useEffect(() => {
    // Si l'utilisateur a fini l'onboarding (isProfileComplete passe à true),
    // on marque hasSeenWelcome à true pour ne plus jamais revenir.
    if (isProfileComplete && !hasSeenWelcome) {
      setHasSeenWelcome(true);
    }
  }, [isProfileComplete, hasSeenWelcome, setHasSeenWelcome]);

  const getBackgroundClass = () => {
    if (showWelcome) return 'bg-black text-white';
    if (role === 'parent' || role === 'supporter') return 'bg-gray-50 text-gray-900';
    return theme === 'nexus' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';
  };

  // Bouton pour ignorer l'invitation (Optionnel, permet de voir sa carte vide)
  const handleSkipWelcome = () => {
    setHasSeenWelcome(true);
  };

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 ${getBackgroundClass()}`}>

      {/* 1. ÉCRAN DE BIENVENUE (Proposition non bloquante) */}
      {showWelcome && (
        <div className="space-y-6">
          <div className="flex justify-end px-2">
             <button
               onClick={handleSkipWelcome}
               className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-cyan hover:text-white transition-colors border border-neon-cyan/50 px-6 py-3 rounded-full bg-neon-cyan/10 shadow-[0_0_15px_#00F0FF33]"
             >
               Passer pour l'instant
             </button>
          </div>
          <OnboardingPage />
        </div>
      )}

      {/* 2. VUE COACH (Carte FIFA) */}
      {!showWelcome && role === 'coach' && !isAddingParent && (
        <CoachView onActivateParent={() => setIsAddingParent(true)} />
      )}

      {/* PARENT / JOUEUR / SUPPORTER */}
      {!showWelcome && (role === 'parent' || isAddingParent) && (
        <ParentView showBackButton={isAddingParent} onBackToCoach={() => setIsAddingParent(false)} />
      )}
      {!showWelcome && role === 'player' && <PlayerView />}
      {!showWelcome && role === 'supporter' && <SupporterView />}

    </div>
  );
}
