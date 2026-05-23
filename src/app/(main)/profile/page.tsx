'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachView } from './coach-view';
import { ParentView } from './parent-view';
import { PlayerView } from './player-view';
import SupporterView from './supporter-view';

export default function ProfilePage() {
  // On récupère le thème en plus du rôle
  const { role, theme, isProfileComplete } = useTeam();

  // Si le profil n'est pas complété, on redirige vers l'onboarding pour forcer la saisie
  const router = useRouter();
  React.useEffect(() => {
    if (!isProfileComplete) {
      router.replace('/onboarding');
    }
  }, [isProfileComplete, router]);

  const [isAddingParent, setIsAddingParent] = useState(false);

  // LOGIQUE DE THÈME SELON LE CDCF (Mis à jour pour le choix du Joueur)
  const getBackgroundClass = () => {
    // 1. Le Joueur a le choix du thème (comme le Coach)
    if (role === 'player') {
      return theme === 'nexus' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';
    }

    // 2. Le Parent et le Supporter ont le thème Classique forcé (fond clair)
    if (role === 'parent' || role === 'supporter') return 'bg-gray-50 text-gray-900';

    // 3. Le Coach dépend de son choix de thème
    if (role === 'coach') {
      return theme === 'nexus' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';
    }

    return 'bg-gray-50 text-gray-900'; // Fallback sécurisé (Classique)
  };

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 ${getBackgroundClass()}`}>

      {/* COACH : Dossier Commandant / Outil Pro */}
      {role === 'coach' && !isAddingParent && (
        <CoachView onActivateParent={() => setIsAddingParent(true)} />
      )}

      {/* PARENT : Suivi multi-enfants et cagnottes */}
      {(role === 'parent' || isAddingParent) && (
        <ParentView
          showBackButton={isAddingParent}
          onBackToCoach={() => setIsAddingParent(false)}
        />
      )}

      {/* JOUEUR : Carte FIFA personnelle et Sync Engine */}
      {role === 'player' && <PlayerView />}

      {/* SUPPORTER : Fan Zone et visualisation des cartes enfants */}
      {role === 'supporter' && <SupporterView />}

    </div>
  );
}
