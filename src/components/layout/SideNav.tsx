'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import {
  LayoutDashboard, Radar, CalendarDays, Plus, Rss, Megaphone,
  Users, Settings, ShieldCheck, User
} from 'lucide-react';
import { CreateMenu } from './CreateMenu';

/**
 * SIDE_NAV — Navigation latérale pour grands écrans (lg+).
 * Reprend les mêmes destinations que la BottomNav mobile.
 */
export function SideNav() {
  const { theme, teamInfo } = useTeam();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isPro = theme === 'classic';

  const navItems = [
    { label: isPro ? 'Accueil'  : 'Cockpit',  icon: LayoutDashboard, path: '/dashboard' },
    { label: isPro ? 'Fil'      : 'Actu',     icon: Rss,             path: '/feed' },
    { label: isPro ? 'Briefing' : 'Comms',    icon: Megaphone,       path: '/comms' },
    { label: isPro ? 'Effectif' : 'Unités',   icon: Users,           path: '/team' },
    { label: isPro ? 'Annonces' : 'Radar',    icon: Radar,           path: '/radar' },
    { label: isPro ? 'Agenda'   : 'Planning', icon: CalendarDays,    path: '/events' },
  ];

  const getContext = () => {
    if (pathname?.startsWith('/radar'))   return 'radar';
    if (pathname?.startsWith('/events'))  return 'events';
    if (pathname?.startsWith('/profile')) return 'profile';
    if (pathname?.startsWith('/team'))    return 'team';
    if (pathname?.startsWith('/comms'))   return 'com';
    return 'default';
  };

  return (
    <>
      <aside className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r z-50 p-5
        ${isPro ? 'bg-white border-gray-100' : 'bg-[#1D2027] border-white/[0.06]'}`}>

        {/* CLUB */}
        <Link href="/profile" className={`flex items-center gap-3 p-3 rounded-2xl mb-6 transition-all
          ${isPro ? 'hover:bg-orange-50' : 'hover:bg-white/5'}`}>
          <div className={`w-11 h-11 rounded-xl overflow-hidden border flex items-center justify-center shrink-0
            ${isPro ? 'bg-orange-50 border-orange-200' : 'bg-white/5 border-neon-orange/30'}`}>
            {teamInfo?.clubLogo
              ? <img src={teamInfo.clubLogo} alt="Logo" className="w-full h-full object-contain p-1" />
              : <ShieldCheck size={22} className={isPro ? 'text-orange-600' : 'text-neon-orange'} />}
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-black uppercase italic truncate ${isPro ? 'text-gray-900' : 'text-white'}`}>
              {teamInfo?.clubName || 'Mon Club'}
            </p>
            <p className="text-[9px] font-bold uppercase text-gray-400">{teamInfo?.category} · {teamInfo?.level}</p>
          </div>
        </Link>

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map(item => {
            const active = pathname === item.path || pathname?.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all
                  ${active
                    ? isPro ? 'bg-orange-600 text-white shadow-md' : 'bg-neon-orange text-black shadow-md'
                    : isPro ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* CRÉER */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className={`mt-6 flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black uppercase italic tracking-wide active:scale-95 transition-all shadow-lg
            ${isPro ? 'bg-orange-600 text-white' : 'bg-neon-orange text-black'}`}
        >
          <Plus size={18} strokeWidth={3} /> Créer
        </button>

        {/* BAS : PROFIL & RÉGLAGES */}
        <div className={`mt-auto pt-4 border-t flex flex-col gap-1.5 ${isPro ? 'border-gray-100' : 'border-white/[0.06]'}`}>
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all
              ${pathname === '/profile'
                ? isPro ? 'bg-orange-600 text-white' : 'bg-neon-orange text-black'
                : isPro ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
          >
            <User size={18} /> Mon profil
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all
              ${pathname === '/settings'
                ? isPro ? 'bg-orange-600 text-white' : 'bg-neon-orange text-black'
                : isPro ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={18} /> Réglages
          </Link>
        </div>
      </aside>

      <CreateMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} context={getContext()} />
    </>
  );
}
