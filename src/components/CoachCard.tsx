'use client';

import React, { useState } from 'react';
import { Shield, Flame, CheckCircle2, Navigation, Zap, Trophy, Layers, Share2, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

interface CoachCardProps {
  name: string;
  slogan: string;
  clubName: string;
  clubLogo?: string;
  coachPhoto?: string;
  category: string;
  points: number;
  grade: string;
  status: 'inactif' | 'actif' | 'toujours_pret';
  matchDist: number;
  plateauDist: number;
  tournamentReach: string;
}

export function CoachCard({
  name, slogan, clubName, clubLogo, coachPhoto, category, points, grade, status,
  matchDist, plateauDist, tournamentReach
}: CoachCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // --- CONFIGURATION DYNAMIQUE DES COULEURS (STATUT) ---
  const statusThemes = {
    'inactif': {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_40px_rgba(59,130,246,0.5)]',
      indicator: 'bg-blue-500 shadow-[0_0_15px_#3b82f6]',
      accent: 'text-blue-400',
      badge: 'bg-blue-500/10'
    },
    'actif': {
      border: 'border-[#39FF14]',
      glow: 'shadow-[0_0_40px_rgba(57,255,20,0.4)]',
      indicator: 'bg-[#39FF14] shadow-[0_0_15px_#39FF14]',
      accent: 'text-[#39FF14]',
      badge: 'bg-[#39FF14]/10'
    },
    'toujours_pret': {
      border: 'border-red-600',
      glow: 'shadow-[0_0_40px_rgba(220,38,38,0.5)]',
      indicator: 'bg-red-600 shadow-[0_0_15px_#dc2626]',
      accent: 'text-red-500',
      badge: 'bg-red-600/10'
    }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  return (
    <div
      className={`relative w-full h-[680px] perspective-1000 cursor-pointer group mb-10 transition-all duration-500 active:scale-95`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-700"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* --- FACE AVANT : PRESTIGE (XXL) --- */}
        <div className={`absolute inset-0 backface-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-[3.5rem] border-[6px] ${theme.border} ${theme.glow} p-1 overflow-hidden`} style={{ backfaceVisibility: 'hidden' }}>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />

           <div className="relative h-full flex flex-col items-center p-10 text-white">
              {/* HEADER : POINTS & LOGO */}
              <div className="w-full flex justify-between items-start mb-4">
                 <div className="text-left">
                    <p className="text-6xl font-black italic text-white leading-none">{points}</p>
                    <p className={`text-[10px] font-black ${theme.accent} tracking-[0.4em] uppercase mt-2`}>Points FIFA</p>
                 </div>
                 <div className={`w-20 h-20 bg-white rounded-3xl p-3 shadow-2xl border-2 ${theme.border} flex items-center justify-center`}>
                    {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" /> : <Shield className="text-gray-200" size={32} />}
                 </div>
              </div>

              {/* PHOTO DU COACH GÉANTE */}
              <div className="relative mt-4">
                 <div className={`w-52 h-52 rounded-full border-[6px] ${theme.border} p-1 bg-gradient-to-b from-white/10 to-transparent shadow-2xl overflow-hidden flex items-center justify-center`}>
                    {coachPhoto ? (
                      <img src={coachPhoto} className="w-full h-full object-cover" alt="Coach" />
                    ) : (
                      <User size={80} className="text-white/10" />
                    )}
                 </div>
                 {/* Badge Statut */}
                 <div className={`absolute bottom-4 right-4 w-12 h-12 rounded-full border-4 border-black flex items-center justify-center ${theme.indicator} animate-pulse`}>
                    {status === 'toujours_pret' ? <Flame size={24} className="text-white" /> : <CheckCircle2 size={24} className="text-white" />}
                 </div>
              </div>

              {/* IDENTITÉ & SLOGAN XXL */}
              <div className="mt-8 text-center space-y-2">
                 <h2 className="text-4xl font-black uppercase italic tracking-tighter drop-shadow-lg">{name}</h2>
                 <p className={`text-xs font-black ${theme.accent} italic tracking-[0.3em] uppercase opacity-80`}>"{slogan}"</p>
              </div>

              {/* CLUB & CATÉGORIE */}
              <div className="mt-8 w-full flex flex-col items-center gap-3">
                 <p className="text-xl font-black italic text-white/90 tracking-tight">{clubName}</p>
                 <div className={`px-8 py-3 rounded-2xl ${theme.badge} border-2 ${theme.border}/30 text-[11px] font-black uppercase tracking-[0.2em] ${theme.accent}`}>
                    Catégorie {category}
                 </div>
              </div>

              {/* QR CODE VALIDATION */}
              <div className="mt-auto mb-4 p-4 bg-white rounded-[2rem] shadow-2xl border-4 border-black/20">
                 <QRCodeSVG value={`nexus-coach-${name}`} size={80} fgColor="#000000" />
              </div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Scanner pour valider mission</p>
           </div>
        </div>

        {/* --- VERSO : ACTION RADIUS (XXL) --- */}
        <div className={`absolute inset-0 backface-hidden bg-gray-900 rounded-[3.5rem] border-[6px] ${theme.border} ${theme.glow} p-10 flex flex-col justify-center gap-10 text-white`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <h3 className={`text-center text-2xl font-black uppercase italic ${theme.accent} border-b-2 ${theme.border}/20 pb-6`}>Périmètres de Mission</h3>

           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-green-500/10 text-[#39FF14] flex items-center justify-center border-2 border-[#39FF14]/20 shadow-lg`}><Navigation size={30} /></div>
                    <span className="font-black uppercase italic text-lg tracking-tight">Match Amical</span>
                 </div>
                 <span className="text-xl font-black text-[#39FF14] italic">{matchDist} KM</span>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border-2 border-blue-500/20 shadow-lg`}><Layers size={30} /></div>
                    <span className="font-black uppercase italic text-lg tracking-tight">Plateau</span>
                 </div>
                 <span className="text-2xl font-black text-blue-500 italic">{plateauDist} KM</span>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center border-2 border-yellow-500/20 shadow-lg`}><Trophy size={30} /></div>
                    <span className="font-black uppercase italic text-lg tracking-tight">Tournois</span>
                 </div>
                 <span className="text-lg font-black text-yellow-500 uppercase italic tracking-tighter">{tournamentReach}</span>
              </div>
           </div>

           <div className="mt-auto text-center opacity-30">
              <p className="text-[11px] font-black uppercase tracking-[0.3em]">Toucher pour retourner la fiche</p>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
