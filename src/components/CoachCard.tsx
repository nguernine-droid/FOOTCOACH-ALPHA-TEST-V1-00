'use client';

import React, { useState } from 'react';
import { Shield, Flame, CheckCircle2, Navigation, Zap, Trophy, Layers, TrendingUp, User, Star } from 'lucide-react';
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
  matchDist: number;
  plateauDist: number;
  tournamentReach: string;
}

/**
 * COACH_CARD (v15.1 - XXL REFINED BADGE)
 * Design "Objet Précieux" agrandi en hauteur pour une immersion totale.
 */
export function CoachCard({
  name, clubName, clubLogo, coachPhoto, category, points, status,
  matchesPlayed, announcementsSent, contactsMade, engagementRate,
  matchDist, plateauDist, tournamentReach
}: CoachCardProps) {

  const [isFlipped, setIsFlipped] = useState(false);

  const statusThemes = {
    'inactif': {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.4)]',
      accent: 'text-blue-400',
      indicator: 'bg-blue-500 shadow-[0_0_15px_#3b82f6]'
    },
    'actif': {
      border: 'border-[#39FF14]',
      glow: 'shadow-[0_0_30px_rgba(57,255,20,0.3)]',
      accent: 'text-[#39FF14]',
      indicator: 'bg-[#39FF14] shadow-[0_0_15px_#39FF14]'
    },
    'toujours_pret': {
      border: 'border-red-600',
      glow: 'shadow-[0_0_30px_rgba(220,38,38,0.4)]',
      accent: 'text-red-500',
      indicator: 'bg-red-600 shadow-[0_0_15px_#dc2626]'
    }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  return (
    <div
      className="w-full max-w-[340px] h-[640px] relative perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-1000"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ transformStyle: 'preserve-3d' }}
      >

        {/* --- FACE AVANT : BADGE DE PRESTIGE --- */}
        <div className={`absolute inset-0 backface-hidden bg-black flex flex-col p-1 border-4 ${theme.border} ${theme.glow} rounded-[2.5rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden' }}>

          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

          <div className="relative h-full flex flex-col p-6 space-y-7 z-10">

            {/* 1. SOMMET ÉQUILIBRÉ */}
            <div className="flex justify-between items-start w-full">
               <div className="text-left space-y-1">
                  <p className="text-4xl font-black italic text-white leading-none">{points}</p>
                  <p className={`text-[7px] font-black ${theme.accent} tracking-[0.3em] uppercase`}>Points FIFA</p>
               </div>

               <div className="flex-1 px-2 text-center pt-2">
                  <h2 className="text-[10px] font-black italic text-white/80 uppercase tracking-tighter line-clamp-1">{clubName}</h2>
               </div>

               <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-2xl border border-white/10 flex items-center justify-center shrink-0">
                  {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" alt="Club" /> : <Shield className="text-gray-200" size={24} />}
               </div>
            </div>

            {/* 2. IDENTITÉ & BADGE CATÉGORIE */}
            <div className="flex items-center gap-3 w-full">
               <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white truncate">{name}</h1>
               <div className={`px-2.5 py-1 rounded-md bg-white/5 border ${theme.border}/40 text-[9px] font-black uppercase text-white shadow-inner`}>
                  {category}
               </div>
            </div>

            {/* 3. PHOTO XXL (CENTRE) */}
            <div className="flex-1 flex items-center justify-center py-2">
               <div className={`relative w-52 h-52 rounded-full border-4 ${theme.border} p-1 shadow-2xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent`}>
                  {coachPhoto ? (
                    <img src={coachPhoto} className="w-full h-full object-cover" alt="Coach" />
                  ) : (
                    <User size={70} className="text-white/10" />
                  )}
                  <div className={`absolute bottom-4 right-4 w-9 h-9 rounded-full border-2 border-black flex items-center justify-center ${theme.indicator} animate-pulse`}>
                     {status === 'toujours_pret' ? <Flame size={18} className="text-white" /> : <CheckCircle2 size={18} className="text-white" />}
                  </div>
               </div>
            </div>

            {/* 4. BLOC BAS : STATS & QR */}
            <div className="grid grid-cols-[1fr_auto] gap-4 pt-6 border-t border-white/5">
               {/* COL GAUCHE : STATS */}
               <div className="space-y-2.5">
                  <CompactStatRow icon={<Zap size={10}/>} label="MATCHS" value={matchesPlayed} />
                  <CompactStatRow icon={<Star size={10}/>} label="ANNONCES" value={announcementsSent} />
                  <CompactStatRow icon={<CheckCircle2 size={10}/>} label="CONTACTS" value={contactsMade} />
                  <div className={`flex items-center justify-between p-2 rounded-lg bg-white/5 border ${theme.border}/20`}>
                     <TrendingUp size={10} className={theme.accent} />
                     <span className={`text-[10px] font-black ${theme.accent}`}>{engagementRate}%</span>
                  </div>
               </div>

               {/* COL DROITE : QR CODE */}
               <div className="flex flex-col items-center justify-center pr-2">
                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                     <QRCodeSVG value={`fc-id-${name}`} size={75} fgColor="#000000" />
                  </div>
                  <p className="text-[5px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2 italic text-center">Sceau de validation</p>
               </div>
            </div>
          </div>
        </div>

        {/* --- VERSO : PÉRIMÈTRES --- */}
        <div className={`absolute inset-0 backface-hidden bg-gray-950 flex flex-col p-1 border-4 ${theme.border} ${theme.glow} rounded-[2.5rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <div className="relative h-full flex flex-col justify-center p-8 space-y-10 text-white text-left">
              <h3 className={`text-center text-xl font-black uppercase italic ${theme.accent} border-b border-white/10 pb-6`}>Zones de Mission</h3>

              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-lg bg-green-500/10 text-[#39FF14] flex items-center justify-center border border-[#39FF14]/20`}><Navigation size={24} /></div>
                       <span className="font-black uppercase italic text-sm tracking-tight">Match Amical</span>
                    </div>
                    <span className="text-xl font-black text-[#39FF14] italic">{matchDist} KM</span>
                 </div>

                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20`}><Layers size={24} /></div>
                       <span className="font-black uppercase italic text-sm tracking-tight">Plateau</span>
                    </div>
                    <span className="text-xl font-black text-blue-500 italic">{plateauDist} KM</span>
                 </div>

                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center border border-yellow-500/20`}><Trophy size={24} /></div>
                       <span className="font-black uppercase italic text-sm tracking-tight">Tournois</span>
                    </div>
                    <span className="text-lg font-black text-yellow-500 uppercase italic tracking-tighter">{tournamentReach}</span>
                 </div>
              </div>

              <div className="mt-auto text-center opacity-20 pt-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">Toucher pour retourner la fiche</p>
              </div>
           </div>
        </div>

      </motion.div>
    </div>
  );
}

function CompactStatRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 shadow-inner">
       <div className="flex items-center gap-2 text-white/30">
          {icon}
          <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
       </div>
       <span className="text-[10px] font-black text-white italic">{value}</span>
    </div>
  );
}
