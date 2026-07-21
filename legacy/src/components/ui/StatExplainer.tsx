'use client';

import React, { useState } from 'react';
import { X, Brain, Users, Zap, Info } from 'lucide-react';
import { useDialogA11y } from '@/lib/hooks/useDialogA11y';

interface StatExplainerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'DOC' | 'SYN' | 'INF';
}

const STAT_INFO = {
  DOC: {
    title: 'Doctrine_Tactique',
    icon: Brain,
    color: 'text-neon-orange',
    bg: 'bg-neon-orange/10',
    border: 'border-neon-orange/30',
    desc: 'Représente votre intelligence de jeu et votre rigueur technique.',
    how: 'Augmente en créant des schémas tactiques, en gérant vos feuilles de match et en validant vos diplômes.',
    bonus: 'Débloque des formations avancées et une meilleure lecture de l\'adversaire.'
  },
  SYN: {
    title: 'Synergie_Groupe',
    icon: Users,
    color: 'text-neon-cyan',
    bg: 'bg-neon-cyan/10',
    border: 'border-neon-cyan/30',
    desc: 'Mesure la cohésion et la motivation de votre effectif.',
    how: 'Augmente via la communication régulière, les sondages de présence et la réactivité de vos joueurs.',
    bonus: 'Réduit les risques de forfaits et booste le moral des joueurs en match.'
  },
  INF: {
    title: 'Influence_Réseau',
    icon: Zap,
    color: 'text-neon-magenta',
    bg: 'bg-neon-magenta/10',
    border: 'border-neon-magenta/30',
    desc: 'Votre poids politique et votre charisme dans le District.',
    how: 'Augmente en validant des matchs sur le Radar, en participant aux tournois et via vos interactions sociales.',
    bonus: 'Priorise vos signaux sur le Radar et attire des adversaires de plus haut niveau.'
  }
};

export function StatExplainer({ isOpen, onClose, type }: StatExplainerProps) {
  const dialogRef = useDialogA11y(isOpen, onClose);
  if (!isOpen) return null;
  const info = STAT_INFO[type];
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={info.title.replace(/_/g, ' ')}
        tabIndex={-1}
        className={`relative w-full max-w-sm rounded-[2.5rem] border-2 outline-none ${info.border} ${info.bg} p-8 shadow-2xl overflow-hidden`}
      >
        {/* Glow Decor */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-20 ${info.color.replace('text', 'bg')}`} />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className={`w-20 h-20 rounded-2xl border-2 ${info.border} flex items-center justify-center ${info.bg} shadow-lg shadow-current/10`}>
            <Icon size={40} className={info.color} aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Protocole_Identité</p>
            <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${info.color}`}>
              {info.title}
            </h2>
          </div>

          <div className="space-y-4 w-full">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-left">
              <p className="text-[10px] font-black text-white/40 uppercase mb-2">Définition</p>
              <p className="text-xs text-white leading-relaxed font-medium italic">"{info.desc}"</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-left">
              <p className="text-[10px] font-black text-white/40 uppercase mb-2">Progression</p>
              <p className="text-[11px] text-white/80 leading-relaxed font-medium">{info.how}</p>
            </div>

            <div className={`p-4 rounded-2xl ${info.bg} border ${info.border} text-left`}>
              <p className={`text-[10px] font-black uppercase mb-2 ${info.color}`}>Bonus_Actif</p>
              <p className="text-[11px] text-white font-bold leading-relaxed">{info.bonus}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-full py-4 rounded-xl font-black uppercase italic text-xs tracking-widest border transition-all active:scale-95 ${info.color} ${info.border} hover:bg-white/5`}
          >
            Fermer_Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
