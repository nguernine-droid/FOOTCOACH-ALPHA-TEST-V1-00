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
        <div className={`min-h-screen text-[#F5F3EF] max-w-md lg:max-w-2xl mx-auto relative flex flex-col
          border-x lg:border-x-0 shadow-2xl lg:shadow-none ${isPro ? 'border-gray-200' : 'border-white/[0.06]'}`}>
          {/* TopBar mobile uniquement : sur desktop la sidebar affiche déjà club + profil */}
          {!isProfilePage && <div className="lg:hidden"><TopBar /></div>}

          <main className={`flex-1 overflow-y-auto no-scrollbar ${isProfilePage ? 'pb-20' : 'pb-32'} lg:pb-10`}>
            {children}
          </main>

          {/* Navigation basse — mobile uniquement */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
