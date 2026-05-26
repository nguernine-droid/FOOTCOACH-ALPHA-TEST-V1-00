'use client';

import React from 'react';
import {
  Shield, Zap, Star, MessageSquare, Clock, MapPin,
  CheckCircle2, XCircle, Wifi, Trophy, Layers, ChevronRight
} from 'lucide-react';
import { MatchRequest } from './page';

interface MatchRequestCardProps {
  request: MatchRequest;
  isPro: boolean;
  currentCoachId: string;
  onInterested: (id: string) => void;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  onChat: (request: MatchRequest) => void;
}

/**
 * MATCH_REQUEST_CARD (v27.0 - MASTER CLASSIC ELITE)
 * Design "Mini-Carte" avec Blasons XXL et Hiérarchie de Terrain.
 */
export function MatchRequestCard({
  request, isPro, currentCoachId, onInterested, onAccept, onRefuse, onChat
}: MatchRequestCardProps) {

  const isMine = request.coachId === currentCoachId;
  const isPending = request.status === 'PENDING';
  const isMatched = request.status === 'MATCHED';
  const amIRespondent = request.respondentId === currentCoachId;

  // --- COULEURS TACTIQUES ---
  const typeThemes = {
    'Match Amical': { border: 'border-[#16a34a]', glow: 'shadow-[0_0_15px_rgba(22,163,74,0.3)]', accent: 'text-[#16a34a]', bg: 'bg-[#16a34a]/10', icon: <Zap size={14}/> },
    'Plateau': { border: 'border-blue-600', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.3)]', accent: 'text-blue-500', bg: 'bg-blue-600/10', icon: <Layers size={14}/> },
    'Tournoi': { border: 'border-red-600', glow: 'shadow-[0_0_15px_rgba(220,38,38,0.3)]', accent: 'text-red-500', bg: 'bg-red-600/10', icon: <Trophy size={14}/> }
  };

  const t = typeThemes[request.type as keyof typeof typeThemes] || typeThemes['Match Amical'];

  return (
    <div className={`w-full bg-white rounded-[2.5rem] border-[3px] ${t.border} ${t.glow} overflow-hidden relative transition-all active:scale-[0.98] group`}>

      {/* 1. SOMMET : CLUB & TYPE */}
      <div className="flex justify-between items-center p-5 pb-3 border-b border-gray-100">
         <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-md border border-gray-100 flex items-center justify-center">
               {request.coachLogo ? <img src={request.coachLogo} className="w-full h-full object-contain" /> : <Shield className="text-gray-200" size={24} />}
            </div>
            <div className="text-left">
               <h3 className="text-xs font-black uppercase italic tracking-tighter text-gray-900 line-clamp-1">{request.coachClub}</h3>
               <div className={`px-2 py-0.5 rounded flex items-center gap-1.5 text-[8px] font-black uppercase ${t.bg} ${t.accent}`}>
                  {t.icon} {request.type}
               </div>
            </div>
         </div>
         <div className="text-right">
            <p className="text-sm font-black italic text-gray-900 leading-none">V.{request.category}</p>
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-1">Catégorie</p>
         </div>
      </div>

      {/* 2. CENTRE : IDENTITÉ & LOGISTIQUE */}
      <div className="p-6 space-y-4">
         <div className="flex items-end justify-between gap-4">
            <div className="text-left">
               <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Coach Responsable</p>
               <h2 className="text-xl font-black uppercase italic text-gray-900 tracking-tighter">{request.coachName}</h2>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-900 italic">
                  <Clock size={12} className={t.accent} /> {new Date(request.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {request.time}
               </div>
            </div>
         </div>

         {/* BLOC LIEU */}
         <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center ${t.accent}`}><MapPin size={18} /></div>
               <div className="text-left">
                  <p className="text-[10px] font-black text-gray-900 uppercase italic leading-none">{request.location}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 truncate max-w-[150px]">{request.stadium || "Arène à définir"}</p>
               </div>
            </div>
            <div className="text-right">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">30 KM</span>
            </div>
         </div>

         {request.comment && (
            <p className="text-[10px] italic text-gray-500 px-1 border-l-2 border-gray-200 py-1">"{request.comment}"</p>
         )}
      </div>

      {/* 3. ACTIONS PIED DE PAGE */}
      <div className="px-5 pb-5">
         {isMatched ? (
            <div className="w-full bg-[#16a34a] text-white py-4 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-3 shadow-lg">
               <CheckCircle2 size={18} /> MATCH_VALIDÉ
               <button onClick={(e) => { e.stopPropagation(); onChat(request); }} className="ml-4 p-2 bg-white/20 rounded-lg active:scale-90 transition-all"><MessageSquare size={16}/></button>
            </div>
         ) : isMine ? (
            <div className="w-full bg-gray-100 py-4 rounded-2xl text-center">
               {isPending ? (
                 <div className="flex items-center justify-between px-6">
                    <p className="text-[9px] font-black text-orange-600 uppercase">Réponse reçue !</p>
                    <div className="flex gap-2">
                       <button onClick={(e) => { e.stopPropagation(); onChat(request); }} className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><MessageSquare size={16}/></button>
                       <button onClick={(e) => { e.stopPropagation(); onAccept(request.id); }} className="p-2 bg-[#16a34a] text-white rounded-lg shadow-sm"><CheckCircle2 size={16}/></button>
                    </div>
                 </div>
               ) : (
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2 animate-pulse"><Wifi size={12}/> Signal_En_Émission...</p>
               )}
            </div>
         ) : (
            <button
              onClick={(e) => { e.stopPropagation(); isPending ? onChat(request) : onInterested(request.id); }}
              className={`w-full py-5 rounded-2xl font-black uppercase italic text-xs transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl
                ${isPending ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-600 text-white shadow-orange-100'}
              `}
            >
               {isPending ? <><MessageSquare size={18}/> CONTACTER LE COACH</> : <><Zap size={18} fill="currentColor"/> PROPOSER MATCH</>}
            </button>
         )}
      </div>

    </div>
  );
}
