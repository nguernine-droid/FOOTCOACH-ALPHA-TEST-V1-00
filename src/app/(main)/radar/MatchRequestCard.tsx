'use client';

import React from 'react';
import {
  Shield, Zap, MessageSquare, Clock, MapPin,
  CheckCircle2, XCircle, Wifi, Trophy, Layers, Trash2, Edit3, Eye, BarChart3
} from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { MatchRequest } from './page';

interface MatchRequestCardProps {
  request: MatchRequest;
  isPro: boolean;
  currentCoachId: string;
  canInteract?: boolean;
  onInterested: (id: string) => void;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  onChat: (request: MatchRequest) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

/**
 * MATCH_REQUEST_CARD (v28.0 - SWIPE ACTIONS)
 * Slide gauche: Supprimer | Slide droite: Modifier
 */
export function MatchRequestCard({
  request, isPro, currentCoachId, canInteract = true,
  onInterested, onAccept, onRefuse, onChat, onDelete, onEdit
}: MatchRequestCardProps) {

  const isMine = request.coachId === currentCoachId;
  const isPending = request.status === 'PENDING';
  const isMatched = request.status === 'MATCHED';
  const amIRespondent = request.respondentId === currentCoachId;

  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ["#ef4444", "#ffffff", "#f97316"] // Rouge pour delete, Orange pour edit
  );

  const typeThemes = {
    'Match Amical': { border: 'border-[#16a34a]', accent: 'text-[#16a34a]', bg: 'bg-[#16a34a]/10', icon: <Zap size={14}/> },
    'Plateau': { border: 'border-blue-600', accent: 'text-blue-500', bg: 'bg-blue-600/10', icon: <Layers size={14}/> },
    'Tournoi': { border: 'border-red-600', accent: 'text-red-500', bg: 'bg-red-600/10', icon: <Trophy size={14}/> }
  };

  const t = typeThemes[request.type as keyof typeof typeThemes] || typeThemes['Match Amical'];

  const handleDragEnd = (event: any, info: any) => {
    if (!isMine) return;
    if (info.offset.x < -100) onDelete?.(request.id);
    if (info.offset.x > 100) onEdit?.(request.id);
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] mb-4">
      {/* BACKGROUND ACTIONS */}
      {isMine && (
        <motion.div
          style={{ background }}
          className="absolute inset-0 flex items-center justify-between px-10 text-white"
        >
          <div className="flex flex-col items-center gap-1">
            <Edit3 size={24} />
            <span className="text-[8px] font-black uppercase">Modifier</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Trash2 size={24} />
            <span className="text-[8px] font-black uppercase">Supprimer</span>
          </div>
        </motion.div>
      )}

