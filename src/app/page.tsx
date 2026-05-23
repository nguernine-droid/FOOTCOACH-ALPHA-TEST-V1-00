'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ROOT_PAGE : L'AIGUILLAGE INTELLIGENT
 * On passe en 'use client' pour accéder au LocalStorage.
 * Cela évite le flash du dashboard pour les nouveaux utilisateurs.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const hasRole = localStorage.getItem('user_role');

    if (hasRole) {
      // Utilisateur connu -> Cockpit
      router.replace('/dashboard');
    } else {
      // Nouvel utilisateur -> Vitrine
      router.replace('/showcase');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Petit loader discret pendant l'aiguillage */}
      <div className="w-8 h-8 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
