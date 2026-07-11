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
    <div className="min-h-screen bg-[#15171C] text-[#F5F3EF] max-w-md mx-auto relative flex flex-col border-x border-white/[0.06] shadow-2xl">
      {!isProfilePage && <TopBar />}

      <main className={`flex-1 overflow-y-auto no-scrollbar ${isProfilePage ? 'pb-20' : 'pb-32'}`}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
