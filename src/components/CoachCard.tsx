'use client';

import React, { useState } from 'react';
import { Shield, Flame, CheckCircle2, Navigation, Zap, Trophy, Layers, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

interface CoachCardProps {
  name: string;
  slogan: string;
  clubName: string;
  clubLogo?: string;
  category: string;
  points: number;
  grade: string;
  status: 'inactif' | 'actif' | 'toujours_pret';
  matchDist: number;
  plateauDist: number;
  tournamentReach: string;
}

export function CoachCard({
  name, slogan, clubName, clubLogo, category, points, grade, status,
  matchDist, plateauDist, tournamentReach
}: CoachCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const statusColors = {
    'inactif': 'bg-blue-500 shadow-[0_0_15px_#3b82f6]',
    'actif': 'bg-[#39FF14] shadow-[0_0_15px_#39FF14]',
    'toujours_pret': 'bg-orange-600 shadow-[0_0_15px_#f97316]'
  };

  return (
    <div className="relative w-full max-w-sm mx-auto h-[550px] perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-700"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* --- FACE AVANT : PRESTIGE --- */}
        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-[3rem] border-4 border-orange-600 shadow-2xl p-1 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

           <div className="relative h-full flex flex-col items-center p-8 text-white">
              {/* HEADER : POINTS & LOGO */}
              <div className="w-full flex justify-between items-start mb-2">
                 <div className="text-left">
                    <p className="text-5xl font-black italic text-white leading-none">{points}</p>
                    <p className="text-[9px] font-black text-orange-500 tracking-[0.3em] uppercase mt-1">Points FIFA</p>
                 </div>
                 <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-xl border-2 border-orange-600 flex items-center justify-center">
                    {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" /> : <Shield className="text-gray-200" />}
                 </div>
              </div>

              {/* PHOTO DU COACH */}
              <div className="relative mt-2">
                 <div className="w-44 h-44 rounded-full border-4 border-orange-600 p-1 bg-gradient-to-b from-orange-500 to-transparent shadow-2xl overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nono" className="w-full h-full object-cover" alt="Coach" />
                 </div>
                 {/* Badge Statut */}
                 <div className={`absolute bottom-2 right-2 w-10 h-10 rounded-full border-4 border-black flex items-center justify-center ${statusColors[status]} animate-pulse`}>
                    {status === 'toujours_pret' ? <Flame size={20} className="text-white" /> : <CheckCircle2 size={20} className="text-white" />}
                 </div>
              </div>

              {/* IDENTITÉ & SLOGAN */}
              <div className="mt-6 text-center space-y-1">
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter">{name}</h2>
                 <p className="text-[11px] font-black text-orange-500 italic tracking-[0.2em]">"{slogan}"</p>
              </div>

              {/* CLUB & CATÉGORIE */}
              <div className="mt-6 w-full flex flex-col items-center gap-2">
                 <p className="text-lg font-black italic text-white/90">{clubName}</p>
                 <div className="px-6 py-2 rounded-xl bg-orange-600/20 border border-orange-600/40 text-xs font-black uppercase tracking-widest text-orange-500">
                    Catégorie {category}
                 </div>
              </div>

              {/* QR CODE VALIDATION */}
              <div className="mt-auto mb-2 p-3 bg-white rounded-2xl shadow-2xl border-2 border-orange-600">
                 <QRCodeSVG value={`nexus-coach-${name}`} size={60} fgColor="#000000" />
              </div>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Scanner pour valider mission</p>
           </div>
        </div>

        {/* --- VERSO : ACTION RADIUS --- */}
        <div className="absolute inset-0 backface-hidden bg-gray-900 rounded-[3rem] border-4 border-orange-600 shadow-2xl p-8 flex flex-col justify-center gap-8 text-white" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <h3 className="text-center text-xl font-black uppercase italic text-orange-500 border-b border-orange-600/30 pb-4">Périmètres de Mission</h3>

           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 text-[#39FF14] flex items-center justify-center border border-[#39FF14]/20"><Navigation size={24} /></div>
                    <span className="font-black uppercase italic text-sm">Match Amical</span>
                 </div>
                 <span className="text-xl font-black text-[#39FF14]">{matchDist} KM</span>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center border border-blue-500/20"><Layers size={24} /></div>
                    <span className="font-black uppercase italic text-sm">Plateau</span>
                 </div>
                 <span className="text-xl font-black text-blue-500">{plateauDist} KM</span>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/20"><Trophy size={24} /></div>
                    <span className="font-black uppercase italic text-sm">Tournois</span>
                 </div>
                 <span className="text-sm font-black text-yellow-500 uppercase">{tournamentReach}</span>
              </div>
           </div>

           <div className="mt-auto text-center opacity-40">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Toucher pour retourner</p>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
