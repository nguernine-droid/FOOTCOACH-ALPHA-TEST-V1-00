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
          className="absolute top-12 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-[60]"
        >
          <ChevronLeft size={24} strokeWidth={3} />
        </button>

        <div className="w-full flex justify-center px-6" onClick={() => setShowFullProfile(true)}>
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
            // Props verso (non utilisées ici car on switch de page)
            grade={teamInfo?.coachGrade || 'COACH ENGAGÉ'}
            matchDist={teamInfo?.matchDistMax || 30}
            plateauDist={teamInfo?.plateauDistMax || 20}
            tournamentReach={teamInfo?.tournamentReach || 'departemental'}
          />
        </div>
        <p className="mt-8 text-white/20 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Toucher pour ouvrir le profil</p>
      </div>
    );
  }

  // --- RENDU 2 : LA PAGE PROFIL CLASSIQUE ---
  return (
    <div className="fixed inset-0 z-[70] bg-gray-50 overflow-y-auto animate-in slide-in-from-bottom duration-500">
      {/* Header Page */}
      <header className="bg-white border-b border-gray-200 p-6 sticky top-0 z-[80] flex items-center gap-4">
        <button onClick={() => setShowFullProfile(false)} className="text-gray-900 active:scale-90">
          <ChevronLeft size={28} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">Profil_Dossier</h1>
      </header>

      <main className="p-5 max-w-md mx-auto space-y-8 pb-40">

        {/* 1. UTILISATEUR */}
        <section className="space-y-4">
           <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <User size={14} className="text-orange-600" /> Utilisateur
           </label>
           <div className="bg-white rounded-[2.5rem] p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-5">
                 <div className="w-20 h-20 rounded-3xl border-2 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" /> : <User size={32} className="text-gray-200" />}
                 </div>
                 <div className="space-y-1">
                    <p className="text-lg font-black uppercase text-gray-900 leading-tight">{teamInfo?.userFirstName} {teamInfo?.userLastName}</p>
                    <p className="text-xs font-bold text-orange-600 uppercase italic">Surnom: {teamInfo?.coachName}</p>
                    <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[8px] font-black uppercase inline-block mt-1">
                       {teamInfo?.coachGrade || 'Coach Engagé'}
                    </div>
                 </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex items-center gap-3">
                 <Phone size={16} className="text-gray-400" />
                 <p className="text-xs font-bold text-gray-500">Contact: <span className="text-gray-900 ml-1">{teamInfo?.phone || "Non renseigné"}</span></p>
              </div>
           </div>
        </section>

        {/* 2. LE CLUB (UNITÉ) */}
        <section className="space-y-4">
           <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <Shield size={14} className="text-orange-600" /> Mon Club
           </label>
           <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] p-4 border-4 border-gray-50 shadow-xl flex items-center justify-center">
                 {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" /> : <Shield size={60} className="text-gray-100" />}
              </div>
              <div className="space-y-1">
                 <h2 className="text-2xl font-black uppercase italic text-gray-900 tracking-tighter">{teamInfo?.clubName}</h2>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Catégorie {teamInfo?.category}</p>
                 <p className="text-xs font-black text-orange-600 uppercase italic mt-1">Niveau {teamInfo?.level}</p>
              </div>
              {teamInfo?.refCategories && teamInfo.refCategories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                   {teamInfo.refCategories.map(cat => (
                     <span key={cat} className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-xl text-[9px] font-black text-gray-600 uppercase">{cat}</span>
                   ))}
                </div>
              )}
           </div>
        </section>

        {/* 3. LOGISTIQUE QG */}
        <section className="space-y-4">
           <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <MapPin size={14} className="text-orange-600" /> Logistique_QG
           </label>
           <div className="bg-white rounded-[2.5rem] p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase text-gray-400">Ma Ville</span>
                 <span className="text-sm font-black text-gray-900 uppercase italic">{teamInfo?.clubCity || "À définir"}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                 <span className="text-[10px] font-black uppercase text-gray-400">Mon Stade</span>
                 <span className="text-sm font-black text-gray-900 uppercase italic text-right ml-4 truncate">{teamInfo?.clubStadium || "À définir"}</span>
              </div>
           </div>
        </section>

        {/* 4. RAYONS D'ACTION */}
        <section className="space-y-4">
           <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <Navigation size={14} className="text-orange-600" /> Rayons de Déplacement
           </label>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[2rem] border border-gray-200 shadow-sm text-center">
                 <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Amical</p>
                 <p className="text-lg font-black text-[#39FF14] italic">{teamInfo?.matchDistMax || 30} KM</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] border border-gray-200 shadow-sm text-center">
                 <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Plateau</p>
                 <p className="text-lg font-black text-blue-500 italic">{teamInfo?.plateauDistMax || 20} KM</p>
              </div>
              <div className="col-span-2 bg-white p-4 rounded-[2rem] border border-gray-200 shadow-sm flex justify-between items-center px-8">
                 <p className="text-[8px] font-black uppercase text-gray-400">Tournoi</p>
                 <p className="text-xs font-black text-orange-600 uppercase italic">{teamInfo?.tournamentReach}</p>
              </div>
           </div>
        </section>

        {/* ACTION FINALE */}
        <button
          onClick={() => router.push('/profile/edit')}
          className="w-full bg-orange-600 text-white font-black py-7 rounded-[3rem] shadow-2xl shadow-orange-200 active:scale-95 transition-all uppercase italic text-2xl flex items-center justify-center gap-4"
        >
          <Edit3 size={24} /> MODIFIER MON PROFIL
        </button>

      </main>
    </div>
  );
}
