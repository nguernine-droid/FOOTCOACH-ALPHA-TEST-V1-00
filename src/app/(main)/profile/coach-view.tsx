'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { CoachCard } from '@/components/CoachCard';
import {
  ChevronLeft, Share2, Edit3, User, BookOpen, Navigation,
  Layers, Trophy, ShieldCheck, MapPin, Zap
} from 'lucide-react';

/**
 * COACH_VIEW (v16.0 - MASTER TAP-TO-FULL EXPERIENCE)
 * Vue 1 : Carte Prestige (Tap to expand)
 * Vue 2 : Profil Complet (Scrollable details)
 */
export function CoachView({ onActivateParent }: { onActivateParent?: () => void }) {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const [showFullProfile, setShowFullProfile] = useState(false);

  // Stats simulées
  const stats = { matchesPlayed: 12, announcementsSent: 8, contactsMade: 15, engagementRate: 100 };

  return (
    <div className={`min-h-screen bg-black relative flex flex-col items-center ${showFullProfile ? 'pt-10' : 'justify-center'}`}>

      {/* BOUTON RETOUR DISCRET */}
      <button
        onClick={() => showFullProfile ? setShowFullProfile(false) : router.push('/dashboard')}
        className="absolute top-10 left-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-white active:scale-90 transition-all z-[60] shadow-2xl"
      >
        <ChevronLeft size={24} strokeWidth={3} />
      </button>

      {/* 1. LA FICHE MAÎTRE (TAP POUR DÉPLIER) */}
      <div
        className={`w-full flex justify-center px-6 transition-all duration-700 ${showFullProfile ? 'scale-90 opacity-60 pointer-events-none' : 'scale-100 opacity-100'}`}
        onClick={() => setShowFullProfile(true)}
      >
        <CoachCard
          name={teamInfo?.coachName || teamInfo?.userFirstName || 'COACH'}
          coachPhoto={teamInfo?.coachPhoto}
          clubName={teamInfo?.clubName || 'UNITÉ_TACTIQUE'}
          clubLogo={teamInfo?.clubLogo}
          category={teamInfo?.category || 'SÉNIORS'}
          points={teamInfo?.xp || 0}
          status={teamInfo?.coachStatus || 'actif'}
          matchesPlayed={stats.matchesPlayed}
          announcementsSent={stats.announcementsSent}
          contactsMade={stats.contactsMade}
          engagementRate={stats.engagementRate}
        />
      </div>

      {/* 2. PROFIL COMPLET (DÉPLIÉ) */}
      {showFullProfile && (
        <div className="w-full flex-1 px-6 pb-40 animate-in slide-in-from-bottom duration-500 overflow-y-auto pt-10">

          <div className="space-y-10">
            {/* EN-TÊTE DÉPLIÉ */}
            <div className="text-center space-y-2">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Profil_Détaillé</h2>
               <p className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500">Nexus_Tactical_Archive</p>
            </div>

            {/* SECTION 1 : BIOGRAPHIE */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-2 border-b border-white/10 pb-2">
                <BookOpen size={14} className="text-orange-600" />
                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Ma Philosophie</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 italic text-sm text-gray-300 leading-relaxed shadow-inner">
                "{teamInfo?.bio || "Aucune description renseignée pour le moment."}"
              </div>
            </section>

            {/* SECTION 2 : RAYONS D'ACTION */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-2 border-b border-white/10 pb-2">
                <Navigation size={14} className="text-orange-600" />
                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Périmètres de Mission</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] text-center">
                  <p className="text-[8px] font-black uppercase text-gray-500 mb-1">Match Amical</p>
                  <p className="text-lg font-black text-[#39FF14]">{teamInfo?.matchDistMax || 30} KM</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] text-center">
                  <p className="text-[8px] font-black uppercase text-gray-500 mb-1">Plateau</p>
                  <p className="text-lg font-black text-blue-500">{teamInfo?.plateauDistMax || 20} KM</p>
                </div>
              </div>
            </section>

            {/* SECTION 3 : LOCALISATION QG */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-2 border-b border-white/10 pb-2">
                <MapPin size={14} className="text-orange-600" />
                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Logistique_QG</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-gray-500">Ma Ville</span>
                    <span className="text-xs font-black text-white uppercase italic">{teamInfo?.clubCity || "Non renseigné"}</span>
                 </div>
                 <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <span className="text-[9px] font-black uppercase text-gray-500">Mon Stade</span>
                    <span className="text-xs font-black text-white uppercase italic">{teamInfo?.clubStadium || "Non renseigné"}</span>
                 </div>
              </div>
            </section>

            {/* SECTION 4 : BOUTON MODIFIER (FINAL) */}
            <button
              onClick={() => router.push('/profile/edit')}
              className="w-full bg-orange-600 text-white font-black py-7 rounded-[3rem] shadow-2xl active:scale-95 transition-all uppercase italic text-2xl flex items-center justify-center gap-4"
            >
              <Edit3 size={24} /> MODIFIER MON PROFIL
            </button>

            <button
              onClick={() => setShowFullProfile(false)}
              className="w-full text-center text-gray-500 font-black uppercase text-[10px] tracking-widest pt-4"
            >
              Fermer le profil détaillé
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
