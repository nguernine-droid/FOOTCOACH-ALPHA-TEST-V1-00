'use client';

import React from 'react';
import { Calendar, Trophy, Zap, Clock, MapPin, CheckCircle2, X, Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { NeonButton } from '@/components/ui/cyber/NeonButton';

// ==========================================
// TYPES
// ==========================================
interface NextMissionCardProps {
  event?: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    type: 'match' | 'tournoi' | 'entrainement';
    available: number;
    total: number;
  } | null;
  isPro: boolean;
  role: string;
}

export function NextMissionCard({ event, isPro, role }: NextMissionCardProps) {

  // -- ÉTAT VIDE : Aucune mission programmée --
  if (!event) {
    return (
      <Link href="/events/new" className={`block py-16 text-center group active:scale-[0.98] transition-all border-2 border-dashed rounded-2xl ${
        isPro ? 'border-gray-300 bg-white text-gray-500 hover:border-orange-500' : 'border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan/60 hover:border-neon-cyan'
      }`}>
        <Plus size={32} className="mx-auto mb-2 transition-colors" />
        <p className="text-[10px] font-black uppercase tracking-[0.25em] px-10">
          {isPro ? "Ajouter un événement" : "INITIALISER_MISSION..."}
        </p>
      </Link>
    );
  }

  // -- ÉTAT PLEIN : Mission en cours --
  const isMatch = event.type.includes('match') || event.type === 'tournoi';

  // Styles dynamiques selon le type d'événement et le thème
  const themeStyles = isPro ? {
    cardBg: isMatch ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200',
    badgeBg: isMatch ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-blue-100 border-blue-300 text-blue-700',
    iconColor: isMatch ? 'text-orange-600 bg-orange-100 border-orange-300' : 'text-blue-600 bg-blue-100 border-blue-300',
    progressBar: isMatch ? 'bg-orange-500' : 'bg-blue-500',
  } : {
    cardBg: isMatch ? 'bg-[#0A0500] border-neon-orange/50 shadow-[0_0_30px_rgba(255,107,0,0.1)]' : 'bg-[#00050A] border-neon-cyan/50 shadow-[0_0_30px_rgba(0,240,255,0.1)]',
    badgeBg: isMatch ? 'bg-neon-orange/10 border-neon-orange/30 text-neon-orange shadow-[0_0_15px_rgba(255,107,0,0.2)]' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]',
    iconColor: isMatch ? 'text-neon-orange bg-neon-orange/20 border-neon-orange/40' : 'text-neon-cyan bg-neon-cyan/20 border-neon-cyan/40',
    progressBar: isMatch ? 'bg-neon-orange' : 'bg-neon-cyan',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-8 border-2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 ${themeStyles.cardBg}`}>
      {/* Icône d'eau marque en fond */}
      <div className="absolute top-[-20px] right-[-20px] opacity-[0.05] rotate-12 scale-150 pointer-events-none">
        {isMatch ? <Trophy size={160} /> : <Calendar size={160} />}
      </div>

      <div className="relative z-10 space-y-6 text-left">
        {/* Header : Date & Type */}
        <div className="flex justify-between items-start">
          <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border ${themeStyles.badgeBg}`}>
            <span className="font-mono">{new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()}</span> // {event.time}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-lg ${themeStyles.iconColor}`}>
            {isMatch ? <Zap size={20} /> : <Clock size={20} />}
          </div>
        </div>

        {/* Contenu Principal */}
        <div>
          <h2 className={`text-3xl font-black italic uppercase leading-none tracking-tighter mb-2 ${isPro ? 'text-gray-900' : 'text-white'}`}>
            {event.title}
          </h2>
          <div className={`flex items-center gap-2 ${isPro ? 'text-gray-500' : 'text-white/50'} text-[10px] font-black font-mono tracking-widest`}>
            <MapPin size={12} className={isMatch ? (isPro ? 'text-orange-600' : 'text-neon-orange') : (isPro ? 'text-blue-600' : 'text-neon-cyan')} />
            {event.location?.toUpperCase() || 'BASE_STADIUM_ALPHA'}
          </div>
        </div>

        {/* Disponibilités & Action */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex justify-between items-center mb-1">
              <p className={`text-[9px] font-black uppercase ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>Disponibilités</p>
              <p className={`text-[9px] font-black ${isMatch ? (isPro ? 'text-orange-600' : 'text-neon-orange') : (isPro ? 'text-blue-600' : 'text-neon-cyan')}`}>
                {event.available} / {event.total}
              </p>
            </div>
            <div className={`w-full ${isPro ? 'bg-gray-100' : 'bg-white/10'} rounded-full h-2 overflow-hidden`}>
              <div className={`h-full ${themeStyles.progressBar} rounded-full transition-all`} style={{ width: `${(event.available / event.total) * 100}%` }} />
            </div>
          </div>

          {/* Boutons d'action selon le rôle */}
          {role === 'coach' ? (
            <NeonButton variant={isMatch ? 'orange' : 'cyan'} size="md" className="flex items-center gap-2 flex-shrink-0">
              SCAN <CheckCircle2 size={14} />
            </NeonButton>
          ) : (
            <div className="flex gap-3 flex-shrink-0">
              <button className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all border-2 ${isPro ? 'bg-green-50 border-green-500 text-green-600' : 'bg-[#39FF14]/10 border-[#39FF14] text-[#39FF14] shadow-[0_0_15px_rgba(0,255,157,0.3)]'}`}>
                <Check size={24} strokeWidth={4} />
              </button>
              <button className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all border-2 ${isPro ? 'bg-red-50 border-red-500 text-red-600' : 'bg-neon-magenta/10 border-neon-magenta text-neon-magenta shadow-[0_0_15px_rgba(255,0,102,0.3)]'}`}>
                <X size={24} strokeWidth={4} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
