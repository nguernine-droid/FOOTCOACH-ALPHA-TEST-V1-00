'use client';

import React from 'react';
import { Users, ChevronRight, Check } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================
type PlayerStatus = 'active' | 'doubt' | 'inactive';

export interface SquadPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  status: PlayerStatus;
  poste?: string; // Optionnel pour affichage
}

interface SquadOverviewProps {
  players: SquadPlayer[];
  selectedIds?: string[]; // IDs des joueurs sélectionnés pour une action
  onSelect?: (id: string) => void; // Callback de sélection
  isPro: boolean; // Pour le switch de thème
}

// ==========================================
// CONFIGURATION DES STATUTS
// ==========================================
const statusConfig = {
  active: {
    label: 'Opérationnel',
    dotColor: 'bg-[#39FF14] shadow-[0_0_8px_#39FF14]',
    dotColorPro: 'bg-green-500'
  },
  doubt: {
    label: 'En doute',
    dotColor: 'bg-neon-orange shadow-[0_0_8px_#FF6B00]',
    dotColorPro: 'bg-orange-500'
  },
  inactive: {
    label: 'Indisponible',
    dotColor: 'bg-red-500 shadow-[0_0_8px_#FF0000]',
    dotColorPro: 'bg-red-500'
  },
};

export function SquadOverview({ players, selectedIds = [], onSelect, isPro }: SquadOverviewProps) {

  const activeCount = players.filter(p => p.status === 'active').length;

  return (
    <section className="space-y-4">
      {/* Header de la section */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Users size={16} className={isPro ? 'text-orange-600' : 'text-neon-orange'} />
          <h3 className={`text-xs font-black uppercase tracking-widest ${isPro ? 'text-gray-900' : 'text-white'}`}>
            Fil d'Info
          </h3>
          <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
            isPro ? 'border-gray-200 text-gray-500 bg-gray-100' : 'border-white/10 text-gray-400 bg-white/5'
          }`}>
            {activeCount}/{players.length}
          </span>
        </div>
        <button className={`text-[9px] font-black uppercase flex items-center gap-1 transition-colors ${
          isPro ? 'text-orange-600 hover:text-orange-700' : 'text-neon-cyan hover:text-white'
        }`}>
          Voir tout <ChevronRight size={12} />
        </button>
      </div>

      {/* Grille scrollable des joueurs */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {players.map((player) => {
          const isSelected = selectedIds.includes(player.id);
          const status = statusConfig[player.status];

          return (
            <button
              key={player.id}
              onClick={() => onSelect?.(player.id)}
              className={`flex flex-col items-center gap-2 flex-shrink-0 group transition-all active:scale-95 relative ${
                onSelect ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Container Avatar */}
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl border-2 overflow-hidden transition-all group-hover:scale-105 ${
                  isSelected
                    ? (isPro ? 'border-orange-600 shadow-md' : 'border-neon-cyan shadow-[0_0_15px_#00F0FF]')
                    : (isPro ? 'border-gray-200 bg-white' : 'border-white/10 bg-white/5')
                }`}>
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay de sélection (Check) */}
                  {isSelected && (
                    <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                      isPro ? 'bg-orange-500/30' : 'bg-neon-cyan/30'
                    }`}>
                      <Check size={24} className={isPro ? 'text-white' : 'text-black'} strokeWidth={4} />
                    </div>
                  )}
                </div>

                {/* Pastille de Statut */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                  isPro ? 'border-white' : 'border-[#050510]'
                } ${isPro ? status.dotColorPro : status.dotColor}`} />
              </div>

              {/* Nom du joueur */}
              <div className="text-center">
                <span className={`text-[9px] font-black uppercase truncate w-16 block transition-colors ${
                  isSelected
                    ? (isPro ? 'text-orange-600' : 'text-neon-cyan')
                    : (isPro ? 'text-gray-700' : 'text-gray-400')
                }`}>
                  {player.name.split(' ')[0]}
                </span>
                {player.poste && (
                  <span className={`text-[7px] font-bold uppercase block ${
                    isPro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {player.poste}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
