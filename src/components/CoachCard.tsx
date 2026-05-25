'use client';

import React, { useState } from 'react';
import {
  Shield, Flame, CheckCircle2, Navigation, Zap, Trophy,
  Layers, TrendingUp, User, Star, Edit3, BookOpen, MapPin,
  Phone, Medal, Target, Globe
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

interface CoachCardProps {
  name: string;
  firstName?: string;
  lastName?: string;
  clubName: string;
  clubLogo?: string;
  coachPhoto?: string;
  category: string;
  level: string;
  grade: string;
  status: 'inactif' | 'actif' | 'toujours_pret';
  bio?: string;
  city?: string;
  stadium?: string;
  phone?: string;
  refCategories?: string[];
  matchesPlayed: number;
  announcementsSent: number;
  contactsMade: number;
  engagementRate: number;
  matchDist: number;
  plateauDist: number;
  tournamentReach: string;
  tournamentDistMax?: number;
  onEdit?: () => void;
}

export function CoachCard({
  name, firstName, lastName, clubName, clubLogo, coachPhoto, category, level, grade, status,
  bio, city, stadium, phone, refCategories, matchesPlayed, announcementsSent, contactsMade, engagementRate,
  matchDist, plateauDist, tournamentReach, tournamentDistMax, onEdit
}: CoachCardProps) {

  const [isFlipped, setIsFlipped] = useState(false);

  const statusThemes = {
    'inactif': { border: 'border-blue-500', glow: 'shadow-[0_0_40px_rgba(59,130,246,0.3)]', accent: 'text-blue-400', indicator: 'bg-blue-500' },
    'actif': { border: 'border-[#39FF14]', glow: 'shadow-[0_0_40px_rgba(57,255,20,0.2)]', accent: 'text-[#39FF14]', indicator: 'bg-[#39FF14]' },
    'toujours_pret': { border: 'border-red-600', glow: 'shadow-[0_0_40px_rgba(220,38,38,0.3)]', accent: 'text-red-500', indicator: 'bg-red-600' }
  };

  const theme = statusThemes[status] || statusThemes['actif'];

  return (
    <div className="w-full max-w-[340px] h-[660px] relative perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-1000"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        style={{ transformStyle: 'preserve-3d' }}
      >

        {/* --- FACE A : PRESTIGE (COCKPIT) --- */}
        <div className={`absolute inset-0 backface-hidden bg-black flex flex-col p-1 border-[5px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden' }}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="relative h-full flex flex-col p-8 space-y-6 z-10">
            {/* Sommet */}
            <div className="flex justify-between items-start w-full">
               <div className="text-left">
                  <p className="text-4xl font-black italic text-white leading-none">0</p>
                  <p className={`text-[7px] font-black ${theme.accent} tracking-[0.3em] uppercase mt-1`}>Points FIFA</p>
               </div>
               <div className="w-14 h-14 bg-white rounded-2xl p-2 shadow-2xl flex items-center justify-center shrink-0 border-2 border-white/10">
                  {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" /> : <Shield className="text-gray-200" size={24} />}
               </div>
            </div>
            {/* Identité */}
            <div className="flex items-center gap-3 w-full">
               <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white truncate">{name}</h1>
               <div className={`px-2.5 py-1 rounded-md bg-white/5 border ${theme.border}/40 text-[9px] font-black uppercase text-white shadow-inner`}>{category}</div>
            </div>
            {/* Photo XXL */}
            <div className="flex-1 flex items-center justify-center py-2">
               <div className={`relative w-52 h-52 rounded-full border-4 ${theme.border} p-1 shadow-2xl overflow-hidden flex items-center justify-center bg-white/5`}>
                  {coachPhoto ? <img src={coachPhoto} className="w-full h-full object-cover" alt="Coach" /> : <User size={80} className="text-white/10" />}
                  <div className={`absolute bottom-4 right-4 w-10 h-10 rounded-full border-4 border-black flex items-center justify-center ${theme.indicator} animate-pulse shadow-lg`}>
                     {status === 'toujours_pret' ? <Flame size={18} className="text-white" /> : <CheckCircle2 size={18} className="text-white" />}
                  </div>
               </div>
            </div>
            <div className="text-center pt-1"><p className="text-xs font-black italic text-white/90 uppercase tracking-tighter">{clubName}</p></div>
            {/* Stats & QR */}
            <div className="grid grid-cols-[1fr_auto] gap-4 pt-4 border-t border-white/5">
               <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span className="text-[7px] font-black text-white/30 uppercase">Matchs</span><span className="text-[10px] font-black text-white italic">{matchesPlayed}</span></div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5"><span className="text-[7px] font-black text-white/30 uppercase">Annonces</span><span className="text-[10px] font-black text-white italic">{announcementsSent}</span></div>
                  <div className={`flex items-center justify-between p-2 rounded-lg bg-white/5 border ${theme.border}/20`}><TrendingUp size={10} className={theme.accent} /><span className={`text-[10px] font-black ${theme.accent}`}>{engagementRate}%</span></div>
               </div>
               <div className="flex flex-col items-center justify-center pr-1"><div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-black/5"><QRCodeSVG value={`fc-auth-${name}`} size={70} fgColor="#000000" /></div><p className="text-[5px] font-black text-gray-500 uppercase tracking-[0.2em] mt-2 italic underline">Sceau de validation</p></div>
            </div>
          </div>
        </div>

        {/* --- FACE B : DOSSIER COMPLET (LE DOS) --- */}
        <div className={`absolute inset-0 backface-hidden bg-gray-950 flex flex-col p-1 border-[5px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
           <div className="relative h-full flex flex-col p-7 text-white text-left overflow-y-auto no-scrollbar space-y-6">
              <h3 className={`text-center text-xl font-black uppercase italic ${theme.accent} border-b border-white/10 pb-4 mb-2`}>Dossier_Tactique</h3>

              {/* SECTION 1 : IDENTITÉ OFFICIELLE */}
              <div className="space-y-3">
                 <label className="text-[8px] font-black uppercase text-gray-500 flex items-center gap-2"><User size={10}/> Identité Master</label>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 shadow-inner">
                    <p className="text-xs font-black uppercase italic text-white">{firstName} {lastName}</p>
                    <div className="flex justify-between items-center">
                       <span className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">{grade}</span>
                       <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">NIVEAU {level}</span>
                    </div>
                 </div>
              </div>

              {/* SECTION 2 : UNITÉ & RÉFÉRENCES */}
              {refCategories && refCategories.length > 0 && (
                <div className="space-y-3">
                   <label className="text-[8px] font-black uppercase text-gray-500 flex items-center gap-2"><Layers size={10}/> Expertises</label>
                   <div className="flex flex-wrap gap-2">
                      {refCategories.map(cat => (
                        <span key={cat} className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase text-white">{cat}</span>
                      ))}
                   </div>
                </div>
              )}

              {/* SECTION 3 : PÉRIMÈTRES DE DÉPLACEMENT */}
              <div className="space-y-3">
                 <label className="text-[8px] font-black uppercase text-gray-500 flex items-center gap-2"><Navigation size={10}/> Rayons d'Action</label>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                       <p className="text-[7px] text-gray-500 uppercase mb-1">Match Amical</p>
                       <p className="text-sm font-black text-[#39FF14]">{matchDist} KM</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                       <p className="text-[7px] text-gray-500 uppercase mb-1">Plateau</p>
                       <p className="text-sm font-black text-blue-500">{plateauDist} KM</p>
                    </div>
                    <div className="col-span-2 bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center px-6">
                       <p className="text-[7px] text-gray-500 uppercase">Tournois</p>
                       <p className="text-xs font-black text-yellow-500 uppercase italic">{tournamentReach} {tournamentReach === 'distance' ? `(${tournamentDistMax}KM)` : ''}</p>
                    </div>
                 </div>
              </div>

              {/* SECTION 4 : LOGISTIQUE QG */}
              <div className="space-y-3">
                 <label className="text-[8px] font-black uppercase text-gray-500 flex items-center gap-2"><MapPin size={10}/> Logistique_QG</label>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                    <p className="text-[9px] font-black uppercase text-white flex justify-between">Ville: <span className={theme.accent}>{city || "NON RENSEIGNÉ"}</span></p>
                    <p className="text-[9px] font-black uppercase text-white flex justify-between">Stade: <span className={theme.accent}>{stadium || "NON RENSEIGNÉ"}</span></p>
                 </div>
              </div>

              {/* SECTION 5 : SÉCURITÉ */}
              <div className="space-y-3 pt-2">
                 <label className="text-[8px] font-black uppercase text-gray-500 flex items-center gap-2"><Phone size={10}/> Contact (🔒 PRIVÉ)</label>
                 <div className="bg-black p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-xs font-black text-white/20 tracking-[0.3em] italic uppercase">Numéro de téléphone masqué</p>
                 </div>
              </div>

              {/* SECTION 6 : BOUTON MODIFIER */}
              <div className="pt-4 pb-4">
                 <button
                   onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                   className="w-full bg-orange-600 text-white font-black py-5 rounded-[2.5rem] shadow-[0_0_20px_rgba(249,115,22,0.4)] active:scale-95 transition-all uppercase italic text-xs flex items-center justify-center gap-3"
                 >
                   <Edit3 size={16} /> Modifier mes informations
                 </button>
              </div>

              <div className="text-center opacity-20 pb-4">
                 <p className="text-[8px] font-black uppercase tracking-[0.3em]">Toucher pour retourner</p>
              </div>
           </div>
        </div>

      </motion.div>
    </div>
  );
}
