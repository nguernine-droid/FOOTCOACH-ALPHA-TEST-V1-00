'use client';

import React from 'react';
import { CheckCircle, ChevronRight } from 'lucide-react';

interface PlayerRowProps {
  player: any;
  onClick: (player: any) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

const getAvatarUrl = (name: string, size = 50) =>
  `https://i.pravatar.cc/${size}?u=${encodeURIComponent(name)}`;

const getCardStyle = (rating: number) => {
  if (rating >= 85) return 'border-[#D4AF37]';
  if (rating >= 75) return 'border-[#C0C0C0]';
  return 'border-[#CD7F32]';
};

const getStatusStyle = (status: string) => {
  if (status === 'Actif') return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (status === 'Blessé') return 'bg-red-500/10 text-red-500 border-red-500/20';
  return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
};

export function PlayerRow({ player, onClick, isSelectionMode, isSelected, onToggleSelect }: PlayerRowProps) {
  return (
    <div
      onClick={() => isSelectionMode ? onToggleSelect(player.id) : onClick(player)}
      className={`flex items-center gap-4 p-5 cursor-pointer transition-all border-b border-gray-50 last:border-b-0 group ${
        isSelected ? 'bg-brand-orange/5' : 'hover:bg-gray-50'
      }`}
    >
      {isSelectionMode ? (
         <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-brand-orange border-brand-orange shadow-lg' : 'border-gray-200'}`}>
           {isSelected && <CheckCircle size={14} className="text-white" />}
         </div>
      ) : (
        <div className={`w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border-2 shadow-sm ${getCardStyle(player.rating)}`}>
          <img src={getAvatarUrl(player.name, 100)} alt={player.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-black text-gray-900 truncate text-sm uppercase italic tracking-tight">{player.name}</h4>
          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusStyle(player.status)}`}>
            {player.status}
          </span>
        </div>
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
          {player.position} • {player.buts} buts • {player.passes} passes
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm border border-white/5">
          {player.rating}
        </div>
        {!isSelectionMode && (
          <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-orange transition-colors" />
        )}
      </div>
    </div>
  );
}
