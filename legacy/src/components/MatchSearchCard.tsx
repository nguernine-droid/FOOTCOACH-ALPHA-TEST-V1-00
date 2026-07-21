'use client';

import React from 'react';
import { X, Flame, Activity, Moon, Shield } from 'lucide-react';

interface MatchSearchCardProps {
  name: string;
  team: string;
  category: string;
  score: number;
  label: string;
  color: string; // Sera surchargé par la logique interne
  textColor: string; // Sera surchargé par la logique interne
  image?: string;
  stats: { label: string; value: string | number }[];
  isActive: boolean;
  isHot: boolean;
  onClose: () => void;
}

export function MatchSearchCard({
  name,
  team,
  category,
  score,
  label,
  image,
  stats,
  isActive,
  isHot,
  onClose,
}: MatchSearchCardProps) {

  // 1. Logique des flammes (5=1, 10=2, 15=3)
  const getFlameCount = () => {
    const playedStat = stats.find(s => s.label === 'DEP' || s.label === 'JOU');
    const count = playedStat ? Number(playedStat.value) : 0;
    if (count >= 15) return 3;
    if (count >= 10) return 2;
    if (count >= 5) return 1;
    return 0;
  };

  const flames = getFlameCount();

  // 2. Logique du style (Couleur selon statut)
  const getCardStyle = () => {
    if (isHot) {
      return {
        gradient: "from-brand-orange via-orange-500 to-brand-orange-dark",
        text: "text-white",
        statusText: "Toujours chaud pour match",
        statusBg: "bg-black/30",
        statusIcon: <Flame size={10} className="fill-white" />
      };
    }
    if (isActive) {
      return {
        gradient: "from-grass-green via-green-600 to-grass-green-dark",
        text: "text-white",
        statusText: "Actif : Demande amical",
        statusBg: "bg-black/20",
        statusIcon: <Activity size={10} />
      };
    }
    return {
      gradient: "from-slate-400 via-slate-500 to-slate-600",
      text: "text-white/90",
      statusText: "En sommeil",
      statusBg: "bg-black/40",
      statusIcon: <Moon size={10} />
    };
  };

  const style = getCardStyle();

  return (
    <div className="w-full max-w-[320px] relative animate-in fade-in zoom-in-95 duration-300 drop-shadow-2xl">
      <div className={`relative bg-gradient-to-br ${style.gradient} rounded-[2.5rem] p-6 overflow-hidden border border-white/20 shadow-2xl`}>
        {/* Reflets FIFA */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />

        {/* Bouton fermer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-50 p-2.5 bg-black/30 rounded-full text-white hover:bg-black/50 transition-all active:scale-90"
        >
          <X size={18} strokeWidth={3} />
        </button>

        {/* Header : Statut & Flammes */}
        <div className="flex flex-col gap-2 items-start mb-6">
          <div className={`${style.statusBg} text-white text-[9px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm border border-white/10`}>
            {style.statusIcon} {style.statusText}
          </div>
          {flames > 0 && (
            <div className="flex gap-0.5 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-inner">
              {Array.from({ length: flames }).map((_, i) => (
                <Flame key={i} size={12} className="text-orange-300 fill-orange-500 animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* Photo & Score Row */}
        <div className="flex justify-between items-start mb-6 px-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl border-4 border-white/20 p-1 bg-white/10 backdrop-blur-sm shadow-xl">
              <div className="w-full h-full rounded-xl overflow-hidden bg-gray-200">
                <img
                  src={image || "https://images.unsplash.com/photo-1637559508411-e6d65573efff?q=80&w=400"}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {isHot && (
              <div className="absolute -bottom-2 -right-2 bg-brand-orange text-white p-1.5 rounded-lg shadow-lg border-2 border-white animate-bounce">
                <Flame size={14} fill="currentColor" />
              </div>
            )}
          </div>

          <div className={`text-right ${style.text}`}>
            <div className="text-6xl font-black leading-none tracking-tighter">{score}</div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
          </div>
        </div>

        {/* Info Coach & Club */}
        <div className={`mt-2 ${style.text}`}>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black leading-tight uppercase truncate">{name}</h3>
            <span className="bg-black/10 px-2 py-0.5 rounded-lg text-[10px] font-black border border-white/10">{category}</span>
          </div>
          <p className="text-xs font-bold uppercase opacity-80 tracking-wide mt-1">{team}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-6 relative z-10">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-black/15 backdrop-blur-md rounded-2xl py-2.5 text-center border border-white/5 shadow-inner">
              <div className={`text-[8px] font-bold uppercase opacity-50 ${style.text}`}>{stat.label}</div>
              <div className={`text-sm font-black ${style.text}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button className="w-full mt-6 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[11px] font-black uppercase py-4 rounded-2xl border border-white/10 active:scale-95 transition-all shadow-xl">
          {isActive ? 'Répondre à la demande' : 'Contacter le coach'}
        </button>
      </div>
    </div>
  );
}
