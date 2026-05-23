'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * ROOT_PAGE : L'AIGUILLAGE INTELLIGENT
 * Vérifie la session réelle pour éviter les résidus de LocalStorage.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Session valide -> Dashboard
        router.replace('/dashboard');
      } else {
        // Pas de session -> On nettoie le local et direction Showcase
        localStorage.removeItem('user_role');
        localStorage.removeItem('is_authenticated');
        router.replace('/showcase');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
