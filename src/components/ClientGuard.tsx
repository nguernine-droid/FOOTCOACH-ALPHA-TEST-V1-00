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
        // Session valide -> On s'assure que le rôle est en cache pour le Context
        const hasRole = localStorage.getItem('user_role');
        if (!hasRole) {
           const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
           if (profile) localStorage.setItem('user_role', profile.role);
        }

        // Redirection auto vers Dashboard si l'utilisateur tente de retourner sur Showcase en étant connecté
        if (isPublicPage) {
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
