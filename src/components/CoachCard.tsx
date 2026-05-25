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
  points: number;
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

/**
 * COACH_CARD (v19.0 - MASTER CLASSIC FLIP)
 * Face A : Carte de Prestige
 * Face B : Fiche Profil Complète (Classic Mode)
 */
export function CoachCard({
  name, firstName, lastName, clubName, clubLogo, coachPhoto, category, level, points, status,
  bio, city, stadium, phone, refCategories, matchesPlayed, announcementsSent, contactsMade, engagementRate,
  matchDist, plateauDist, tournamentReach, tournamentDistMax, onEdit
}: CoachCardProps) {

  const [isFlipped, setIsFlipped] = useState(false);

  // --- CONFIGURATION DYNAMIQUE DES COULEURS (STATUT) ---
  const statusThemes = {
    'inactif': {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_40px_rgba(59,130,246,0.3)]',
      accent: 'text-blue-400',
      indicator: 'bg-blue-500 shadow-[0_0_15px_#3b82f6]'
    },
    'actif': {
      border: 'border-[#39FF14]',
      glow: 'shadow-[0_0_40px_rgba(57,255,20,0.2)]',
      accent: 'text-[#39FF14]',
      indicator: 'bg-[#39FF14] shadow-[0_0_15px_#39FF14]'
    },
    'toujours_pret': {
      border: 'border-red-600',
      glow: 'shadow-[0_0_40px_rgba(220,38,38,0.3)]',
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

        {/* --- FACE A : CARTE DE PRESTIGE --- */}
        <div className={`absolute inset-0 backface-hidden bg-black flex flex-col p-1 border-[5px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden' }}>

          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

          <div className="relative h-full flex flex-col p-8 space-y-6 z-10">

            {/* 1. SOMMET : POINTS | NOM | LOGO */}
            <div className="flex justify-between items-center w-full">
               <div className="text-left">
                  <p className="text-4xl font-black italic text-white leading-none">{points}</p>
                  <p className={`text-[7px] font-black ${theme.accent} tracking-[0.3em] uppercase mt-1`}>Points FIFA</p>
               </div>
               <div className="flex-1 px-4 text-center">
                  <h2 className="text-[10px] font-black italic text-white/80 uppercase tracking-tighter line-clamp-1">{clubName}</h2>
               </div>
               <div className="w-14 h-14 bg-white rounded-2xl p-2 shadow-2xl flex items-center justify-center shrink-0 border-2 border-white/10">
                  {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" alt="Club" /> : <Shield className="text-gray-200" size={24} />}
               </div>
            </div>

            {/* 2. IDENTITÉ & CATÉGORIE */}
            <div className="flex items-center gap-3 w-full border-b border-white/5 pb-2">
               <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white truncate">{name}</h1>
               <div className={`px-2.5 py-1 rounded-md bg-white/5 border ${theme.border}/40 text-[9px] font-black uppercase text-white shadow-inner`}>
                  {category}
               </div>
            </div>

            {/* 3. PHOTO XXL */}
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

            <div className="text-center pt-1">
               <p className="text-xs font-black italic text-white/90 uppercase tracking-tighter">{clubName}</p>
            </div>

            {/* 4. STATS & QR */}
            <div className="grid grid-cols-[1fr_auto] gap-4 pt-4 border-t border-white/5 pb-4">
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
                  <p className="text-[5px] font-black text-gray-500 uppercase tracking-[0.2em] mt-2 italic underline text-center">Sceau de validation</p>
               </div>
            </div>
          </div>
        </div>

        {/* --- FACE B : FICHE PROFIL COMPLÈTE (CLASSIC) --- */}
        <div className={`absolute inset-0 backface-hidden bg-gray-50 flex flex-col p-1 border-[5px] ${theme.border} ${theme.glow} rounded-[3rem] overflow-hidden`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>

           <div className="relative h-full flex flex-col p-7 text-gray-900 text-left overflow-y-auto no-scrollbar space-y-6">
              <h3 className="text-center text-xl font-black uppercase italic text-gray-900 border-b-2 border-gray-200 pb-4 mb-2">Fiche Profil</h3>

              {/* 1. UTILISATEUR */}
              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest"><User size={12} className="text-orange-600"/> Utilisateur</label>
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                          {coachPhoto ? <img src={coachPhoto} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-300" />}
                       </div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black uppercase text-gray-900">{firstName} {lastName}</p>
                          <p className="text-[9px] font-bold text-orange-600 uppercase">Surnom: {name}</p>
                       </div>
                    </div>
                    {phone && (
                      <div className="pt-2 border-t border-gray-50 flex items-center gap-2">
                         <Phone size={10} className="text-gray-400" />
                         <span className="text-[9px] font-bold text-gray-500">{phone}</span>
                      </div>
                    )}
                 </div>
              </div>

              {/* 2. CLUB */}
              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest"><Shield size={12} className="text-orange-600"/> Mon Club</label>
                 <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-4 shadow-sm">
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 bg-white p-2 rounded-2xl border border-gray-100 flex items-center justify-center shrink-0">
                          {clubLogo ? <img src={clubLogo} className="w-full h-full object-contain" /> : <Shield size={32} className="text-gray-100" />}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-black uppercase italic text-gray-900">{clubName}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Catégorie: {category}</p>
                          <p className="text-[9px] font-black text-orange-600 uppercase tracking-tighter">Niveau: {level}</p>
                       </div>
                    </div>
                    {refCategories && refCategories.length > 0 && (
                       <div className="pt-3 border-t border-gray-50">
                          <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Catégories de Référence</p>
                          <div className="flex flex-wrap gap-2">
                             {refCategories.map(cat => (
                               <span key={cat} className="px-2 py-1 bg-gray-100 rounded-md text-[8px] font-black text-gray-600 uppercase border border-gray-200">{cat}</span>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              {/* 3. LOGISTIQUE QG */}
              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest"><MapPin size={12} className="text-orange-600"/> Logistique QG</label>
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span className="text-gray-400">Ma Ville</span>
                       <span className="text-gray-900">{city || "NON RENSEIGNÉ"}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase pt-3 border-t border-gray-50">
                       <span className="text-gray-400">Mon Stade</span>
                       <span className="text-gray-900 truncate ml-4">{stadium || "NON RENSEIGNÉ"}</span>
                    </div>
                 </div>
              </div>

              {/* 4. RAYONS DE DÉPLACEMENT */}
              <div className="space-y-3">
                 <label className="text-[9px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest"><Navigation size={12} className="text-orange-600"/> Rayons de Déplacement</label>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-center shadow-sm">
                       <p className="text-[7px] text-gray-400 uppercase mb-1">Match Amical</p>
                       <p className="text-sm font-black text-gray-900">{matchDist} KM</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 text-center shadow-sm">
                       <p className="text-[7px] text-gray-400 uppercase mb-1">Plateau</p>
                       <p className="text-sm font-black text-gray-900">{plateauDist} KM</p>
                    </div>
                    <div className="col-span-2 bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center px-5 shadow-sm">
                       <p className="text-[8px] font-black text-gray-400 uppercase">Portée Tournoi</p>
                       <p className="text-[10px] font-black text-orange-600 uppercase italic">{tournamentReach}</p>
                    </div>
                 </div>
              </div>

              <div className="pt-6 pb-10">
                 <button
                   onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                   className="w-full bg-orange-600 text-white font-black py-5 rounded-[2.5rem] shadow-xl active:scale-95 transition-all uppercase italic text-xs flex items-center justify-center gap-3"
                 >
                   <Edit3 size={16} /> Modifier mon profil
                 </button>
              </div>

              <div className="text-center opacity-30 pb-6">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Toucher pour retourner la fiche</p>
              </div>
           </div>
        </div>

      </motion.div>
    </div>
  );
}
