'use client';

import React from 'react';
import { Shield, Flame, CheckCircle2, Navigation, Zap, Trophy, Layers, TrendingUp, User, Star, MessageSquare } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

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
 * COACH_CARD (v23.1 - ENHANCED STATS VISIBILITY)
 * Sommet : Points & Catégorie XXL.
 * Pivot : Surnom au milieu.
 * Centre : Photo XXL.
 * Bas : Stats agrandies avec couleurs distinctes.
 */
export function CoachCard({
  name, clubName, clubLogo, coachPhoto, category, points, status,
  matchesPlayed, announcementsSent, contactsMade, engagementRate
}: CoachCardProps) {

  const statusThemes = {
    'inactif': { border: 'border-blue-500', glow: 'shadow-[0_0_50px_rgba(59,130,246,0.4)]', accent: 'text-blue-400', indicator: 'bg-blue-500' },
    'actif': { border: 'border-[#39FF14]', glow: 'shadow-[0_0_50px_rgba(57,255,20,0.3)]', accent: 'text-[#39FF14]', indicator: 'bg-[#39FF14]' },
    'toujours_pret': { border: 'border-red-600', glow: 'shadow-[0_0_50px_rgba(220,38,38,0.4)]', accent: 'text-red-500', indicator: 'bg-red-600' }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  return (
    <div className={`w-full max-w-[345px] h-[660px] bg-black flex flex-col p-1 border-[6px] ${theme.border} ${theme.glow} rounded-[3.5rem] overflow-hidden relative shadow-2xl`}>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 pointer-events-none" />

      <div className="relative flex-1 flex flex-col p-7 space-y-6 z-10">
        
        {/* 1. SOMMET ÉCLATÉ */}
        <div className="flex justify-between items-start w-full">
           <div className="text-left space-y-1">
              <div>
                <p className="text-5xl font-black italic text-white leading-none">{points}</p>
                <p className={`text-[7px] font-black ${theme.accent} tracking-[0.3em] uppercase mt-1`}>Points FIFA</p>
              </div>
              <div className="pt-2">
                 <p className="text-4xl font-black uppercase text-white leading-none tracking-tighter">{category}</p>
                 <p className={`text-[6px] font-black ${theme.accent} tracking-[0.4em] uppercase opacity-40`}>Catégorie</p>
              </div>
           </div>

           <div className="flex flex-col items-end gap-3">
              <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-2xl border-2 border-white/10 flex items-center justify-center shrink-0">
                {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" alt="Club" /> : <Shield className="text-gray-200" size={28} />}
              </div>
              <h2 className="text-[9px] font-black italic text-white/60 uppercase tracking-widest text-right max-w-[100px] line-clamp-2">{clubName}</h2>
           </div>
        </div>

        {/* 2. IDENTITÉ CENTRALE (SURNOM) */}
        <div className="w-full text-center border-y border-white/5 py-3">
           <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{name}</h1>
        </div>

        {/* 3. PHOTO XXL (CENTRE) */}
        <div className="flex-1 flex items-center justify-center">
           <div className={`relative w-52 h-52 rounded-full border-8 ${theme.border} p-1 shadow-2xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-white/10 to-transparent`}>
              {coachPhoto ? (
                <img src={coachPhoto} className="w-full h-full object-cover" alt="Coach" />
              ) : (
                <User size={80} className="text-white/10" />
              )}
              <div className={`absolute bottom-3 right-3 w-10 h-10 rounded-full border-4 border-black flex items-center justify-center ${theme.indicator} animate-pulse`}>
                 {status === 'toujours_pret' ? <Flame size={18} className="text-white" /> : <CheckCircle2 size={18} className="text-white" />}
              </div>
           </div>
        </div>

        {/* 4. BAS : STATS & QR */}
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-4 pb-4 pt-4 border-t border-white/5">
           {/* STATS À GAUCHE - VISIBILITÉ RENFORCÉE */}
           <div className="space-y-2">
              <CompactStatRow
                icon={<Zap size={14}/>}
                label="MATCHS"
                value={matchesPlayed}
                accentColor="text-yellow-400"
              />
              <CompactStatRow
                icon={<Star size={14}/>}
                label="ANNONCES"
                value={announcementsSent}
                accentColor="text-sky-400"
              />
              <CompactStatRow
                icon={<MessageSquare size={14}/>}
                label="CONTACTS"
                value={contactsMade}
                accentColor="text-purple-400"
              />
              <div className={`flex items-center justify-between p-2.5 rounded-xl bg-white/5 border ${theme.border}/20 shadow-lg`}>
                 <div className="flex items-center gap-2">
                    <TrendingUp size={14} className={theme.accent} />
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter">Engagement</span>
                 </div>
                 <span className={`text-sm font-black ${theme.accent}`}>{engagementRate}%</span>
              </div>
           </div>

           {/* QR CODE À DROITE */}
           <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-black/5">
                 <QRCodeSVG value={`fc-id-${name}`} size={75} fgColor="#000000" />
              </div>
              <p className="text-[6px] font-black text-white/30 uppercase tracking-[0.3em] mt-2 italic">Validation</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function CompactStatRow({ icon, label, value, accentColor }: { icon: React.ReactNode, label: string, value: number, accentColor: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 shadow-md">
       <div className={`flex items-center gap-2 ${accentColor}`}>
          {icon}
          <span className="text-[8px] font-black uppercase tracking-tight opacity-70">{label}</span>
       </div>
       <span className="text-sm font-black text-white italic">{value}</span>
    </div>
  );
}
