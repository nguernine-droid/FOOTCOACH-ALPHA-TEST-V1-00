'use client';

import React, { useState, useId } from 'react';
import { X, Send, MessageCircle, Megaphone, UserCheck } from 'lucide-react';
import { useDialogA11y } from '@/lib/hooks/useDialogA11y';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayers: any[];
  onSend: (data: any) => void;
  actionType: 'convocation' | 'message' | 'annonce';
}

const getAvatarUrl = (name: string, size = 30) =>
  `https://i.pravatar.cc/${size}?u=${encodeURIComponent(name)}`;

export function ActionModal({ isOpen, onClose, selectedPlayers, onSend, actionType }: ActionModalProps) {
  const [actionData, setActionData] = useState({
    opponent: '',
    date: '',
    time: '',
    location: '',
    message: '',
    target: 'players' // Par défaut fixé sur joueurs pour l'Alpha
  });
  const dialogRef = useDialogA11y(isOpen, onClose);
  const uid = useId();

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setActionData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickMessage = (msg: string) => {
    setActionData((prev) => ({ ...prev, message: prev.message ? `${prev.message} ${msg}` : msg }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(actionData);
  };

  const inputClass = "w-full bg-[#15171C] text-white border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange transition-all text-white";
  const quickMessages = ["⚽️ Arrivez 30 min avant", "⚠️ Match important", "🏥 Certificat médical requis"];

  const modalTitles: any = {
    convocation: { text: 'Convocation Match', icon: Send },
    message: { text: 'Envoyer un Message', icon: MessageCircle },
    annonce: { text: 'Briefing Unité', icon: Megaphone }
  };

  const currentMode = modalTitles[actionType] || modalTitles.message;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={currentMode.text}
      tabIndex={-1}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-4 outline-none animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#1D2027] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300"
      >
        <div className="bg-[#15171C] px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
              <currentMode.icon size={12} className="text-brand-orange" aria-hidden="true" /> {currentMode.text}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 bg-white/5 rounded-full text-white/20 hover:text-white transition-colors">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Destinataires */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest px-1">Destinataires ({selectedPlayers.length})</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto no-scrollbar p-1">
              {selectedPlayers.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
                  <img src={getAvatarUrl(p.name, 30)} className="w-5 h-5 rounded-full object-cover" alt="" />
                  <span className="text-[10px] font-black text-white/80 uppercase italic">{p.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {actionType === 'convocation' && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div>
                <label htmlFor={`${uid}-opponent`} className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Adversaire</label>
                <input id={`${uid}-opponent`} type="text" name="opponent" value={actionData.opponent} onChange={handleChange} className={inputClass} required placeholder="Ex: FC Versailles" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${uid}-date`} className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Date</label>
                  <input id={`${uid}-date`} type="date" name="date" value={actionData.date} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor={`${uid}-time`} className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Heure</label>
                  <input id={`${uid}-time`} type="time" name="time" value={actionData.time} onChange={handleChange} className={inputClass} required />
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-location`} className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Lieu / Stade</label>
                <input id={`${uid}-location`} type="text" name="location" value={actionData.location} onChange={handleChange} className={inputClass} required placeholder="Ex: Stade Municipal" />
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2 border-t border-white/5">
            <div>
              <label htmlFor={`${uid}-message`} className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Message</label>
              <textarea id={`${uid}-message`} name="message" value={actionData.message} onChange={handleChange} rows={3} className={`${inputClass} resize-none min-h-[80px]`} placeholder="Écrivez ici..."></textarea>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickMessages.map(qMsg => (
                <button
                  key={qMsg}
                  type="button"
                  onClick={() => handleQuickMessage(qMsg)}
                  className="bg-white/5 text-white/40 text-[8px] font-black px-3 py-1.5 rounded-xl border border-white/5 hover:text-white transition-all uppercase italic"
                >
                  {qMsg}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-brand-orange text-white font-black text-xs py-4 rounded-[2rem] hover:bg-brand-orange-dark transition-all shadow-xl shadow-brand-orange/20 flex items-center justify-center gap-2 mt-2 uppercase italic tracking-widest">
            <Send size={16} strokeWidth={3} /> Envoyer maintenant
          </button>
        </div>
      </form>
    </div>
  );
}
