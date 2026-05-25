'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import {
  ChevronLeft, User, Shield, MapPin, Navigation,
  Phone, Layers, Trophy, Edit3, CheckCircle2, Star, Zap
} from 'lucide-react';

interface CoachViewProps {
  onActivateParent?: () => void;
}

/**
 * COACH_VIEW (v20.0 - MASTER CLASSIC PAGE TRANSITION)
 * Étape 1 : Carte de Prestige XXL.
 * Étape 2 : Clic -> Page Profil Complète (Classic Mode).
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Stats simulées
  const stats = { matchesPlayed: 12, announcementsSent: 8, contactsMade: 15, engagementRate: 100 };

  // --- RENDU 1 : LA CARTE DE PRESTIGE (COCKPIT) ---
  if (!showFullProfile) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-[#050510] overflow-hidden animate-in fade-in duration-1000">
        <button
          onClick={() => router.push('/dashboard')}
          className="absolute top-12 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-[60] hover:bg-white/10"
        >
          <ChevronLeft size={24} strokeWidth={3} />
        </button>

        <div 
          className="w-full flex justify-center px-6 cursor-pointer transition-all duration-300 active:scale-95 group"
          onClick={() => setShowFullProfile(true)}
        >
          <div className="relative">
            <CoachCard
              name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
              clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
              clubLogo={teamInfo?.clubLogo}
              coachPhoto={teamInfo?.coachPhoto}
              category={teamInfo?.category || 'SÉNIORS'}
              level={teamInfo?.level || 'D1'}
              points={teamInfo?.xp || 0}
              status={teamInfo?.coachStatus || 'actif'}
              matchesPlayed={stats.matchesPlayed}
              announcementsSent={stats.announcementsSent}
              contactsMade={stats.contactsMade}
              engagementRate={stats.engagementRate}
              grade={teamInfo?.coachGrade || 'COACH ENGAGÉ'}
              matchDist={teamInfo?.matchDistMax || 30}
              plateauDist={teamInfo?.plateauDistMax || 20}
              tournamentReach={teamInfo?.tournamentReach || 'departemental'}
            />
          </div>
        </div>

        {/* Swipe Indicator */}
        <div className="absolute inset-x-0 bottom-32 flex justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-1 animate-bounce [animation-duration:2s]">
            <Zap size={20} className="text-[#39FF14] drop-shadow-lg" />
            <ChevronLeft size={20} className="text-white/40 -mt-2 rotate-90" />
            <ChevronLeft size={20} className="text-white/20 -mt-3 rotate-90" />
          </div>
        </div>

        {/* Texte Guide Amélioré */}
        <div className="absolute bottom-16 flex flex-col items-center gap-3 animate-in fade-in duration-1000" style={{ animationDelay: '500ms' }}>
          <p className="text-white/80 font-black uppercase text-xs tracking-widest text-center px-4 flex items-center gap-2 group-hover:text-[#39FF14] transition-colors">
            <Zap size={14} /> Touchez pour ouvrir votre profil complet
          </p>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU 2 : LA PAGE PROFIL CLASSIQUE ---
  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Page */}
      <header className="bg-white border-b border-gray-200 p-6 sticky top-0 z-[80] flex items-center gap-4 shadow-sm">
        <button 
          onClick={() => setShowFullProfile(false)} 
          className="text-gray-900 hover:bg-gray-100 p-2 rounded-lg active:scale-90 transition-all"
        >
          <ChevronLeft size={28} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">Profil_Dossier</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-8 pb-48">

        {/* 1. UTILISATEUR */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '100ms' }}>
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <User size={14} className="text-orange-600" /> Utilisateur
             </label>
             <button
               onClick={() => router.push('/profile/edit?section=user')}
               className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 active:scale-90 transition-all text-xs font-black flex items-center gap-1"
             >
               <Edit3 size={12} /> ÉDITER
             </button>
           </div>
           <div className="bg-white rounded-[2.5rem] p-6 border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-5">
                 <div className="w-24 h-24 rounded-3xl border-4 border-orange-100 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0 shadow-md">
                    {teamInfo?.coachPhoto ? (
                      <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" alt={teamInfo?.coachName} />
                    ) : (
                      <User size={40} className="text-gray-300" />
                    )}
                 </div>
                 <div className="space-y-2 flex-1">
                    <p className="text-lg font-black uppercase text-gray-900 leading-tight">
                      {teamInfo?.userFirstName || 'Coach'} <span className="text-gray-500">{teamInfo?.userLastName?.charAt(0) || 'X'}.</span>
                    </p>
                    <p className="text-xs font-bold text-orange-600 uppercase italic">
                      👤 {teamInfo?.coachName || 'Surnom'}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[8px] font-black uppercase inline-block">
                        {teamInfo?.coachGrade || 'Coach Engagé'}
                      </span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase inline-block">
                        XP: {teamInfo?.xp || 0}
                      </span>
                    </div>
                 </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-start gap-3">
                 <Phone size={16} className="text-orange-600 mt-1 flex-shrink-0" />
                 <div className="text-xs">
                   <p className="text-gray-500 font-bold">Contact</p>
                   <p className="text-gray-900 font-black mt-1">{teamInfo?.phone || '📞 Non renseigné'}</p>
                 </div>
              </div>
           </div>
        </section>

        {/* 2. LE CLUB (UNITÉ) */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '200ms' }}>
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <Shield size={14} className="text-orange-600" /> Mon Club
             </label>
             <button
               onClick={() => router.push('/profile/edit?section=club')}
               className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 active:scale-90 transition-all text-xs font-black flex items-center gap-1"
             >
               <Edit3 size={12} /> ÉDITER
             </button>
           </div>
           <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-md hover:shadow-lg transition-shadow flex flex-col items-center text-center space-y-4">
              <div className="w-40 h-40 bg-gradient-to-br from-gray-50 to-white rounded-[2.5rem] p-4 border-4 border-orange-100 shadow-lg flex items-center justify-center">
                 {teamInfo?.clubLogo ? (
                   <img src={teamInfo.clubLogo} className="w-full h-full object-contain" alt={teamInfo?.clubName} />
                 ) : (
                   <Shield size={80} className="text-gray-200" />
                 )}
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-black uppercase italic text-gray-900 tracking-tighter">
                   {teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
                 </h2>
                 <div className="flex justify-center gap-6 text-xs font-bold uppercase tracking-wider pt-2">
                   <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg">
                     🏛️ {teamInfo?.category || 'SÉNIORS'}
                   </span>
                   <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                     ⚡ {teamInfo?.level || 'D1'}
                   </span>
                 </div>
              </div>
              {teamInfo?.refCategories && teamInfo.refCategories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-6 border-t border-gray-100">
                   {teamInfo.refCategories.map((cat, idx) => (
                     <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl text-[9px] font-black text-gray-600 uppercase hover:bg-gray-100 transition">
                       {cat}
                     </span>
                   ))}
                </div>
              )}
           </div>
        </section>

        {/* 3. LOGISTIQUE QG */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '300ms' }}>
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-orange-600" /> Logistique_QG
             </label>
             <button
               onClick={() => router.push('/profile/edit?section=logistics')}
               className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 active:scale-90 transition-all text-xs font-black flex items-center gap-1"
             >
               <Edit3 size={12} /> ÉDITER
             </button>
           </div>
           <div className="bg-white rounded-[2.5rem] p-6 border border-gray-200 shadow-md hover:shadow-lg transition-shadow space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                 <span className="text-[10px] font-black uppercase text-gray-500">📍 Ma Ville</span>
                 <span className="text-sm font-black text-gray-900 uppercase italic">{teamInfo?.clubCity || "À définir"}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                 <span className="text-[10px] font-black uppercase text-gray-500">🏟️ Mon Stade</span>
                 <span className="text-sm font-black text-gray-900 uppercase italic text-right truncate ml-2">{teamInfo?.clubStadium || "À définir"}</span>
              </div>
           </div>
        </section>

        {/* 4. RAYONS D'ACTION */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '400ms' }}>
           <div className="flex items-center justify-between">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <Navigation size={14} className="text-orange-600" /> Rayons de Déplacement
             </label>
             <button
               onClick={() => router.push('/profile/edit?section=ranges')}
               className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 active:scale-90 transition-all text-xs font-black flex items-center gap-1"
             >
               <Edit3 size={12} /> ÉDITER
             </button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-[2rem] border-2 border-green-200 shadow-md hover:shadow-lg transition-all hover:scale-105">
                 <p className="text-[8px] font-black uppercase text-green-600 mb-2 flex items-center gap-2">
                   ⚽ Match Amical
                 </p>
                 <p className="text-2xl font-black text-green-600 italic">{teamInfo?.matchDistMax || 30}</p>
                 <p className="text-xs text-green-500 font-bold">Kilomètres</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-[2rem] border-2 border-blue-200 shadow-md hover:shadow-lg transition-all hover:scale-105">
                 <p className="text-[8px] font-black uppercase text-blue-600 mb-2 flex items-center gap-2">
                   🎪 Plateau
                 </p>
                 <p className="text-2xl font-black text-blue-600 italic">{teamInfo?.plateauDistMax || 20}</p>
                 <p className="text-xs text-blue-500 font-bold">Kilomètres</p>
              </div>
              <div className="col-span-full bg-gradient-to-br from-orange-50 to-white p-6 rounded-[2rem] border-2 border-orange-200 shadow-md hover:shadow-lg transition-all">
                 <div className="flex justify-between items-center">
                   <div>
                     <p className="text-[8px] font-black uppercase text-orange-600 mb-2 flex items-center gap-2">
                       🏆 Tournoi
                     </p>
                     <p className="text-sm font-black text-orange-600 uppercase italic">{teamInfo?.tournamentReach || 'Non défini'}</p>
                   </div>
                   <Trophy size={32} className="text-orange-400" />
                 </div>
              </div>
           </div>
        </section>

        {/* ACTION FINALE */}
        <button
          onClick={() => router.push('/profile/edit')}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black py-6 rounded-[2.5rem] shadow-xl shadow-orange-300 active:scale-95 transition-all uppercase italic text-lg flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-orange-400 animate-in fade-in slide-in-from-bottom duration-500 border-2 border-orange-400"
          style={{ animationDelay: '500ms' }}
        >
          <Edit3 size={22} /> MODIFIER MON PROFIL
        </button>

      </main>
    </div>
  );
}
