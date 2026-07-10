'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { LayoutDashboard, Radar, CalendarDays, UserCircle, Plus, Rss, Megaphone, Users } from 'lucide-react';
import { CreateMenu } from './CreateMenu';
import { isFeatureEnabled } from '@/lib/config/features';

/**
 * BOTTOM_NAV — Alpha V1.3
 * Ajout de l'Effectif pour un contrôle total de l'unité
 */
export function BottomNav() {
  const { theme } = useTeam();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isPro = theme === 'classic';
  const isProfilePage = pathname === '/profile';

  const navItems = [
    {
      label: isPro ? 'Accueil'   : 'Cockpit',
      icon:  LayoutDashboard,
      path:  '/dashboard',
    },
    {
      label: isPro ? 'Fil'       : 'Actu',
      icon:  Rss,
      path:  '/feed',
    },
    {
      label: isPro ? 'Briefing'  : 'Comms',
      icon:  Megaphone,
      path:  '/comms',
    },
    {
      label: isPro ? 'Effectif'  : 'Unités',
      icon:  Users,
      path:  '/team',
    },
    {
      label: isPro ? 'Annonces'  : 'Radar',
      icon:  Radar,
      path:  '/radar',
    },
    {
      label: isPro ? 'Agenda'    : 'Planning',
      icon:  CalendarDays,
      path:  '/events',
    },
    {
      label: isPro ? 'Profil'    : 'Identité',
      icon:  UserCircle,
      path:  '/profile',
    },
  ];

  const accentColor = isPro
    ? 'bg-orange-600 shadow-orange-300'
    : 'bg-neon-cyan shadow-[0_0_15px_#00F0FF]';

  const getContext = () => {
    if (pathname?.startsWith('/radar'))   return 'radar';
    if (pathname?.startsWith('/events'))  return 'events';
    if (pathname?.startsWith('/profile')) return 'profile';
    return 'default';
  };

  return (
    <>
      <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-xl border-t px-1 py-3 z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.6)]
        ${isPro ? 'bg-white/95 border-gray-100' : 'bg-black/90 border-white/10'}`}>

        <div className="flex items-end justify-between px-2">

          {/* Items gauche (3 items) */}
          <div className="flex flex-1 justify-around items-end">
            {navItems.slice(0, 3).map(item => (
              <NavItem
                key={item.path}
                href={item.path}
                icon={<item.icon size={18} />}
                label={item.label}
                active={pathname === item.path || pathname?.startsWith(item.path + '/')}
                isPro={isPro}
              />
            ))}
          </div>

          {/* Bouton central + */}
          <div className="flex flex-col items-center -mt-8 px-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`${accentColor} text-black p-3.5 rounded-2xl active:scale-90 transition-all border-4 shadow-2xl
                ${isPro ? 'border-white' : 'border-black'}`}
            >
              <Plus size={22} strokeWidth={4} />
            </button>
            <span className={`text-[6px] uppercase tracking-tighter mt-1 font-black
              ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>
              Créer
            </span>
          </div>

          {/* Items droite (4 items) */}
          <div className="flex-[1.3] flex justify-around items-end">
            {navItems.slice(3, 7).map(item => (
              <NavItem
                key={item.path}
                href={item.path}
                icon={<item.icon size={18} />}
                label={item.label}
                active={pathname === item.path || pathname?.startsWith(item.path + '/')}
                isPro={isPro}
              />
            ))}
          </div>

        </div>
      </nav>

      <CreateMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        context={getContext()}
      />
    </>
  );
}

function NavItem({
  href, icon, label, active, isPro
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  isPro: boolean;
}) {
  const activeColor = isPro ? 'text-orange-600' : 'text-neon-cyan';
  const inactiveColor = isPro ? 'text-gray-400' : 'text-gray-500';

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 transition-all duration-200 flex-1 min-w-0 px-0.5
        ${active ? `${activeColor} scale-110` : inactiveColor}`}
    >
      <div className={active ? 'drop-shadow-[0_0_6px_currentColor]' : ''}>
        {icon}
      </div>
      <span className={`text-[8px] uppercase tracking-tighter whitespace-nowrap ${active ? 'font-black' : 'font-bold'}`}>
        {label}
      </span>
      {active && (
        <div className={`w-1 h-1 rounded-full ${isPro ? 'bg-orange-600' : 'bg-neon-cyan'}`} />
      )}
    </Link>
  );
}
