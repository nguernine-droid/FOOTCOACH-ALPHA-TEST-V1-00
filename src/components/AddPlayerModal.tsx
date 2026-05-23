'use client';

import React from 'react';
import { X, ChevronDown } from 'lucide-react';

interface AddPlayerModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  data: any;
  setData: (data: any) => void;
}

export function AddPlayerModal({ onClose, onSubmit, data, setData }: AddPlayerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-300" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        <div className="bg-gray-900 px-8 py-6 flex items-center justify-between text-white">
          <h3 className="text-xl font-black italic uppercase italic tracking-tighter">Nouveau Joueur</h3>
          <button type="button" onClick={onClose} className="p-2 bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nom complet</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData({...data, name: e.target.value})}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all"
              required
              placeholder="Ex: Kylian Mbappé"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Poste</label>
              <div className="relative">
                <select
                  value={data.position}
                  onChange={(e) => setData({...data, position: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="GB">Gardien (GB)</option>
                  <option value="DC">Défenseur (DC)</option>
                  <option value="MDC">Milieu (MDC)</option>
                  <option value="ATT">Attaquant (ATT)</option>
                  <option value="BU">Buteur (BU)</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Note de départ</label>
              <input
                type="number"
                min="40"
                max="99"
                value={data.rating}
                onChange={(e) => setData({...data, rating: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-orange text-white font-black py-5 rounded-[2rem] shadow-xl shadow-brand-orange/20 active:scale-95 transition-all uppercase italic tracking-tighter text-lg mt-4">
            Valider l'inscription
          </button>
        </div>
      </form>
    </div>
  );
}
