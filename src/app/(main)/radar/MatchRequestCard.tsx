'use client';

import React from 'react';
import {
  MapPin, Clock, Shield, Zap,
  CheckCircle2, XCircle, Activity, MessageSquare, Wifi
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
 * MATCH_REQUEST_CARD (v8.3 - ALPHA TEST V1)
 * Correction de l'erreur de syntaxe sur les conditions d'affichage.
 */
export function MatchRequestCard({
  request,
  isPro,
  currentCoachId,
  onInterested,
  onAccept,
  onRefuse,
  onChat
}: MatchRequestCardProps) {
  const isMine = request.coachId === currentCoachId;
  const isPending = request.status === 'PENDING';
  const isMatched = request.status === 'MATCHED';
  const amIRespondent = request.respondentId === currentCoachId;

  const accentColor = isPro ? 'text-blue-600' : 'text-neon-cyan';
  const accentBorder = isPro ? 'border-blue-200' : 'border-neon-cyan/30';
  const cardBg = isPro ? 'bg-white' : 'bg-[#0A0A0A]';

  const getTypeStyles = () => {
    switch (request.type) {
      case 'Match Amical': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'Tournoi': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'Plateau': return 'bg-green-500/10 text-green-500 border-green-500/30';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  return (
    <div className={`p-5 rounded-3xl border-2 transition-all group ${cardBg} ${accentBorder} shadow-xl relative overflow-hidden`}>
      {!isPro && <div className="absolute inset-0 bg-neon-cyan/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}

      <div className="relative z-10 space-y-4 text-left">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'}`}>
              <Shield size={24} className={isMine ? 'text-neon-orange' : accentColor} />
            </div>
            <div className="text-left">
              <h4 className={`text-sm font-black uppercase italic ${isPro ? 'text-gray-900' : 'text-white'}`}>
                {request.coachClub}
              </h4>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                {request.coachName} • {request.category}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${getTypeStyles()}`}>
            {request.type}
          </div>
        </div>

        <div className={`p-3 rounded-xl ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-black/40 border-white/5'} border grid grid-cols-2 gap-3`}>
          <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400">
            <Clock size={12} className={accentColor} />
            <span>{new Date(request.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} @ {request.time}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400">
            <MapPin size={12} className={accentColor} />
            <span className="truncate">{request.location}</span>
          </div>
        </div>

        {request.comment && (
           <p className={`text-[10px] italic ${isPro ? 'text-gray-600' : 'text-gray-400'} px-1 line-clamp-2`}>
             "{request.comment}"
           </p>
        )}

        <div className="pt-2">
          {isMatched ? (
            <div className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/30 shadow-[0_0_15px_#39FF141A]`}>
               <CheckCircle2 size={16} /> Mission_Conclue
               <button onClick={() => onChat(request)} className="ml-4 p-2 bg-[#39FF14] text-black rounded-lg active:scale-90 transition-all">
                  <MessageSquare size={16} strokeWidth={3} />
               </button>
            </div>
          ) : isMine ? (
            <div className="space-y-3">
              {isPending ? (
                <div className={`p-4 rounded-2xl border-2 border-dashed ${isPro ? 'bg-orange-50 border-orange-200' : 'bg-neon-orange/10 border-neon-orange/30'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-left">
                      <p className={`text-[8px] font-black uppercase tracking-widest ${isPro ? 'text-orange-700' : 'text-neon-orange'}`}>Réponse Reçue de :</p>
                      <p className="text-xs font-black text-white italic">{request.respondentName}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onChat(request)} className={`p-2.5 rounded-xl border transition-all active:scale-90 ${isPro ? 'bg-white border-gray-200 text-blue-600' : 'bg-white/5 border-white/10 text-neon-cyan'}`}>
                        <MessageSquare size={20} strokeWidth={3} />
                      </button>
                      <button onClick={() => onAccept(request.id)} className="p-2.5 bg-[#39FF14] text-black rounded-xl shadow-lg active:scale-90 transition-all">
                        <CheckCircle2 size={20} strokeWidth={3} />
                      </button>
                      <button onClick={() => onRefuse(request.id)} className="p-2.5 bg-red-500 text-white rounded-xl shadow-lg active:scale-90 transition-all">
                        <XCircle size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest text-center italic">Validation requise</p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                  <Activity size={14} className="text-gray-600 animate-pulse" />
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Attente d'adversaire</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {isPending ? (
                <div className="flex flex-col gap-3">
                   <div className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 ${amIRespondent ? 'bg-neon-orange/20 text-neon-orange border-neon-orange/30' : 'bg-gray-100 text-gray-400 border-gray-200'} border border-dashed`}>
                      {amIRespondent ? <><Wifi size={14} /> Défi_Envoyé_En_Attente</> : 'Signal_Occupé'}
                   </div>
                   {amIRespondent && (
                     <button onClick={() => onChat(request)} className={`w-full py-4 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 ${isPro ? 'bg-blue-50 text-blue-600' : 'bg-white/5 text-neon-cyan border border-white/10'}`}>
                        <MessageSquare size={16} /> Discuter avec le coach
                     </button>
                   )}
                </div>
              ) : (
                <button
                  onClick={() => onInterested(request.id)}
                  className={`w-full py-5 rounded-2xl font-black uppercase italic text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95
                    ${isPro ? 'bg-blue-600 text-white shadow-lg' : 'bg-neon-cyan text-black shadow-[0_0_15px_#00F0FF33]'}
                  `}
                >
                  <Zap size={18} fill="currentColor" /> Proposer Match
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
