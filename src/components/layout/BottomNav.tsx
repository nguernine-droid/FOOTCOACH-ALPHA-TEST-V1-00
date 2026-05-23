'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { Home, Radar, Users, Plus, Megaphone, Lock } from 'lucide-react';
import { CreateMenu } from './CreateMenu';

/**
 * BOTTOM_NAV (v8.6 - ALPHA TEST V1)
 * Bridage : Accès Équipe bloqué pour cette version.
 */
export function BottomNav() {
  const { theme } = useTeam();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Fil', icon: Home, path: '/dashboard' },
    { label: 'Radar', icon: Radar, path: '/radar' },
    { label: 'Équipe', icon: Users, path: '/team', locked: true }, // BLOQUÉ
    { label: 'Briefing', icon: Megaphone, path: '/comms' },
  ];

  const getPlusColor = () => {
    if (pathname === '/dashboard') return 'bg-neon-cyan shadow-[0_0_15px_#00F0FF]';
    if (pathname === '/radar') return 'bg-neon-orange shadow-[0_0_15px_#FF6B00]';
    return 'bg-[#39FF14] shadow-[0_0_15px_#39FF14]';
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex justify-between items-end z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">

        {/* Gauche : Fil & Radar */}
        <div className="flex justify-around flex-1">
          {navItems.slice(0, 2).map((link) => (
            <NavItem
              key={link.path}
              href={link.path}
              icon={<link.icon size={20} />}
              label={link.label}
              active={pathname === link.path}
              theme={theme}
            />
          ))}
        </div>

        {/* CENTRAL : BOUTON PLUS */}
        <div className="flex flex-col items-center -mt-10 px-2">
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`${getPlusColor()} text-black p-4 rounded-2xl active:scale-90 transition-all mb-2 border-2 border-black relative group overflow-hidden shadow-2xl`}
          >
            <Plus size={32} strokeWidth={4} />
          </button>
        </div>

        {/* Droite : Équipe (Bloqué) & Annonces */}
        <div className="flex justify-around flex-1">
          {navItems.slice(2, 4).map((link) => (
            <NavItem
              key={link.path}
              href={link.path}
              icon={link.locked ? <Lock size={18} /> : <link.icon size={20} />}
              label={link.label}
              active={pathname === link.path}
              theme={theme}
              locked={link.locked}
            />
          ))}
        </div>
      </nav>

      <CreateMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        context={pathname === '/radar' ? 'radar' : pathname === '/team' ? 'team' : 'default'}
      />
    </>
  );
}

function NavItem({ href, icon, label, active, theme, locked }: { href: string, icon: React.ReactNode, label: string, active: boolean, theme: string, locked?: boolean }) {
  const activeColor = theme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange';

  if (locked) {
    return (
      <button
        onClick={() => alert("🚧 MODULE EN DÉVELOPPEMENT\nL'accès à l'effectif complet sera débloqué après la phase Alpha.")}
        className="flex flex-col items-center gap-1 opacity-30 grayscale cursor-not-allowed"
      >
        <div>{icon}</div>
        <span className="text-[8px] uppercase tracking-tighter">{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? `${activeColor} scale-110 font-black` : 'text-gray-600 font-bold hover:text-gray-400'}`}
    >
      <div className={active ? 'drop-shadow-[0_0_8px_currentColor]' : ''}>
        {icon}
      </div>
      <span className="text-[8px] uppercase tracking-tighter">{label}</span>
    </Link>
  );
}
