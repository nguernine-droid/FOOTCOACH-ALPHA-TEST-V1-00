'use client';

import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface Signal {
  id: number;
  label: string;
  x: number;
  y: number;
  type: 'search' | 'propose';
  team: string;
  coach: string;
  logo?: string;
  [key: string]: any;
}

interface TacticalMapProps {
  signals: Signal[];
  onSignalClick: (signal: Signal) => void;
}

export function TacticalMap({ signals, onSignalClick }: TacticalMapProps) {
  return (
    <div className="relative aspect-square w-full bg-[#0a1a0a] rounded-[2.5rem] overflow-hidden border border-grass-green/20 mb-10 shadow-2xl">
      {/* Simulation d'une carte avec une grille tactique */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #22C55E 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}
      />

      {/* Rues simulées / Lignes tactiques */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        <path d="M0 100 Q 150 150 300 50 T 600 200" stroke="#22C55E" strokeWidth="2" fill="none" />
        <path d="M100 0 Q 200 300 50 600" stroke="#22C55E" strokeWidth="1" fill="none" />
        <path d="M400 0 Q 350 200 500 600" stroke="#22C55E" strokeWidth="1" fill="none" />
      </svg>

      {/* Marqueurs des clubs */}
      {signals.map((sig) => (
        <button
          key={sig.id}
          onClick={() => onSignalClick(sig)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all hover:z-50 active:scale-110"
          style={{
            left: `${sig.x}%`,
            top: `${sig.y}%`,
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Tooltip nom de l'équipe (Visible au hover ou tout le temps en petit) */}
            <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[8px] font-black text-white whitespace-nowrap uppercase">{sig.team}</p>
            </div>

            <div className={`relative w-10 h-10 flex items-center justify-center rounded-2xl shadow-xl transition-transform border-2 ${
              sig.type === 'search'
                ? 'bg-brand-orange border-white/20'
                : 'bg-grass-green border-white/20'
            }`}>
              {sig.logo ? (
                <div className="w-full h-full rounded-2xl overflow-hidden bg-white p-0.5">
                  <img src={sig.logo} alt={sig.team} className="w-full h-full object-cover rounded-xl" />
                </div>
              ) : (
                <span className="text-[10px] font-black text-white">{sig.label}</span>
              )}

              {/* Petite flèche en bas du marqueur */}
              <div className={`absolute -bottom-1.5 w-3 h-3 rotate-45 border-r-2 border-b-2 ${
                sig.type === 'search' ? 'bg-brand-orange border-white/20' : 'bg-grass-green border-white/20'
              }`} />
            </div>
          </div>
        </button>
      ))}

      {/* Ma Position (Centre) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 w-8 h-8 bg-sky-blue/40 rounded-full animate-ping" />
          <div className="w-6 h-6 bg-sky-blue rounded-full border-4 border-[#0a1a0a] shadow-[0_0_15px_#3B82F6] flex items-center justify-center">
            <Navigation size={10} className="text-white fill-white" />
          </div>
        </div>
      </div>

      {/* Label "LIVE MAP" */}
      <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-match-red rounded-full animate-pulse" />
        <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">Live Map</span>
      </div>
    </div>
  );
}
