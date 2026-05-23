'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * CLIENT_GUARD (Maquette v4.8 - Anti-Flash Fix)
 * Gère le routage intelligent et empêche les déconnexions intempestives
 */
export function ClientGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Vérification de l'état local
      const hasRole = localStorage.getItem('user_role');

      // 2. Vérification Supabase si pas de rôle local (pour éviter les erreurs après refresh)
      if (!hasRole) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
           const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
           if (profile) {
              localStorage.setItem('user_role', profile.role);
              setIsChecking(false);
              return;
           }
        }
      }

      // 3. Définition des zones d'accès
      const isPublicPage = pathname?.startsWith('/showcase') || pathname === '/login' || pathname === '/register';
      const isOnboardingPage = pathname?.startsWith('/onboarding');

      // CAS A : Accès protégé sans rôle
      if (!hasRole && !isPublicPage && !isOnboardingPage) {
        router.replace('/showcase');
      }
      // CAS B : Redirection auto vers Dashboard si déjà connecté
      else if (hasRole && isPublicPage) {
        router.replace('/dashboard');
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [pathname, router]);

  if (isChecking) return null;

  return <>{children}</>;
}
