'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * ROOT_PAGE : L'AIGUILLAGE MAÎTRE
 * Force le nettoyage et la redirection stricte.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      // 1. On vérifie l'utilisateur réel Supabase
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // AUCUN COMPTE -> Nettoyage radical et Vitrine
        localStorage.clear();
        router.replace('/showcase');
      } else {
        // COMPTE EXISTE -> Dashboard
        router.replace('/dashboard');
      }
    };

    checkAccess();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