      {/* CARD CONTENT */}
      <motion.div
        drag={isMine ? "x" : false}
        dragConstraints={{ left: isMine ? -120 : 0, right: isMine ? 120 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`w-full bg-white rounded-[2.5rem] border-[3px] ${t.border} overflow-hidden relative shadow-lg z-10`}
      >
        {/* Badge SOS */}
        {request.isSos && (
          <div className="bg-red-600 px-5 py-2 flex items-center gap-2">
            <span className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
              🚨 SOS — Match urgent ! Répondez pour gagner des XP
            </span>
          </div>
        )}

        <div className="flex justify-between items-center p-5 pb-3 border-b border-gray-100 bg-white">
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

        <div className="p-6 space-y-4 bg-white">
           <div className="flex items-end justify-between gap-4">
              <div className="text-left">
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                   {isPro ? 'Coach Responsable' : 'Commandant'}
                 </p>
                 <h2 className="text-xl font-black uppercase italic text-gray-900 tracking-tighter">{request.coachName}</h2>
                 <div className="flex items-center gap-2 mt-1">
                   {request.coachGrade && (
                     <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                       🏅 {request.coachGrade}
                     </span>
                   )}
                   {request.coachLevel && (
                     <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                       ⚡ {request.coachLevel}
                     </span>
                   )}
                 </div>
              </div>
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-900 italic">
                    <Clock size={12} className={t.accent} />
                    {request.date
                      ? `${new Date(request.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • ${request.time?.slice(0,5) || ''}`
                      : `📅 ${(request as any).availabilityWindow || 'Flexible'}`
                    }
                 </div>
              </div>
           </div>

           <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center ${t.accent}`}><MapPin size={18} /></div>
                 <div className="text-left">
                    <p className="text-[10px] font-black text-gray-900 uppercase italic leading-none">{request.location}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 truncate max-w-[150px]">{request.stadium || "Arène à définir"}</p>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                 <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest italic">
                   {request.distanceKm ? `${request.distanceKm.toFixed(0)} KM` : 'PROCHE'}
                 </span>
                 {isMine && <span className="text-[7px] font-black text-gray-400 uppercase animate-pulse">Slide pour éditer</span>}
              </div>
           </div>

           {request.comment && (
              <p className="text-[10px] italic text-gray-500 px-1 border-l-2 border-gray-200 py-1">"{request.comment}"</p>
           )}

           {/* BARRE DE STATS DE MISSION (Vvues / Réponses / Statut) */}
           <div className="pt-2 flex items-center justify-between border-t border-gray-50">
              <div className="flex gap-4">
                 <div className="flex items-center gap-1.5 opacity-40">
                    <Eye size={12} className="text-gray-400" />
                    <span className="text-[9px] font-black uppercase tracking-tighter text-gray-900">{request.viewsCount || 0} VUES</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <MessageSquare size={12} className={request.responsesCount && request.responsesCount > 0 ? "text-orange-500" : "text-gray-300"} />
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${request.responsesCount && request.responsesCount > 0 ? "text-orange-600" : "text-gray-300"}`}>
                       {request.responsesCount || 0} RÉPONSES
                    </span>
                 </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-100">
                 <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${request.status === 'OPEN' ? 'bg-emerald-400' : 'bg-orange-500'}`} />
                 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{request.status}</span>
              </div>
           </div>
        </div>

        <div className="px-5 pb-5 bg-white">
           {isMatched ? (
              <div className="w-full bg-[#16a34a] text-white py-4 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-3 shadow-lg">
                 <CheckCircle2 size={18} /> MATCH_VALIDÉ
                 <button onClick={(e) => { e.stopPropagation(); onChat(request); }} className="ml-4 p-2 bg-white/20 rounded-lg active:scale-90 transition-all"><MessageSquare size={16}/></button>
              </div>
           ) : isMine ? (
              <div className="w-full bg-gray-100 py-4 rounded-2xl text-center">
                 {isPending ? (
                   <div className="flex items-center justify-between px-6">
                      <p className="text-[9px] font-black text-orange-600 uppercase animate-pulse">⚡ Réponse reçue !</p>
                      <div className="flex gap-2">
                         <button onClick={(e) => { e.stopPropagation(); onChat(request); }} className="p-2 bg-white rounded-lg text-blue-600 shadow-sm border border-blue-100"><MessageSquare size={16}/></button>
                         <button onClick={(e) => { e.stopPropagation(); onRefuse(request.id); }} className="p-2 bg-red-500 text-white rounded-lg shadow-sm"><XCircle size={16}/></button>
                         <button onClick={(e) => { e.stopPropagation(); onAccept(request.id); }} className="p-2 bg-[#16a34a] text-white rounded-lg shadow-sm"><CheckCircle2 size={16}/></button>
                      </div>
                   </div>
                 ) : (
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2 animate-pulse"><Wifi size={12}/> Signal_En_Émission...</p>
                 )}
              </div>
           ) : !canInteract ? (
              <div className="w-full py-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center gap-2">
                <span className="text-[9px] font-black uppercase text-orange-400 tracking-widest">
                  ⚠️ Complétez votre profil club pour répondre
                </span>
              </div>
           ) : isPending ? (
              /* Réponse reçue — en attente Coach A */
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onChat(request); }}
                  className="flex-1 py-4 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare size={16}/> {isPro ? 'Plus d\'info' : 'Négocier'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onInterested(request.id); }}
                  className="flex-1 py-4 rounded-2xl bg-orange-600 text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                >
                  <Zap size={16} fill="currentColor"/>
                  {isPro ? 'Intéressé' : 'Relever le défi'}
                </button>
              </div>
           ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onInterested(request.id); }}
                className="w-full py-5 rounded-2xl bg-orange-600 text-white font-black uppercase italic text-xs transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
              >
                <Zap size={18} fill="currentColor"/>
                {isPro ? 'Proposer un match' : 'Relever le défi'}
              </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}
