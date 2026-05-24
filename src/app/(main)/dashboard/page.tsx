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

  // --- DATA ---
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [radarStats, setRadarStats] = useState({ match: 0, tournament: 0 });
  const [pendingResponses, setPendingResponses] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- SMART WIDGET & CHRONO ---
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(45);
  const [halvesCount, setHalvesCount] = useState(2);
  const [matchChrono, setMatchChrono] = useState('00:00');

  // ==========================================
  // FETCH DES DONNÉES (REALTIME)
  // ==========================================
  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. Radar Stats
      const { data: openReqs } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openReqs) setRadarStats({ match: openReqs.filter(r => r.type.toLowerCase().includes('match')).length, tournament: openReqs.filter(r => r.type.toLowerCase().includes('tournoi')).length });

      // 3. LOGIQUE NEXUS HUB (Les Scénarios)
      const now = new Date();

      // PRIORITÉ 1 : MATCH LIVE
      const { data: liveMatch } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();

      // PRIORITÉ 2 : DÉFI RELEVÉ
      const { data: pendingChallenge } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();

      // PRIORITÉ 3 : PROCHAINE MISSION
      const { data: futureEvents } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).neq('status', 'finished').order('date', { ascending: true }).order('time', { ascending: true }).limit(1);
      const nextEvt = futureEvents?.[0];

      let evtMode = 'IDLE';
      if (nextEvt) {
        const matchStartTime = new Date(`${nextEvt.date}T${nextEvt.time}`);
        const diff = (matchStartTime.getTime() - now.getTime()) / 60000;
        if (nextEvt.type.toLowerCase().includes('match') && diff <= 15 && diff > -90) evtMode = 'PREP';
      }

      // ATTRIBUTION
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

  // CHRONO LOGIC
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWidget?.type === 'LIVE') {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(activeWidget.data.updated_at).getTime();
        const durationMs = (activeWidget.data.half_duration_minutes || 45) * 60 * 1000;
        const end = start + durationMs;
        const remaining = end - now;
        if (remaining <= 0) { setIsOvertime(true); setTimeRemaining(Math.abs(remaining) / 1000); }
        else { setIsOvertime(false); setTimeRemaining(remaining / 1000); }
        setMatchChrono(`${Math.floor(Math.abs(remaining/1000)/60).toString().padStart(2,'0')}:${(Math.floor(Math.abs(remaining/1000)%60)).toString().padStart(2,'0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWidget]);

  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();
    const sub = supabase.channel('hub').on('postgres_changes',{event:'*',schema:'public',table:'events'},()=>fetchDashboardData()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [teamInfo?.id, fetchDashboardData]);

  // ACTIONS
  const startMatch = async (id: string) => { await supabase.from('events').update({ status: 'live', updated_at: new Date(), half_duration_minutes: selectedDuration, halves_count: halvesCount }).eq('id', id); setShowStartModal(false); fetchDashboardData(); };
  const stopMatch = async (id: string) => { await supabase.from('events').update({ status: 'finished' }).eq('id', id); fetchDashboardData(); };
  const changeScore = async (side: 'home' | 'away', amount: number) => { await supabase.from('events').update({ [`${side}_score`]: Math.max(0, activeWidget.data[`${side}_score`] + amount) }).eq('id', activeWidget.data.id); fetchDashboardData(); };

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200', text: 'text-gray-900', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', accent: 'text-neon-cyan' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan animate-pulse">Initialisation_Tactique...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center text-left">
               <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Unité_Opérationnelle</p><h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3></div>
               {activeWidget?.type === 'LIVE' && <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse"><div className="w-2 h-2 bg-white rounded-full" /><span className="text-[10px] font-black text-white uppercase">Live</span></div>}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
               <StatBox label="Amicaux" val={radarStats.match} color="text-orange-600" />
               <StatBox label="Tournois" val={radarStats.tournament} color="text-indigo-600" />
               <StatBox label="Réponses" val={pendingResponses} color="text-neon-orange" />
               <StatBox label="Effectif" val={squad.length} color="text-blue-600" />
            </div>
         </div>
      </section>

      {/* 2. LE NEXUS DECISION HUB (Super Widget) */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          { activeWidget?.type === 'LIVE' ? '⏱️ Chrono_Match_Actif' : activeWidget?.type === 'CHALLENGE' ? '🚩 Action_Radar' : '📅 Planning_Tactique' }
        </h3>

        {activeWidget?.type === 'LIVE' && (
          /* SCÉNARIO 2 : LIVE MATCH */
          <div className={`relative rounded-[3rem] overflow-hidden border-2 shadow-2xl transition-all duration-700 ${isOvertime ? 'border-red-600 animate-pulse-slow' : 'border-red-600'}`}>
             <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}><div className={`absolute inset-0 backdrop-blur-sm ${isOvertime ? 'bg-red-900/40' : 'bg-black/80'}`} /></div>
             {isOvertime && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-600/90 backdrop-blur-md animate-in fade-in duration-500 text-center p-8">
                 <AlertCircle size={48} className="text-white mb-4 animate-bounce" />
                 <h2 className="text-3xl font-black text-white uppercase italic leading-none mb-2">Temps Écoulé</h2>
                 <p className="text-white text-[10px] font-black uppercase tracking-widest mb-10 opacity-70">La mission doit être clôturée.</p>
                 {role === 'coach' && <button onClick={() => stopMatch(activeWidget.data.id)} className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase italic text-sm border-2 border-white shadow-2xl active:scale-95 transition-all">Terminer le match</button>}
               </div>
             )}
             <div className="relative z-10 p-8 text-center">
                <div className="flex justify-center items-center gap-3 mb-8 bg-black/40 rounded-full py-2 w-max mx-auto px-6 border border-white/5">
                   <Timer size={16} className={isOvertime ? 'text-red-500 animate-pulse' : 'text-white/40'} />
                   <span className={`text-2xl font-mono font-black ${isOvertime ? 'text-red-500' : 'text-white'}`}>{matchChrono}</span>
                </div>
                <div className="flex justify-between items-center mb-10">
                   <div className="w-1/3"><div className="text-5xl font-black italic text-white mb-4">{activeWidget.data.home_score}</div>{role === 'coach' && (<div className="flex justify-center gap-1.5"><button onClick={() => changeScore('home', -1)} className="p-2 bg-white/5 rounded-xl"><Minus size={12}/></button><button onClick={() => changeScore('home', 1)} className="p-2 bg-neon-orange text-black rounded-xl shadow-lg"><Plus size={12}/></button></div>)}</div>
                   <div className="w-1/4 text-[10px] font-black text-red-500 animate-pulse uppercase tracking-[0.3em]">LIVE</div>
                   <div className="w-1/3"><div className="text-5xl font-black italic text-white mb-4">{activeWidget.data.away_score}</div>{role === 'coach' && (<div className="flex justify-center gap-1.5"><button onClick={() => changeScore('away', -1)} className="p-2 bg-white/5 rounded-xl"><Minus size={12}/></button><button onClick={() => changeScore('away', 1)} className="p-2 bg-white/20 text-white rounded-xl"><Plus size={12}/></button></div>)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3"><Link href="/feed" className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] text-center">Flux Radio</Link>{role === 'coach' && <button onClick={() => stopMatch(activeWidget.data.id)} className="bg-red-600 text-white py-4 rounded-2xl font-black uppercase italic text-[10px] shadow-lg">Terminer</button>}</div>
             </div>
          </div>
        )}

        {activeWidget?.type === 'CHALLENGE' && (
          /* SCÉNARIO 3 & 4 : 4 ACTIONS DÉFI */
          <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[3rem] p-8 shadow-2xl relative animate-in slide-in-from-right duration-500 text-center">
             <button onClick={() => setDismissedId(activeWidget.data.id)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-600"><X size={20}/></button>
             <div className="flex items-center gap-4 mb-10 text-left">
                <div className="w-16 h-16 rounded-3xl border-2 border-neon-orange bg-black flex items-center justify-center overflow-hidden shrink-0 shadow-lg">{activeWidget.data.respondent?.clubs?.logo_url ? <img src={activeWidget.data.respondent.clubs.logo_url} /> : <Trophy className="text-neon-orange" size={32} />}</div>
                <div className="text-left flex-1 min-w-0"><p className="text-[10px] font-black text-neon-orange uppercase italic tracking-tighter">DÉFI RELEVÉ !</p><h4 className="text-xl font-black text-white uppercase italic leading-none mt-1 truncate">{activeWidget.data.respondent?.clubs?.name}</h4><p className="text-[9px] font-bold text-gray-500 uppercase mt-2 italic line-clamp-1">Coach {activeWidget.data.respondent?.nickname || 'Nexus'}</p></div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push('/radar')} className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[9px] active:scale-95 transition-all">Détails</button>
                <button onClick={() => router.push('/comms')} className="bg-blue-600/20 border border-blue-600/30 text-blue-400 py-4 rounded-xl font-black uppercase text-[9px] active:scale-95 transition-all">Chat</button>
                <button onClick={() => router.push('/radar')} className="col-span-2 bg-neon-cyan text-black py-4 rounded-2xl font-black uppercase text-[11px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><CheckCircle2 size={16}/> Accepter le défi</button>
                <button onClick={() => setDismissedId(activeWidget.data.id)} className="col-span-2 text-[8px] font-black text-red-500/50 uppercase tracking-widest py-3">Décliner l'intérêt</button>
             </div>
          </div>
        )}

        {activeWidget?.type === 'NEXT' && (
          /* SCÉNARIO 1 : MISSION PAR DÉFAUT */
          <div className={`relative rounded-[3rem] overflow-hidden border-2 transition-all duration-1000 ${activeWidget.mode === 'PREP' ? 'border-neon-orange animate-pulse-slow shadow-[0_0_30px_#FF6B0044]' : 'bg-white/5 border-white/10 shadow-2xl'}`}>
             {(activeWidget.mode === 'PREP' || activeWidget.data.type === 'match') && (
               <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}><div className="absolute inset-0 bg-black/80" /></div>
             )}
             <div className="relative z-10 p-8 text-left">
                <div className="flex justify-between items-start mb-10 text-left">
                   <div className={`px-4 py-1.5 rounded-lg border ${activeWidget.mode === 'PREP' ? 'bg-neon-orange text-black font-black' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                      {activeWidget.mode === 'PREP' ? 'DÉMARRAGE IMMINENT' : new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                   </div>
                   <Zap size={20} className={activeWidget.mode === 'PREP' ? 'text-neon-orange' : 'text-neon-cyan'} fill="currentColor" />
                </div>
                <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3 text-left">{activeWidget.data.title}</h4>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10 text-left"><Landmark size={14} className="inline mr-2 text-neon-cyan" /> {activeWidget.data.location || 'Terrain Nexus'}</p>
                <div className="grid grid-cols-2 gap-3">
                   <Link href="/events" className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] text-center active:scale-95 transition-all text-center">Agenda</Link>
                   {role === 'coach' && activeWidget.data.type === 'match' && <button onClick={() => setShowStartModal(true)} className="bg-neon-cyan text-black py-4 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Démarrer <Play size={12} fill="currentColor" /></button>}
                </div>
             </div>
          </div>
        )}

        {!activeWidget && (
          /* AUCUNE MISSION */
          <Link href="/events/new" className="block p-16 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 active:scale-[0.98] transition-all group text-center">
             <Shield size={32} className="mx-auto mb-3 group-hover:scale-110 transition-transform" />
             <p className="text-[11px] font-black uppercase tracking-widest text-center w-full">Initialiser_Nouvelle_Mission...</p>
          </Link>
        )}
      </section>

      <ActionCenter isPro={isPro} onAction={(type) => { setActionType(type); setIsActionModalOpen(true); }} />
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={(id) => setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])} isPro={isPro} />

      {/* MODALE DÉMARRAGE MATCH */}
      {showStartModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300 text-center">
           <div className="bg-[#111] border-2 border-neon-cyan rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl shadow-neon-cyan/20">
              <Play size={48} className="text-neon-cyan mx-auto mb-8 animate-pulse" fill="currentColor" />
              <h3 className="text-2xl font-black text-white uppercase italic mb-10">Initialisation_Mission</h3>
              <div className="space-y-8 mb-12 text-left">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">Durée Mi-temps (minutes)</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-4 justify-between">
                     <button onClick={() => setSelectedDuration(d => Math.max(5, d - 5))} className="p-2 text-white active:scale-90 transition-transform"><Minus size={24}/></button>
                     <span className="text-4xl font-black text-white italic">{selectedDuration}</span>
                     <button onClick={() => setSelectedDuration(d => d + 5)} className="p-2 text-white active:scale-90 transition-transform"><Plus size={24}/></button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">Nombre de Mi-temps</label>
                  <div className="flex gap-3">
                     {[1,2].map(n => <button key={n} onClick={() => setHalvesCount(n)} className={`flex-1 py-4 rounded-xl border-2 font-black transition-all ${halvesCount === n ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan' : 'border-white/5 text-gray-600'}`}>{n}</button>)}
                  </div>
                </div>
              </div>
              <button onClick={() => startMatch(activeWidget.data.id)} className="w-full bg-neon-cyan text-black py-5 rounded-2xl font-black uppercase italic text-sm shadow-[0_0_30px_rgba(0,240,255,0.4)] active:scale-95 transition-all mb-4 text-center">ACTIVER_NEXUS_CHRONO</button>
              <button onClick={() => setShowStartModal(false)} className="text-gray-500 text-[10px] uppercase font-black tracking-widest hover:text-white text-center w-full py-2">Annuler</button>
           </div>
        </div>
      )}

      <ActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }} selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} onSend={() => setIsActionModalOpen(false)} actionType={actionType} />
    </div>
  );
}

function StatBox({ label, val, color }: { label: string, val: number, color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-center">
       <p className={`text-lg font-black ${color} leading-none mb-1 text-center`}>{val}</p>
       <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter text-center">{label}</p>
    </div>
  );
}
