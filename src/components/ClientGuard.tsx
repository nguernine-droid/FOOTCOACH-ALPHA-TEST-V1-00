'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * CLIENT_GUARD (Maquette v4.7 - Supabase Ready)
 * Gère le routage intelligent basé sur le LocalStorage
 * Autorise l'accès à l'onboarding pour les nouveaux utilisateurs
 */
export function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Vérification de l'état de l'utilisateur
    const hasRole = localStorage.getItem('user_role');

    // 2. Définition des zones d'accès
    const isPublicPage = pathname?.startsWith('/showcase') || pathname === '/login' || pathname === '/register';
    const isOnboardingPage = pathname?.startsWith('/onboarding');

    // LOGIQUE DE SÉCURITÉ :

    // CAS A : Utilisateur inconnu (pas de rôle) tente d'accéder à une zone protégée
    // On le laisse passer S'IL est sur Onboarding ou Showcase
    if (!hasRole && !isPublicPage && !isOnboardingPage) {
      console.log('--- RESTRICED_ACCESS : REDIRECTING_TO_SHOWCASE ---');
      router.push('/showcase');
      return; // Important : on arrête l'exécution ici
    }

    // CAS B : Utilisateur déjà connecté tente de retourner sur la page publique
    if (hasRole && isPublicPage) {
      console.log('--- UNIT_ALREADY_LINKED : REDIRECTING_TO_DASHBOARD ---');
      router.push('/dashboard');
      return; // Important : on arrête l'exécution ici
    }

    // CAS C : Utilisateur connecté tente de refaire l'onboarding
    // Pour l'instant, on le laisse passer (utile pour tes tests).
    // Quand tu voudras bloquer ça, décommente les lignes ci-dessous :
    /*
    if (hasRole && isOnboardingPage) {
      console.log('--- PROFILE_EXISTS : REDIRECTING_TO_DASHBOARD ---');
      router.push('/dashboard');
      return;
    }
    */

  }, [pathname, router]);

  return <>{children}</>;
}

