'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SideNav } from '@/components/layout/SideNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isPro } = useTeam();
  const isProfilePage = pathname === '/profile';

  return (
    <div className={`min-h-screen ${isPro ? 'bg-gray-100' : 'bg-[#15171C]'}`}>
      {/* Navigation latérale — grands écrans uniquement */}
      <SideNav />

      <div className="lg:pl-64">
        {/* Mobile : cadre "téléphone" centré (max-w-md + bordures).
            Desktop : le conteneur remplit toute la largeur à côté de la SideNav
            (lg:max-w-none) pour que le fond de chaque page soit CONTINU — plus
            d'effet de couloir étroit dû au changement de couleur sur les côtés.
            Les marges/largeur de lecture sont gérées PAR chaque page (max-w interne). */}
        <div className={`min-h-screen text-[#F5F3EF] max-w-md lg:max-w-none mx-auto relative flex flex-col
          border-x lg:border-x-0 shadow-2xl lg:shadow-none ${isPro ? 'border-gray-200' : 'border-white/[0.06]'}`}>
          {/* TopBar mobile uniquement : sur desktop la sidebar affiche déjà club + profil */}
          {!isProfilePage && <div className="lg:hidden"><TopBar /></div>}

          <main className={`flex-1 overflow-y-auto no-scrollbar ${isProfilePage ? 'pb-20' : 'pb-32'} lg:pb-14`}>
            {children}
          </main>

          {/* Navigation basse — mobile uniquement */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
