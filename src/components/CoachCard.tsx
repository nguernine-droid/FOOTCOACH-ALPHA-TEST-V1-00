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
  // Stats
  matchesPlayed: number;
  announcementsSent: number;
  contactsMade: number;
  engagementRate: number;
  // Verso
  matchDist: number;
  plateauDist: number;
  tournamentReach: string;
}

/**
 * COACH_CARD (v14.1 - FULL COCKPIT DESIGN)
 * Architecture intégrale : Sommet (Infos) -> Centre (Photo) -> Bas (Stats & QR).
 * Gère le FLIP pour les rayons d'action.
 */
export function CoachCard({
  name, clubName, clubLogo, coachPhoto, category, points, status,
  matchesPlayed, announcementsSent, contactsMade, engagementRate,
  matchDist, plateauDist, tournamentReach
}: CoachCardProps) {

  const [isFlipped, setIsFlipped] = useState(false);

  // --- CONFIGURATION DYNAMIQUE DES COULEURS (STATUT) ---
  const statusThemes = {
    'inactif': {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_50px_rgba(59,130,246,0.3)]',
      accent: 'text-blue-400',
      indicator: 'bg-blue-500 shadow-[0_0_15px_#3b82f6]'
    },
    'actif': {
      border: 'border-[#39FF14]',
      glow: 'shadow-[0_0_50px_rgba(57,255,20,0.2)]',
      accent: 'text-[#39FF14]',
      indicator: 'bg-[#39FF14] shadow-[0_0_15px_#39FF14]'
    },
    'toujours_pret': {
      border: 'border-red-600',
      glow: 'shadow-[0_0_50px_rgba(220,38,38,0.3)]',
      accent: 'text-red-500',
      indicator: 'bg-red-600 shadow-[0_0_15px_#dc2626]'
    }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  return (
    <div
      className="w-full h-full relative perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-1000"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ transformStyle: 'preserve-3d' }}
      >

        {/* --- FACE AVANT : COCKPIT DE COMMANDEMENT --- */}
        <div className={`absolute inset-0 backface-hidden bg-black flex flex-col p-1 border-[6px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden' }}>

          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />

          <div className="relative flex-1 flex flex-col p-6 space-y-8 z-10">

            {/* 1. SOMMET DU COCKPIT */}
            <div className="flex justify-between items-center w-full">
               <div className="text-left">
                  <p className="text-5xl font-black italic text-white leading-none">{points}</p>
                  <p className={`text-[8px] font-black ${theme.accent} tracking-[0.4em] uppercase mt-1`}>Points FIFA</p>
               </div>

               <div className="flex-1 px-4 text-center">
                  <h2 className="text-sm font-black italic text-white/90 uppercase tracking-tighter line-clamp-1">{clubName}</h2>
                  <div className="h-0.5 w-12 bg-white/10 mx-auto mt-1" />
               </div>

               <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-2xl border-2 border-white/10 flex items-center justify-center shrink-0">
                  {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" alt="Club" /> : <Shield className="text-gray-200" />}
               </div>
            </div>

            {/* 2. LIGNE DE PIVOT */}
            <div className="flex items-end gap-3 w-full border-b border-white/5 pb-2">
               <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white truncate">{name}</h1>
               <div className={`mb-1 px-3 py-1 rounded-lg bg-white/5 border ${theme.border}/30 text-[10px] font-black uppercase text-white shrink-0`}>
                  {category}
               </div>
            </div>

            {/* 3. CENTRE VISUEL (PHOTO) */}
            <div className="flex-1 flex items-center justify-center py-4">
               <div className={`relative w-64 h-64 rounded-full border-8 ${theme.border} p-1 shadow-2xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent`}>
                  {coachPhoto ? (
                    <img src={coachPhoto} className="w-full h-full object-cover" alt="Coach" />
                  ) : (
                    <User size={100} className="text-white/10" />
                  )}
                  <div className={`absolute bottom-6 right-6 w-10 h-10 rounded-full border-4 border-black flex items-center justify-center ${theme.indicator} animate-pulse`}>
                     {status === 'toujours_pret' ? <Flame size={20} className="text-white" /> : <CheckCircle2 size={20} className="text-white" />}
                  </div>
               </div>
            </div>

            {/* 4. BLOC PERFORMANCE & VALIDATION */}
            <div className="grid grid-cols-2 gap-4 pb-24">
               <div className="space-y-3">
                  <StatRow icon={<Zap size={14}/>} label="Matchs Joués" value={matchesPlayed} />
                  <StatRow icon={<Star size={14}/>} label="Annonces Émises" value={announcementsSent} />
                  <StatRow icon={<CheckCircle2 size={14}/>} label="Prises Contact" value={contactsMade} />
                  <div className={`flex items-center justify-between p-3 rounded-xl bg-white/5 border ${theme.border}/20`}>
                     <div className="flex items-center gap-2">
                        <TrendingUp size={14} className={theme.accent} />
                        <span className="text-[8px] font-black text-gray-400 uppercase">Engagement</span>
                     </div>
                     <span className={`text-sm font-black ${theme.accent}`}>{engagementRate}%</span>
                  </div>
               </div>

               <div className="flex flex-col items-center justify-center">
                  <div className={`p-4 bg-white rounded-[2rem] shadow-2xl border-4 ${theme.border}/20`}>
                     <QRCodeSVG value={`nexus-validation-${name}`} size={85} fgColor="#000000" />
                  </div>
                  <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mt-3 italic underline">Sceau de Validation</p>
               </div>
            </div>
          </div>
        </div>

        {/* --- VERSO : PÉRIMÈTRES DE DÉPLACEMENT --- */}
        <div className={`absolute inset-0 backface-hidden bg-gray-950 flex flex-col p-1 border-[6px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <div className="relative h-full flex flex-col justify-center p-10 space-y-10 text-white">
              <h3 className={`text-center text-2xl font-black uppercase italic ${theme.accent} border-b-2 ${theme.border}/20 pb-6`}>Périmètres de Mission</h3>

              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className={`w-14 h-14 rounded-2xl bg-green-500/10 text-[#39FF14] flex items-center justify-center border-2 border-[#39FF14]/20 shadow-lg`}><Navigation size={30} /></div>
                       <span className="font-black uppercase italic text-lg tracking-tight">Match Amical</span>
                    </div>
                    <span className="text-2xl font-black text-[#39FF14] italic">{matchDist} KM</span>
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
        </div>

      </motion.div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 shadow-inner">
       <div className="flex items-center gap-2 text-white/30">
          {icon}
          <span className="text-[8px] font-black uppercase tracking-tight">{label}</span>
       </div>
       <span className="text-sm font-black text-white italic">{value}</span>
    </div>
  );
}
