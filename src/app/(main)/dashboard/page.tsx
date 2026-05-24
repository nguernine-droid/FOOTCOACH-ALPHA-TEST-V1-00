'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Play, Pause, Check, Landmark, Clock, Plus, Minus, Timer, AlertCircle
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ActionModal } from '@/components/ui/ActionModal';
import { SquadOverview, SquadPlayer } from './components/dashboard/SquadOverview';
import { ActionCenter, ActionType } from './components/dashboard/ActionCenter';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const { teamInfo, role, theme, isLoading: isContextLoading } = useTeam();
  const isPro = theme === 'classic';

  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [radarStats, setRadarStats] = useState({ match: 0, tournament: 0 });
  const [pendingResponses, setPendingResponses] = useState(0);

  // DECISION HUB & CHRONO
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // LIVE CHRONO STATE
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(45);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. Radar
      const { data: openReqs } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openReqs) setRadarStats({ match: openReqs.filter(r => r.type === 'match').length, tournament: openReqs.filter(r => r.type === 'tournament').length });

      // 3. PRIORITÉS
      const now = new Date();
      const { data: liveMatch } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();
      const { data: pendingChallenge } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
      const { data: futureEvents } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).gte('date', now.toISOString().split('T')[0]).neq('status', 'finished').order('date', { ascending: true }).order('time', { ascending: true }).limit(1);
      const nextEvt = futureEvents?.[0];

      let evtMode = 'IDLE';
      if (nextEvt && nextEvt.type === 'Match') {
        const matchStartTime = new Date(`${nextEvt.date}T${nextEvt.time}`);
        const diff = (matchStartTime.getTime() - now.getTime()) / 60000;
        if (diff <= 15 && diff > 0) evtMode = 'PREP';
      }

      if (liveMatch) {
        setActiveWidget({ type: 'LIVE', data: liveMatch });
      } else if (pendingChallenge && dismissedId !== pendingChallenge.id) {
        setActiveWidget({ type: 'CHALLENGE', data: pendingChallenge });
      } else if (nextEvt) {
        setActiveWidget({ type: 'NEXT', data: nextEvt, mode: evtMode });
      } else {
        setActiveWidget(null);
      }

      setPendingResponses(pendingChallenge ? 1 : 0);
    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, dismissedId]);

  // CHRONOMÈTRE LOGIQUE (SCÉNARIO 2)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWidget?.type === 'LIVE') {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(activeWidget.data.updated_at).getTime();
        const durationMs = (activeWidget.data.half_duration_minutes || 45) * 60 * 1000;
        const end = start + durationMs;
        const remaining = end - now;

        if (remaining <= 0) {
          setIsOvertime(true);
          setTimeRemaining(Math.abs(remaining) / 1000);
        } else {
          setIsOvertime(false);
          setTimeRemaining(remaining / 1000);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWidget]);

  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();
    const pulse = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(pulse);
  }, [teamInfo?.id, fetchDashboardData]);

  // ACTIONS
  const confirmStartMatch = async (duration: number) => {
    await supabase.from('events').update({ status: 'live', updated_at: new Date(), half_duration_minutes: duration }).eq('id', activeWidget.data.id);
    setShowStartModal(false);
    fetchDashboardData();
  };

  const stopMatch = async (id: string) => { await supabase.from('events').update({ status: 'finished' }).eq('id', id); fetchDashboardData(); };

  const changeScore = async (side: 'home' | 'away', amount: number) => {
    const current = side === 'home' ? activeWidget.data.home_score : activeWidget.data.away_score;
    await supabase.from('events').update({ [`${side}_score`]: Math.max(0, current + amount) }).eq('id', activeWidget.data.id);
    fetchDashboardData();
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200', text: 'text-gray-900', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', accent: 'text-neon-cyan' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-neon-cyan">Initialisation_Tactique...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center text-left">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Unité_Opérationnelle</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3>
               </div>
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${activeWidget?.type === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-[#39FF14]'}`} />
                 <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Online</span>
               </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
               <StatBox label="Amicaux" val={radarStats.match} color="text-orange-600" />
               <StatBox label="Tournois" val={radarStats.tournament} color="text-indigo-600" />
               <StatBox label="Réponses" val={pendingResponses} color="text-neon-orange" />
               <StatBox label="Effectif" val={squad.length} color="text-blue-600" />
            </div>
         </div>
      </section>

      {/* 2. LE NEXUS DECISION HUB (Super-Widget Interactif) */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          { activeWidget?.type === 'LIVE' ? '⏱️ Match_Center_Live' : activeWidget?.type === 'CHALLENGE' ? '🚩 Action_Radar' : '📅 Planning_Tactique' }
        </h3>

        {activeWidget?.type === 'LIVE' && (
          /* SCÉNARIO 2 : MATCH EN DIRECT (CHRONO + OVERTIME) */
          <div className={`relative rounded-[3rem] overflow-hidden border-2 shadow-2xl transition-all duration-700 ${isOvertime ? 'border-red-600 animate-pulse-slow' : 'border-red-600'}`}>
             <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}><div className={`absolute inset-0 backdrop-blur-sm ${isOvertime ? 'bg-red-900/40' : 'bg-black/80'}`} /></div>

             {isOvertime && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-600/80 backdrop-blur-md animate-in fade-in duration-500 text-center p-6">
                 <AlertCircle size={48} className="text-white mb-4 animate-bounce" />
                 <h2 className="text-3xl font-black text-white uppercase italic leading-none mb-2">Temps Écoulé</h2>
                 <p className="text-white text-xs font-bold uppercase tracking-widest mb-8 opacity-80">La mission doit être clôturée.</p>
                 {role === 'coach' && <button onClick={() => stopMatch(activeWidget.data.id)} className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase italic text-sm shadow-2xl border-2 border-white">Déclarer la fin</button>}
               </div>
             )}

             <div className="relative z-10 p-8 text-center">
                <div className="flex justify-center items-center gap-3 mb-6">
                   <Timer size={16} className={isOvertime ? 'text-red-500' : 'text-white/40'} />
                   <span className={`text-3xl font-mono font-black ${isOvertime ? 'text-red-500' : 'text-white'}`}>
                     {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toFixed(0).padStart(2, '0')}
                   </span>
                </div>
                <div className="flex justify-between items-center mb-10">
                   <div className="w-1/3">
                      <div className="text-5xl font-black italic text-white mb-3">{activeWidget.data.home_score}</div>
                      <div className="flex justify-center gap-1 opacity-60">
                         <button onClick={() => changeScore('home', -1)} className="p-1 bg-white/10 rounded-lg"><Minus size={10}/></button>
                         <button onClick={() => changeScore('home', 1)} className="p-1 bg-white/20 rounded-lg"><Plus size={10}/></button>
                      </div>
                   </div>
                   <div className="w-1/4 text-[10px] font-black text-red-500 animate-pulse uppercase tracking-[0.3em]">LIVE</div>
                   <div className="w-1/3">
                      <div className="text-5xl font-black italic text-white mb-3">{activeWidget.data.away_score}</div>
                      <div className="flex justify-center gap-1 opacity-60">
                         <button onClick={() => changeScore('away', -1)} className="p-1 bg-white/10 rounded-lg"><Minus size={10}/></button>
                         <button onClick={() => changeScore('away', 1)} className="p-1 bg-white/20 rounded-lg"><Plus size={10}/></button>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <Link href="/feed" className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] text-center italic">Flux Radio</Link>
                   {role === 'coach' && <button onClick={() => stopMatch(activeWidget.data.id)} className="bg-red-600 text-white py-4 rounded-xl font-black uppercase italic text-[10px] shadow-lg">Terminer</button>}
                </div>
             </div>
          </div>
        )}

        {activeWidget?.type === 'CHALLENGE' && (
          /* SCÉNARIO 3 & 4 : DÉFI / INTÉRÊT RELEVÉ (4 ACTIONS) */
          <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[3rem] p-6 shadow-2xl relative animate-in slide-in-from-right duration-500 text-center">
             <button onClick={() => setDismissedId(activeWidget.data.id)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-600"><X size={20}/></button>
             <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-3xl border-2 border-neon-orange bg-black flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                   {activeWidget.data.respondent?.clubs?.logo_url ? <img src={activeWidget.data.respondent.clubs.logo_url} /> : <Trophy className="text-neon-orange" size={32} />}
                </div>
                <div className="text-left flex-1 min-w-0">
                   <p className="text-[10px] font-black text-neon-orange uppercase italic tracking-tighter">Défi Relevé !</p>
                   <h4 className="text-lg font-black text-white uppercase italic leading-none mt-1 truncate">{activeWidget.data.respondent?.clubs?.name}</h4>
                   <p className="text-[9px] font-bold text-gray-500 uppercase mt-2 italic line-clamp-1">Coach {activeWidget.data.respondent?.nickname || 'Nexus'}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDismissedId(activeWidget.data.id)} className="bg-white/5 border border-white/10 text-gray-400 py-3 rounded-xl font-bold uppercase text-[9px] flex flex-col items-center gap-1">Passer</button>
                <button onClick={() => router.push('/comms')} className="bg-blue-600/10 border border-blue-600/30 text-blue-500 py-3 rounded-xl font-bold uppercase text-[9px] flex flex-col items-center gap-1">Chat</button>
                <button onClick={() => router.push('/radar')} className="col-span-2 bg-neon-cyan text-black py-4 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><CheckCircle2 size={16}/> Accepter le défi</button>
                <button onClick={() => setDismissedId(activeWidget.data.id)} className="col-span-2 text-[8px] font-black text-red-500/50 uppercase tracking-widest py-2">Décliner l'intérêt</button>
             </div>
          </div>
        )}

        {activeWidget?.type === 'NEXT' && (
          /* SCÉNARIO 1 : AGENDA PAR DÉFAUT / PREP T-15MN */
          <div className={`relative rounded-[3rem] overflow-hidden border-2 transition-all duration-1000 ${activeWidget.mode === 'PREP' ? 'border-neon-orange animate-pulse-slow shadow-[0_0_30px_#FF6B0033]' : 'bg-white/5 border-white/10'}`}>
             {(activeWidget.mode === 'PREP' || activeWidget.data.type === 'Match') && (
               <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}><div className="absolute inset-0 bg-black/60" /></div>
             )}
             <div className="relative z-10 p-8 text-left">
                <div className="flex justify-between items-start mb-8">
                   <div className={`px-4 py-1.5 rounded-lg border ${activeWidget.mode === 'PREP' ? 'bg-neon-orange text-black font-black' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                      {activeWidget.mode === 'PREP' ? 'PRÉPARATION_MATCH' : new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                   </div>
                </div>
                <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3">{activeWidget.data.title}</h4>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10"><Landmark size={14} className="inline mr-2 text-neon-cyan" /> {activeWidget.data.location || 'Terrain Nexus'}</p>
                <div className="grid grid-cols-2 gap-3">
                   <Link href="/events" className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] text-center active:scale-95 transition-all">Agenda</Link>
                   {role === 'coach' && <button onClick={() => setShowStartModal(true)} className="bg-neon-cyan text-black py-4 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Démarrer <Play size={12} fill="currentColor" /></button>}
                </div>
             </div>
          </div>
        )}
      </section>

      <ActionCenter isPro={isPro} onAction={(type) => { setActionType(type); setIsActionModalOpen(true); }} />
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={handleSelectPlayer} isPro={isPro} />

      {/* MODALE DE DÉMARRAGE (Scénario 2) */}
      {showStartModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-[#111] border-2 border-neon-cyan rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl">
              <Play size={48} className="text-neon-cyan mx-auto mb-6 animate-pulse" fill="currentColor" />
              <h3 className="text-2xl font-black text-white uppercase italic mb-8">Démarrage_Mission</h3>
              <div className="space-y-6 mb-10">
                 <div className="text-left">
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block">Durée Mi-temps (minutes)</label>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-3 justify-between">
                       <button onClick={() => setSelectedDuration(d => Math.max(5, d - 5))} className="p-2 text-white active:scale-90 transition-transform"><Minus size={20}/></button>
                       <span className="text-3xl font-black text-white w-16 text-center italic">{selectedDuration}</span>
                       <button onClick={() => setSelectedDuration(d => d + 5)} className="p-2 text-white active:scale-90 transition-transform"><Plus size={20}/></button>
                    </div>
                 </div>
              </div>
              <button onClick={() => confirmStartMatch(selectedDuration)} className="w-full bg-neon-cyan text-black py-5 rounded-2xl font-black uppercase italic text-sm shadow-[0_0_30px_rgba(0,240,255,0.4)] active:scale-95 transition-all mb-4">Lancer le chrono</button>
              <button onClick={() => setShowStartModal(false)} className="text-gray-500 text-[10px] uppercase font-black tracking-widest hover:text-white">Abandonner</button>
           </div>
        </div>
      )}

      <ActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }} selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} onSend={() => setIsActionModalOpen(false)} actionType={actionType} />
    </div>
  );
}

function StatBox({ label, val, color }: { label: string, val: number, color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
       <p className={`text-lg font-black ${color} leading-none mb-1`}>{val}</p>
       <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">{label}</p>
    </div>
  );
}
