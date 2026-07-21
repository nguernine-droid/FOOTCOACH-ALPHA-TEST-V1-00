'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * CLIENT_GUARD (v4.9 - Session Integrity Fix)
 * Vérifie la session réelle pour éviter les résidus de LocalStorage.
 */
export function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Vérification de la session réelle
      const { data: { session } } = await supabase.auth.getSession();

      const isPublicPage = pathname?.startsWith('/showcase') || pathname === '/login' || pathname === '/register';
      const isOnboardingPage = pathname?.startsWith('/onboarding');

      if (!session) {
        // Pas de session -> On nettoie les vieux résidus
        localStorage.removeItem('user_role');
        localStorage.removeItem('app_theme');
        localStorage.removeItem('is_authenticated');

        // Si l'utilisateur est sur une page protégée -> Redirection Showcase
        if (!isPublicPage && !isOnboardingPage) {
          router.replace('/showcase');
        }
      } else {
        // Session valide -> On récupère rôle + complétude du profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) localStorage.setItem('user_role', profile.role);

        const profileComplete = !!(profile?.first_name && profile?.last_name);

        if (!profileComplete && !isOnboardingPage && !isPublicPage) {
          // Première connexion : personnalisation assistée obligatoire.
          router.replace('/onboarding');
        } else if (profileComplete && (isPublicPage || isOnboardingPage)) {
          // Profil déjà complet : pas de retour sur showcase/onboarding.
          router.replace('/dashboard');
        }
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [pathname, router]);

  if (isChecking) return null;

  return <>{children}</>;
}
