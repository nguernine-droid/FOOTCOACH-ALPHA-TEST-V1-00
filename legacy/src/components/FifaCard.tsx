'use client';

import React from 'react';
import { Shield, X, Share2 } from 'lucide-react';

interface FifaCardProps {
  name: string;
  team: string;
  score: number;
  label: string;
  color?: string;
  textColor?: string;
  image?: string;
  clubLogo?: string;
  stats: { label: string; value: string | number }[];
  onClose?: () => void;
  variant?: 'classic' | 'cyber';
}

export function FifaCard({
  name,
  team,
  score,
  label,
  color = "from-[#FFD700] via-[#FDB931] to-[#D4AF37]",
  textColor = "text-[#4D3319]",
  image,
  clubLogo,
  stats,
  onClose,
  variant = 'classic'
}: FifaCardProps) {
  return (
    <div className={`relative animate-in fade-in zoom-in duration-500 max-w-sm mx-auto shadow-2xl ${variant === 'cyber' ? 'after:absolute after:inset-0 after:rounded-[2.5rem] after:border-2 after:border-neon-orange/60 after:animate-soft-pulse after:pointer-events-none' : ''}`}>
      <div className={`bg-gradient-to-br ${color} rounded-[2.5rem] p-1 overflow-hidden flex flex-col relative border-2 border-white/20`}>
        <div className="bg-white/10 absolute inset-0 mix-blend-overlay" />

        {onClose && (
          <button
            onClick={onClose}
            className={`absolute top-6 right-6 z-50 p-2 rounded-full bg-white/20 backdrop-blur-md ${textColor} hover:bg-white/40 transition-colors`}
          >
            <X size={20} strokeWidth={3} />
          </button>
        )}

        <div className="relative flex-1 p-8 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-4">
            <div className="text-center">
              <div className={`text-6xl font-black ${textColor} leading-none`}>{score}</div>
              <div className={`text-[10px] font-black ${textColor} tracking-[0.3em] mt-1 uppercase opacity-70`}>{label}</div>
            </div>

            <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 flex items-center justify-center bg-black/20`}>
              {clubLogo ? (
                <img src={clubLogo} alt="Club" className="w-full h-full object-contain p-1" />
              ) : (
                <Shield className={`w-8 h-8 ${textColor} opacity-20`} />
              )}
            </div>
          </div>

          <div className="relative mt-2">
            <div className={`w-40 h-40 rounded-full border-4 border-white/30 p-1 bg-white/10 backdrop-blur-sm shadow-2xl`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                <img
                  src={image || "https://images.unsplash.com/photo-1637559508411-e6d65573efff?q=80&w=400"}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <h2 className={`text-2xl font-black ${textColor} tracking-tight uppercase`}>{name}</h2>
            <p className={`text-[10px] font-bold ${textColor} tracking-[0.1em] uppercase opacity-60 mt-1`}>{team}</p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-x-8 gap-y-4 w-full px-4">
            {stats.slice(0, 6).map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-lg font-black ${textColor}`}>{stat.value}</div>
                <div className={`text-[8px] font-black ${textColor} opacity-50 uppercase`}>{stat.label}</div>
              </div>
            ))}
          </div>

          <button className={`w-full mt-8 bg-white/20 backdrop-blur-md font-black py-4 rounded-3xl flex items-center justify-center gap-3 border border-white/30 active:scale-95 transition-transform ${textColor} text-[10px] uppercase`}>
            <Share2 size={16} /> PARTAGER MA CARTE
          </button>
        </div>
      </div>
    </div>
  );
}
