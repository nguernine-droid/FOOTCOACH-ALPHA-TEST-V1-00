'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { TeamProvider } from '@/lib/context/TeamContext';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProfilePage = pathname === '/profile';

  return (
    <div className="min-h-screen bg-black text-white max-w-md mx-auto relative flex flex-col border-x border-white/5 shadow-2xl">
      {/*
          COCKPIT_MAIN_LAYOUT
          Centralise le cerveau (Context), l'en-tête (TopBar)
          et la navigation (BottomNav).
      */}
      {!isProfilePage && <TopBar />}

      <main className={`flex-1 overflow-y-auto no-scrollbar ${isProfilePage ? 'pb-20' : 'pb-32'}`}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
