'use client';

import React, { useState } from 'react';
import {
  Shield, Flame, CheckCircle2, Navigation, Zap, Trophy,
  Layers, TrendingUp, User, Star, MessageSquare, X, Maximize2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoachCardProps {
  name: string;
  clubName: string;
  clubLogo?: string;
  coachPhoto?: string;
  category: string;
  level: string;
  points: number;
  status: 'inactif' | 'actif' | 'toujours_pret';
  matchesPlayed: number;
  announcementsSent: number;
  contactsMade: number;
  engagementRate: number;
  // Identifiant pour le QR Code
  coachId?: string;
}

/**
 * COACH_CARD (v24.0 - INTERACTIVE QR SCEL)
 * Ajout de l'effet Zoom sur le QR Code et lien dynamique.
 */
export function CoachCard({
  name, clubName, clubLogo, coachPhoto, category, points, status,
  matchesPlayed, announcementsSent, contactsMade, engagementRate, coachId
}: CoachCardProps) {

  const [isQrZoomed, setIsQrZoomed] = useState(false);

  const statusThemes = {
    'inactif': { border: 'border-blue-500', glow: 'shadow-xl shadow-blue-900/20', accent: 'text-blue-400', indicator: 'bg-blue-500' },
    'actif': { border: 'border-emerald-400', glow: 'shadow-xl shadow-emerald-900/20', accent: 'text-emerald-400', indicator: 'bg-emerald-400' },
    'toujours_pret': { border: 'border-red-600', glow: 'shadow-xl shadow-red-900/20', accent: 'text-red-500', indicator: 'bg-red-600' }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  // URL officielle TeamNexus
  const qrValue = `https://teamnexus.fr`;

  return (
    <>
      <div className={`w-full max-w-[345px] h-[660px] bg-[#15171C] flex flex-col p-1 border-[6px] ${theme.border} ${theme.glow} rounded-[3.5rem] overflow-hidden relative shadow-2xl`}>
        
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 pointer-events-none" />

        <div className="relative flex-1 flex flex-col p-7 space-y-6 z-10">

          {/* 1. SOMMET */}
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
                  {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" /> : <Shield className="text-gray-200" size={28} />}
                </div>
                <h2 className="text-[9px] font-black italic text-white/60 uppercase tracking-widest text-right max-w-[100px] line-clamp-2">{clubName}</h2>
             </div>
          </div>

          {/* 2. IDENTITÉ CENTRALE */}
          <div className="w-full text-center border-y border-white/5 py-3">
             <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{name}</h1>
          </div>

          {/* 3. PHOTO XXL */}
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

          {/* 4. BAS : STATS & QR (Cliquable pour Zoom) */}
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-4 pb-4 pt-4 border-t border-white/5">
             <div className="space-y-2">
                <CompactStatRow icon={<Zap size={14}/>} label="MATCHS" value={matchesPlayed} accentColor="text-yellow-400" />
                <CompactStatRow icon={<Star size={14}/>} label="ANNONCES" value={announcementsSent} accentColor="text-sky-400" />
                <CompactStatRow icon={<MessageSquare size={14}/>} label="CONTACTS" value={contactsMade} accentColor="text-purple-400" />
                <div className={`flex items-center justify-between p-2.5 rounded-xl bg-white/5 border ${theme.border}/20 shadow-lg`}>
                   <div className="flex items-center gap-2">
                      <TrendingUp size={14} className={theme.accent} />
                      <span className="text-[8px] font-black text-white/50 uppercase tracking-tighter">Engagement</span>
                   </div>
                   <span className={`text-sm font-black ${theme.accent}`}>{engagementRate}%</span>
                </div>
             </div>

             <button
               onClick={(e) => { e.stopPropagation(); setIsQrZoomed(true); }}
               className="flex flex-col items-center justify-center group/qr relative active:scale-95 transition-transform"
             >
                <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-black/5 group-hover/qr:border-orange-500 transition-colors">
                   <QRCodeSVG value={qrValue} size={75} fgColor="#000000" />
                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/qr:opacity-100 rounded-2xl transition-opacity">
                      <Maximize2 size={24} className="text-white" />
                   </div>
                </div>
                <p className="text-[6px] font-black text-white/30 uppercase tracking-[0.3em] mt-2 italic animate-pulse">Toucher pour agrandir</p>
             </button>
          </div>
        </div>
      </div>

      {/* --- OVERLAY ZOOM QR CODE --- */}
      <AnimatePresence>
        {isQrZoomed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
            onClick={() => setIsQrZoomed(false)}
          >
             <button className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors">
                <X size={40} strokeWidth={3} />
             </button>

             <motion.div
               initial={{ scale: 0.5, y: 100 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, y: 100 }}
               className="bg-white p-8 rounded-[3rem] shadow-2xl"
             >
                <QRCodeSVG value={qrValue} size={260} fgColor="#000000" />
             </motion.div>

             <div className="mt-12 text-center space-y-4 max-w-xs">
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">Sceau de Validation</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                  Présentez ce code pour <span className="text-orange-500">Valider un match</span>, <span className="text-sky-400">partager l'app</span> ou <span className="text-emerald-400">parrainer un coach</span>.
                </p>
             </div>

             <div className="absolute bottom-16 w-full flex justify-center">
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-orange-600 animate-bounce" />
                   <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:200ms]" />
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:400ms]" />
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
