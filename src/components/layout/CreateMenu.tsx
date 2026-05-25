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
  Bell,
  Bug,
  Lightbulb,
  Edit3,
  Settings
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';

interface CreateMenuProps {
  isOpen: boolean;
  onClose: () => void;
  context: string;
}

/**
 * CREATE_MENU (v12.0 - MASTER CLASSIC)
 * Menu contextuel central pour les actions rapides.
 */
export function CreateMenu({ isOpen, onClose, context }: CreateMenuProps) {
  const { theme } = useTeam();
  if (!isOpen) return null;

  const getMenuItems = () => {
    const isClassic = theme === 'classic';

    // FEEDBACKS ALPHA (Toujours présent)
    const feedbackItems = [
      {
        label: 'Signaler Bug',
        desc: 'Aide-nous à corriger l\'application',
        color: 'bg-red-600',
        icon: <Bug size={24} />,
        href: '/settings'
      }
    ];

    let items = [];

    switch (context) {
      case 'profile':
        items = [
          { label: 'Modifier Profil', desc: 'Mettre à jour mes informations', color: 'bg-orange-600', icon: <Edit3 size={24} />, href: '/profile/edit' },
          { label: 'Mon Agenda', desc: 'Consulter mes matchs et tournois', color: 'bg-white text-gray-900 border-gray-200', icon: <Calendar size={24} className="text-orange-600" />, href: '/events' },
          { label: 'Paramètres', desc: 'Options de l\'application', color: 'bg-gray-100 text-gray-600', icon: <Settings size={24} />, href: '/settings' },
        ];
        break;
      case 'radar':
        items = [
          { label: 'Match Amical', desc: 'Chercher un adversaire', color: 'bg-orange-600', icon: <Handshake size={24} />, href: '/radar/new' },
          { label: 'Tournoi', desc: 'Organiser ou participer', color: 'bg-yellow-500', icon: <Trophy size={24} />, href: '/radar/new' },
          { label: 'Plateau', desc: 'Organiser un rassemblement', color: 'bg-blue-500', icon: <Radar size={24} />, href: '/radar/new' },
        ];
        break;
      case 'team':
        items = [
          { label: 'Ajouter Joueur', desc: 'Enregistrer une nouvelle recrue', color: 'bg-blue-600', icon: <UserPlus size={24} />, href: '/team/new' },
          { label: 'Lancer Convocation', desc: 'Sélectionner l\'équipe du week-end', color: 'bg-orange-600', icon: <Send size={24} />, href: '/team' },
        ];
        break;
      case 'com':
        items = [
          { label: 'Flash Info', desc: 'Diffuser une information importante', color: 'bg-orange-600', icon: <Bell size={24} />, href: '/comms/new' },
          { label: 'Nouveau Sondage', desc: 'Questionner le groupe', color: 'bg-blue-600', icon: <BarChart2 size={24} />, href: '/comms/new' },
        ];
        break;
      default:
        items = [
          { label: 'Agenda', desc: 'Entraînements, Matchs...', color: 'bg-orange-600', icon: <Calendar size={24} />, href: '/events' },
          { label: 'Radar Match', desc: 'Chercher des adversaires', color: 'bg-blue-600', icon: <Radar size={24} />, href: '/radar' },
        ];
    }

    return [...items, ...feedbackItems];
  };

  const menuItems = getMenuItems();

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-[3rem] p-8 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8 px-2 text-left">
          <h2 className="text-3xl font-black text-gray-900 italic uppercase tracking-tighter">
            {context === 'profile' ? 'Mon Compte' : context === 'radar' ? 'Matchmaking' : context === 'team' ? 'Effectif' : 'Actions'}
          </h2>
          <button onClick={onClose} className="bg-gray-100 p-3 rounded-full text-gray-400 active:scale-90 transition-transform">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
          {menuItems.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              onClick={onClose}
              className={`${item.color} w-full rounded-[2rem] p-5 flex items-center gap-5 shadow-lg active:scale-[0.98] transition-all text-left group border border-black/5`}
            >
              <div className={`w-12 h-12 ${item.color.includes('bg-white') ? 'bg-gray-100' : 'bg-white/20'} rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform flex-shrink-0`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-black text-lg leading-none uppercase italic block mb-1 tracking-tight ${item.color.includes('text-gray') ? 'text-gray-900' : 'text-white'}`}>{item.label}</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest block truncate ${item.color.includes('text-gray') ? 'text-gray-400' : 'text-white/70'}`}>{item.desc}</span>
              </div>
              <ChevronRight size={20} className={`${item.color.includes('text-gray') ? 'text-gray-300' : 'text-white/40'} group-hover:translate-x-1 transition-transform`} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
