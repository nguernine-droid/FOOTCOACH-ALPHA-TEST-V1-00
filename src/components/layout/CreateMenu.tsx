'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Play,
  Trophy,
  Users,
  Megaphone,
  Calendar,
  ChevronRight,
  Radar,
  UserPlus,
  Send,
  BarChart2,
  Clock,
  Handshake,
  Bell
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';

interface CreateMenuProps {
  isOpen: boolean;
  onClose: () => void;
  context: string;
}

export function CreateMenu({ isOpen, onClose, context }: CreateMenuProps) {
  const { theme } = useTeam();
  if (!isOpen) return null;

  const getMenuItems = () => {
    const isClassic = theme === 'classic';

    switch (context) {
      case 'radar':
        return [
          { label: 'Match Amical', desc: 'Rechercher un adversaire pour un amical', color: 'bg-neon-orange', icon: <Handshake size={26} />, href: '/radar/new' },
          { label: 'Tournoi', desc: 'S\'inscrire ou proposer un tournoi', color: 'bg-purple-600', icon: <Trophy size={26} />, href: '/radar/new' },
          { label: 'Plateau', desc: 'Organiser un plateau U6-U9', color: 'bg-match-red', icon: <Radar size={26} />, href: '/radar/new' },
        ];
      case 'team':
        return [
          { label: 'Ajouter Joueur', desc: 'Enregistrer une nouvelle recrue', color: 'bg-neon-cyan', icon: <UserPlus size={26} />, href: '/team/new' },
          { label: 'Lancer Convocation', desc: 'Sélectionner les joueurs pour le week-end', color: 'bg-neon-orange', icon: <Send size={26} />, href: '/team' },
        ];
      case 'com':
        return [
          {
            label: 'Flash Info',
            desc: isClassic ? 'Diffusez une information importante à vos joueurs' : 'Diffuser une information importante à vos troupes',
            color: isClassic ? 'bg-orange-600' : 'bg-neon-cyan',
            icon: <Bell size={26} />,
            href: '/comms/new'
          },
          {
            label: 'Nouveau Sondage',
            desc: 'Questionner les parents/joueurs',
            color: isClassic ? 'bg-blue-600' : 'bg-purple-500',
            icon: <BarChart2 size={26} />,
            href: '/comms/new'
          },
        ];
      case 'calendar':
        return [
          { label: 'Entraînement', desc: 'Placer une séance sur le planning', color: 'bg-neon-cyan', icon: <Play size={26} />, href: '/events/new' },
          { label: 'Match', desc: 'Ajouter une rencontre officielle', color: 'bg-match-red', icon: <Trophy size={26} />, href: '/events/new' },
          { label: 'Sondage Dispo', desc: 'Vérifier qui est disponible pour une date', color: 'bg-neon-green', icon: <Clock size={26} />, href: '/events/new' },
        ];
      default:
        return [
          { label: 'Calendrier', desc: 'Entraînements, Matchs...', color: 'bg-neon-cyan', icon: <Calendar size={26} />, href: '/events' },
          { label: 'Radar Tactique', desc: 'Rechercher des adversaires', color: 'bg-neon-orange', icon: <Radar size={26} />, href: '/radar' },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-dark-card rounded-[3rem] p-8 shadow-2xl border border-white/5 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-10 px-2">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter text-left">
            {context === 'radar' ? 'Matchmaking' : context === 'team' ? 'Effectif' : context === 'com' ? 'Briefing' : context === 'calendar' ? 'Planning' : 'Kick-off'}
          </h2>
          <button onClick={onClose} className="bg-white/5 p-3 rounded-full text-gray-400 active:scale-90 transition-transform">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-4 mb-4">
          {menuItems.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              onClick={onClose}
              className={`${item.color} w-full rounded-[2rem] p-6 flex items-center gap-5 text-white shadow-lg active:scale-[0.98] transition-all text-left group border border-white/10`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-black text-xl leading-none uppercase italic block mb-1 tracking-tight text-left">{item.label}</span>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest block truncate text-left">{item.desc}</span>
              </div>
              <ChevronRight size={22} className="text-white/40 group-hover:text-white transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
