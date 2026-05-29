'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOTIFS = [
  { id: 'blessure',   label: 'Blessure / Effectif insuffisant', emoji: '🤕' },
  { id: 'meteo',      label: 'Conditions météo',                emoji: '⛈️' },
  { id: 'terrain',    label: 'Terrain indisponible',            emoji: '🏟️' },
  { id: 'personnel',  label: 'Raison personnelle',              emoji: '👤' },
];

interface SosModalProps {
  isOpen: boolean;
  eventTitle: string;
  isPro: boolean;
  onConfirm: (motif: string) => Promise<void>;
  onCancel: () => void;
}

export function SosModal({ isOpen, eventTitle, isPro, onConfirm, onCancel }: SosModalProps) {
  const [selected, setSelected]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected || isLoading) return;
    setIsLoading(true);
    await onConfirm(selected);
    setIsLoading(false);
    setSelected(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-md rounded-t-[2.5rem] pb-10 overflow-hidden shadow-2xl
              ${isPro ? 'bg-white' : 'bg-[#0A0A0A] border-t border-white/10'}`}
          >
            {/* Header rouge SOS */}
            <div className="bg-red-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={22} className="text-white animate-pulse" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                      {isPro ? 'Déclaration de forfait' : 'Mode Alerte 🚨'}
                    </p>
                    <p className="text-sm font-black uppercase text-white leading-tight truncate">
                      {eventTitle}
                    </p>
                  </div>
                </div>
                <button onClick={onCancel} className="p-2 rounded-full bg-white/20">
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Avertissement */}
              <div className={`rounded-2xl p-4 ${isPro ? 'bg-red-50 border border-red-100' : 'bg-red-500/10 border border-red-500/20'}`}>
                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">
                  ⚠️ {isPro ? 'Ce match sera annulé.' : 'Signal SOS émis immédiatement.'}
                </p>
                <p className="text-[10px] font-bold text-red-400/70 mt-1">
                  {isPro
                    ? "Une notification sera envoyée à l'adversaire. L'annonce sera remise en ligne."
                    : "Tous les coachs 'Toujours Prêt' dans votre catégorie seront alertés. Le premier à répondre remporte un bonus XP !"
                  }
                </p>
              </div>

              {/* Motifs */}
              <div className="space-y-2">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>
                  Motif du forfait
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {MOTIFS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelected(m.id)}
                      className={`flex items-center gap-2 p-4 rounded-2xl border-2 text-left transition-all active:scale-95
                        ${selected === m.id
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : isPro ? 'border-gray-100 bg-gray-50 text-gray-600' : 'border-white/10 bg-white/5 text-gray-400'
                        }`}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <span className="text-[10px] font-black uppercase leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bouton confirmer */}
              <button
                onClick={handleConfirm}
                disabled={!selected || isLoading}
                className="w-full py-5 rounded-2xl bg-red-600 text-white font-black uppercase italic text-sm
                  flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
              >
                {isLoading
                  ? <Loader2 size={20} className="animate-spin" />
                  : <AlertTriangle size={20} />
                }
                {isPro ? 'Confirmer le forfait' : '🚨 Émettre le signal SOS'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
