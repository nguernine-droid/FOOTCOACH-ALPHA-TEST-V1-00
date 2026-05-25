'use client';

import React from 'react';
import { Shield, Flame, CheckCircle2, Navigation, Zap, Trophy, Layers, TrendingUp, User, Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CoachCardProps {
  name: string;
  clubName: string;
  clubLogo?: string;
  coachPhoto?: string;
  category: string;
  points: number;
  status: 'inactif' | 'actif' | 'toujours_pret';
  matchesPlayed: number;
  announcementsSent: number;
  contactsMade: number;
  engagementRate: number;
}

/**
 * COACH_CARD (v16.0 - PRESTIGE BADGE ONLY)
 * Design "Objet de Collection" sans flip interne.
 * Optimisé pour TA photo réelle.
 */
export function CoachCard({
  name, clubName, clubLogo, coachPhoto, category, points, status,
  matchesPlayed, announcementsSent, contactsMade, engagementRate
}: CoachCardProps) {

  const statusThemes = {
    'inactif': { border: 'border-blue-500', glow: 'shadow-[0_0_40px_rgba(59,130,246,0.3)]', accent: 'text-blue-400', indicator: 'bg-blue-500' },
    'actif': { border: 'border-[#39FF14]', glow: 'shadow-[0_0_40px_rgba(57,255,20,0.2)]', accent: 'text-[#39FF14]', indicator: 'bg-[#39FF14]' },
    'toujours_pret': { border: 'border-red-600', glow: 'shadow-[0_0_40px_rgba(220,38,38,0.3)]', accent: 'text-red-500', indicator: 'bg-red-600' }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  return (
    <div className={`w-full max-w-[340px] h-[630px] bg-black flex flex-col p-1 border-[5px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden relative shadow-2xl transition-transform active:scale-[0.98]`}>

      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      <div className="relative flex-1 flex flex-col p-6 space-y-6 z-10">

        {/* SOMMET */}
        <div className="flex justify-between items-start w-full">
           <div className="text-left">
              <p className="text-4xl font-black italic text-white leading-none">{points}</p>
              <p className={`text-[7px] font-black ${theme.accent} tracking-[0.3em] uppercase mt-1`}>Points FIFA</p>
           </div>
           <div className="w-14 h-14 bg-white rounded-2xl p-2 shadow-2xl flex items-center justify-center shrink-0 border-2 border-white/10">
              {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" alt="Club" /> : <Shield className="text-gray-200" size={24} />}
           </div>
        </div>

        {/* IDENTITÉ */}
        <div className="flex items-center gap-3 w-full">
           <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white truncate">{name}</h1>
           <div className={`px-2.5 py-1 rounded-md bg-white/5 border ${theme.border}/40 text-[9px] font-black uppercase text-white shadow-inner`}>
              {category}
           </div>
        </div>

        {/* PHOTO CENTRALE (FIX PHOTO RÉELLE) */}
        <div className="flex-1 flex items-center justify-center py-2">
           <div className={`relative w-48 h-48 rounded-full border-4 ${theme.border} p-1 shadow-2xl overflow-hidden flex items-center justify-center bg-white/5`}>
              {coachPhoto ? (
                <img src={coachPhoto} className="w-full h-full object-cover" alt="Coach" />
              ) : (
                <User size={80} className="text-white/10" />
              )}
              <div className={`absolute bottom-3 right-3 w-10 h-10 rounded-full border-4 border-black flex items-center justify-center ${theme.indicator} animate-pulse shadow-lg`}>
                 {status === 'toujours_pret' ? <Flame size={18} className="text-white" /> : <CheckCircle2 size={18} className="text-white" />}
              </div>
           </div>
        </div>

        <div className="text-center pt-2">
           <p className="text-xs font-black italic text-white/90 uppercase tracking-tighter">{clubName}</p>
        </div>

        {/* STATS & QR */}
        <div className="grid grid-cols-[1fr_auto] gap-4 pt-6 border-t border-white/5">
           <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                 <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Matchs</span>
                 <span className="text-[10px] font-black text-white italic">{matchesPlayed}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                 <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Annonces</span>
                 <span className="text-[10px] font-black text-white italic">{announcementsSent}</span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded-lg bg-white/5 border ${theme.border}/20`}>
                 <TrendingUp size={10} className={theme.accent} />
                 <span className={`text-[10px] font-black ${theme.accent}`}>{engagementRate}%</span>
              </div>
           </div>

           <div className="flex flex-col items-center justify-center pr-1">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-black/5">
                 <QRCodeSVG value={`fc-auth-${name}`} size={70} fgColor="#000000" />
              </div>
              <p className="text-[5px] font-black text-gray-500 uppercase tracking-[0.2em] mt-2 italic underline">Sceau de validation</p>
           </div>
        </div>
      </div>
    </div>
  );
}
