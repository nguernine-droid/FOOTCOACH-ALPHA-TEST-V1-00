'use client';

import React, { useState } from 'react';
import { X, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogA11y } from '@/lib/hooks/useDialogA11y';

const MOTIFS = [
  { id: 'distance', label: 'Trop loin',       emoji: '📍' },
  { id: 'date',     label: 'Date impossible', emoji: '📅' },
  { id: 'niveau',   label: 'Niveau différent', emoji: '⚖️' },
];

interface RefuseModalProps {
  isOpen: boolean;
  coachName: string;
  isPro: boolean;
  onConfirm: (motif: string) => Promise<void>;
  onCancel: () => void;
}

export function RefuseModal({ isOpen, coachName, isPro, onConfirm, onCancel }: RefuseModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useDialogA11y(isOpen, onCancel);

  const handleConfirm = async () => {
    if (!selected || isLoading) return;
    setIsLoading(true);
    await onConfirm(selected);
    setIsLoading(false);
    setSelected(null);
  };

  const handleCancel = () => {
    setSelected(null);
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center">
          {/* Fond */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCancel}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Refuser la demande de ${coachName}`}
            tabIndex={-1}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 space-y-6 shadow-2xl outline-none
              ${isPro ? 'bg-white' : 'bg-[#0A0A0A] border-t border-white/10'}`}
          >
            {/* Handle */}
            <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-2" />

            {/* Titre */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>
                  Refuser la demande de
                </p>
                <h2 className={`text-xl font-black uppercase italic ${isPro ? 'text-gray-900' : 'text-white'}`}>
                  {coachName}
                </h2>
              </div>
              <button onClick={handleCancel} aria-label="Fermer" className="p-2 rounded-full bg-white/10">
                <X size={20} className="text-gray-500" aria-hidden="true" />
              </button>
            </div>

            {/* Motifs */}
            <div className="space-y-3">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>
                Motif du refus
              </p>
              <div className="grid grid-cols-2 gap-3">
                {MOTIFS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-black text-left transition-all active:scale-95
                      ${selected === m.id
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : isPro
                          ? 'border-gray-100 bg-gray-50 text-gray-600'
                          : 'border-white/10 bg-white/5 text-gray-400'
                      }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[11px] uppercase leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton confirmer */}
            <button
              onClick={handleConfirm}
              disabled={!selected || isLoading}
              className="w-full py-5 rounded-2xl bg-red-500 text-white font-black uppercase italic text-sm
                flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
            >
              {isLoading
                ? <Loader2 size={20} className="animate-spin" />
                : <XCircle size={20} />
              }
              Confirmer le refus
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
