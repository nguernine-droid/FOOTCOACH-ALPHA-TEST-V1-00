'use client';

import React, { useState } from 'react';
import {
  User, Shield, MapPin, Navigation, Trophy, Calendar,
  MessageCircle, Settings, Edit3, Camera, Flame, CheckCircle2,
  ChevronRight, Globe, Layers, Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

interface CoachViewProps {
  onActivateParent?: () => void;
}

/**
 * COACH_VIEW (v10.0 - MASTER CLASSIC)
 * Profil d'identité club & terrain. Stratégie de réseau fermé.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo, theme, refreshData } = useTeam();
  const isPro = theme === 'classic';

  // --- CONFIGURATION DES STATUTS ---
  const statusConfig = {
    'inactif': { label: 'INACTIF', color: 'bg-blue-500', glow: 'shadow-[0_0_15px_#3b82f6]', text: 'text-blue-400' },
    'actif': { label: 'ACTIF', color: 'bg-[#39FF14]', glow: 'shadow-[0_0_15px_#39FF14]', text: 'text-[#39FF14]' },
    'toujours_pret': { label: 'TOUJOURS PRÊT', color: 'bg-orange-600', glow: 'shadow-[0_0_15px_#f97316]', text: 'text-orange-500' }
  };

  const currentStatus = statusConfig[teamInfo?.coachStatus || 'inactif'];

  const styles = {
    card: 'bg-white border-gray-100 rounded-[2.5rem] p-6 shadow-sm border space-y-4',
    label: 'text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2',
    value: 'text-sm font-black text-gray-900 uppercase italic',
    badge: 'px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* 1. HEADER IMMERSIF (ARÈNE) */}
      <section className="relative -mx-4 -mt-4 h-64 overflow-hidden rounded-b-[3rem] shadow-2xl">
         <img
           src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800"
           className="w-full h-full object-cover"
           alt="Arena"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

         {/* Boutons d'action rapides */}
         <div className="absolute top-8 right-6 flex gap-3">
            <button onClick={() => router.push('/settings')} className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 transition-all shadow-xl">
               <Settings size={20} />
            </button>
         </div>

         {/* BLASON XXL & STATUT */}
         <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white bg-white p-4 shadow-2xl relative">
               {teamInfo?.clubLogo ? (
                 <img src={teamInfo.clubLogo} className="w-full h-full object-contain" alt="Club" />
               ) : (
                 <Shield size={60} className="text-gray-200 mx-auto mt-4" />
               )}
               {/* Badge de statut pulsant */}
               <div className={`absolute -bottom-2 -right-2 ${currentStatus.color} ${currentStatus.glow} p-2 rounded-xl border-2 border-white animate-pulse`}>
                  {teamInfo?.coachStatus === 'toujours_pret' ? <Flame size={16} className="text-white" /> : <CheckCircle2 size={16} className="text-white" />}
               </div>
            </div>
         </div>
      </section>

      {/* 2. IDENTITÉ DU COACH */}
      <section className="pt-8 text-center space-y-2">
         <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900">{teamInfo?.coachName}</h2>
         <div className="flex items-center justify-center gap-2">
            <span className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-200 shadow-sm">
               {teamInfo?.coachGrade || 'Coach engagé'}
            </span>
            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentStatus.text} bg-white shadow-sm`}>
               {currentStatus.label}
            </span>
         </div>
         <p className="text-sm font-black text-gray-400 uppercase tracking-widest mt-2">{teamInfo?.clubName}</p>
      </section>

      {/* 3. ACTIONS PRIORITAIRES (RÉSEAU FERMÉ) */}
      <section className="grid grid-cols-2 gap-4 px-2">
         <button
           onClick={() => router.push('/comms')}
           className="bg-orange-600 text-white py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
         >
            <MessageCircle size={18} /> Proposer Match
         </button>
         <button
           onClick={() => router.push('/events')}
           className="bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-[2rem] font-black uppercase italic text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3"
         >
            <Calendar size={18} /> Mon Agenda
         </button>
      </section>

      {/* 4. PARAMÈTRES UNITÉ (AUTO-PILOT) */}
      <section className="space-y-4">
         <div className="flex items-center gap-2 px-2 border-b border-gray-100 pb-2">
            <Layers size={14} className="text-orange-600" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Structure_Unité</h3>
         </div>

         <div className={styles.card}>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-1">
                  <p className={styles.label}>Ma Catégorie</p>
                  <p className={styles.value}>{teamInfo?.category}</p>
               </div>
               <div className="space-y-1 text-right">
                  <p className={styles.label}>Niveau</p>
                  <p className={styles.value}>{teamInfo?.level}</p>
               </div>
            </div>
            {teamInfo?.refCategories && teamInfo.refCategories.length > 0 && (
              <div className="pt-4 border-t border-gray-50">
                 <p className={styles.label}>Références</p>
                 <div className="flex flex-wrap gap-2 mt-2">
                    {teamInfo.refCategories.map(cat => (
                      <span key={cat} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{cat}</span>
                    ))}
                 </div>
              </div>
            )}
         </div>
      </section>

      {/* 5. PÉRIMÈTRES DE MISSION (RAYONS) */}
      <section className="space-y-4">
         <div className="flex items-center gap-2 px-2 border-b border-gray-100 pb-2">
            <Navigation size={14} className="text-orange-600" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Rayon_Action</h3>
         </div>

         <div className="space-y-3">
            {/* Match Amical */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-[#39FF14] flex items-center justify-center border border-[#39FF14]/20"><Zap size={20} /></div>
                  <div><p className="text-[10px] font-black text-gray-900 uppercase">Match Amical</p><p className="text-[8px] text-gray-400 uppercase">Distance Max</p></div>
               </div>
               <p className="text-lg font-black text-[#39FF14] italic">{teamInfo?.matchDistMax || 30} KM</p>
            </div>

            {/* Plateau */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-500/20"><Layers size={20} /></div>
                  <div><p className="text-[10px] font-black text-gray-900 uppercase">Plateau</p><p className="text-[8px] text-gray-400 uppercase">Distance Max</p></div>
               </div>
               <p className="text-lg font-black text-blue-500 italic">{teamInfo?.plateauDistMax || 20} KM</p>
            </div>

            {/* Tournoi */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center border border-yellow-500/20"><Trophy size={20} /></div>
                  <div><p className="text-[10px] font-black text-gray-900 uppercase">Tournoi</p><p className="text-[8px] text-gray-400 uppercase">Projection</p></div>
               </div>
               <p className="text-sm font-black text-yellow-600 italic uppercase">
                 {teamInfo?.tournamentReach === 'departemental' ? 'Départemental' :
                  teamInfo?.tournamentReach === 'regional' ? 'Régional' :
                  teamInfo?.tournamentReach === 'national' ? 'National' :
                  `${teamInfo?.tournamentDistMax} KM`}
               </p>
            </div>
         </div>
      </section>

      {/* 6. LOGISTIQUE QG */}
      <section className="space-y-4">
         <div className="flex items-center gap-2 px-2 border-b border-gray-100 pb-2">
            <MapPin size={14} className="text-orange-600" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Logistique_QG</h3>
         </div>
         <div className={styles.card}>
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <p className={styles.label}>Ma Ville</p>
                  <p className={styles.value}>{teamInfo?.clubCity || 'À renseigner'}</p>
               </div>
               <div className="flex justify-between items-center">
                  <p className={styles.label}>Mon Stade</p>
                  <p className={styles.value}>{teamInfo?.clubStadium || 'À renseigner'}</p>
               </div>
            </div>
         </div>
      </section>

      {/* BOUTON MODIFIER FINAL */}
      <button
        onClick={() => router.push('/profile/edit')}
        className="w-full bg-orange-600 text-white font-black py-7 rounded-[3rem] shadow-2xl shadow-orange-200 active:scale-95 transition-all uppercase italic text-2xl"
      >
        MODIFIER MON PROFIL
      </button>

    </div>
  );
}
