'use client';

import React from 'react';
import { CheckCircle, Activity, Zap, Target } from 'lucide-react';

interface PlayerCardProps {
  player: any;
  onClick: (player: any) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

const getAvatarUrl = (name: string, size = 150) =>
  `https://i.pravatar.cc/${size}?u=${encodeURIComponent(name)}`;

export function PlayerCard({ player, onClick, isSelectionMode, isSelected, onToggleSelect }: PlayerCardProps) {
  return (
    <div
      onClick={() => isSelectionMode ? onToggleSelect(player.id) : onClick(player)}
      className={`bg-[#1D2027] rounded-[2.5rem] relative overflow-hidden shadow-lg transition-all cursor-pointer group border-2 ${
        isSelected ? 'border-neon-orange ring-4 ring-neon-orange/20' : 'border-neon-orange/20 hover:border-neon-orange/50'
      } flex flex-col h-full active:scale-[0.98] duration-300`}
    >
      {/* Subtle overlay background */}
      <div className="absolute inset-0 bg-neon-orange/[0.02] pointer-events-none" />

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-orange/30 rounded-tl-[2.5rem]" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-orange/30 rounded-br-[2.5rem]" />

      {isSelectionMode && (
        <div className={`absolute top-4 right-4 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-neon-orange border-neon-orange shadow-sm' : 'bg-black/50 border-white/30'}`}>
          {isSelected && <CheckCircle size={14} className="text-black" strokeWidth={3} />}
        </div>
      )}

      {/* Content Container */}
      <div className="p-5 pt-8 flex flex-col items-center flex-1 relative z-10">

        {/* Top Header Row */}
        <div className="w-full flex justify-between items-start mb-4">
          <div className="text-left font-mono">
            <p className="text-4xl font-black text-white leading-none tracking-tighter">{player.rating}</p>
            <p className="text-[9px] font-black text-neon-orange uppercase italic tracking-widest mt-1">{player.position}</p>
          </div>
          <div className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase border font-mono tracking-widest ${
            player.status === 'Actif' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 'bg-neon-magenta/10 text-neon-magenta border-neon-magenta/30 animate-pulse'
          }`}>
            {player.status === 'Actif' ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>

        {/* Square Rounded Photo with Cyber Border */}
        <div className="relative mb-4 group-hover:scale-105 transition-transform duration-500">
           <div className="absolute inset-0 bg-neon-orange/20 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
           <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-neon-orange/20 shadow-lg relative bg-gray-900">
              <img
                src={getAvatarUrl(player.name, 200)}
                alt={player.name}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
           </div>
        </div>

        {/* Name */}
        <h4 className="font-black text-sm text-white text-center uppercase italic tracking-tight mb-5 px-1 leading-tight line-clamp-1 group-hover:text-neon-orange transition-colors">
          {player.name}
        </h4>

        {/* Mini Stats Grid */}
        <div className="w-full space-y-3 bg-white/[0.03] border border-white/5 rounded-2xl p-4 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1"><Zap size={8} className="text-neon-orange" /> POWER</span>
            <span className="text-[10px] font-black text-white">{player.rating}</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
             <div className="h-full bg-neon-orange" style={{ width: `${player.rating}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[6px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1"><Target size={7} /> ACC</span>
              <span className="text-[9px] font-black text-white">{player.assiduite}%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[6px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1"><Activity size={7} /> BIO</span>
              <span className="text-[9px] font-black text-white">{player.technique}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
