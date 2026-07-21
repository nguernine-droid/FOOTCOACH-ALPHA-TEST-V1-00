'use client';

import React from 'react';
import { X, Trophy, Users, Zap, Shield, ChevronRight } from 'lucide-react';
import { useDialogA11y } from '@/lib/hooks/useDialogA11y';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResultsModal({ isOpen, onClose }: ResultsModalProps) {
  const dialogRef = useDialogA11y(isOpen, onClose);
  if (!isOpen) return null;

  const categories = [
    { id: 'matchs', label: 'Matchs', icon: <Trophy size={20} />, color: 'bg-match-red' },
    { id: 'plateau', label: 'Plateaux', icon: <Zap size={20} />, color: 'bg-purple-600' },
    { id: 'tournois', label: 'Tournois', icon: <Shield size={20} />, color: 'bg-amber-400', iconColor: 'text-black' },
    { id: 'interdistrict', label: 'Interdistrict', icon: <Users size={20} />, color: 'bg-sky-400' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Historique des résultats"
        tabIndex={-1}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl outline-none animate-in slide-in-from-bottom duration-300 mx-auto"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        <div className="flex justify-between items-center mb-8 px-2">
          <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Historique Résultats</h2>
          <button onClick={onClose} aria-label="Fermer" className="bg-gray-100 p-2 rounded-full text-gray-400 active:scale-90 transition-transform">
            <X size={20} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 pb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                // Here we would navigate to a specific results sub-page or update content
                onClose();
              }}
              className="w-full flex items-center justify-between p-5 rounded-2xl transition-all border-2 border-gray-50 bg-gray-50 hover:border-brand-orange/30 group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className={`${cat.color} ${cat.iconColor || 'text-white'} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <span className="font-black text-gray-900 uppercase italic text-base">{cat.label}</span>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-orange transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
