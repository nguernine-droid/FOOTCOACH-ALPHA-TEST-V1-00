'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Play, Pause, Check, Landmark, Clock, Plus, Minus, Timer, AlertCircle, ListOrdered, Settings2, Target
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
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- ÉTATS DU MATCH LIVE ---
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [matchChrono, setMatchChrono] = useState(0); // en secondes
  const [isPaused, setIsPaused] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showGameAction, setShowGameAction] = useState(false);

  // Configuration
  const [halvesCount, setHalvesCount] = useState(2);
  const [halfDuration, setHalfDuration] = useState(20);
  const [currentHalf, setCurrentHalf] = useState(1);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. LOGIQUE DECISION HUB
      const now = new Date();
      const { data: liveEvent } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();

      const { data: futureEvents } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).neq('status', 'finished').order('date', { ascending: true }).order('time', { ascending: true }).limit(1);
      const nextEvt = futureEvents?.[0];

      if (liveEvent) {
        setActiveWidget({ type: 'LIVE', data: liveEvent });
      } else if (nextEvt) {
        const matchStartTime = new Date(`${nextEvt.date}T${nextEvt.time}`);
        const diff = (matchStartTime.getTime() - now.getTime()) / 60000;

        if (diff <= 5 && diff > -120) {
           setActiveWidget({ type: 'BATTLE_READY', data: nextEvt });
        } else {
           setActiveWidget({ type: 'NEXT', data: nextEvt });
        }
      } else {
        setActiveWidget(null);
      }
    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id]);

  // --- LOGIQUE DU CHRONOMÈTRE ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused && activeWidget?.type === 'LIVE') {
      interval = setInterval(() => {
        setMatchChrono(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, activeWidget]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // --- ACTIONS TACTIQUES ---
  const handleStartMatch = async () => {
    await supabase.from('events').update({
      status: 'live',
      updated_at: new Date(),
      halves_count: halvesCount,
      half_duration_minutes: halfDuration
    }).eq('id', activeWidget.data.id);
    setIsPaused(false);
    fetchDashboardData();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleEndHalf = () => {
    if (currentHalf < halvesCount) {
      setCurrentHalf(prev => prev + 1);
      setMatchChrono(0);
      setIsPaused(true);
    } else {
      stopMission();
    }
  };

  const stopMission = async () => {
    await supabase.from('events').update({ status: 'finished' }).eq('id', activeWidget.data.id);
    setActiveWidget(null);
    fetchDashboardData();
  };

  const changeScore = async (side: 'home' | 'away', amount: number) => {
    const current = side === 'home' ? activeWidget.data.home_score : activeWidget.data.away_score;
    await supabase.from('events').update({ [`${side}_score`]: Math.max(0, current + amount) }).eq('id', activeWidget.data.id);
    fetchDashboardData();
  };

  // --- CALCUL DES COULEURS ---
  const getMatchBg = () => {
    if (isPaused) return 'border-[#39FF14] bg-[#39FF14]/5'; // Vert (Pause)
    const elapsedMins = matchChrono / 60;
    if (elapsedMins >= halfDuration) return 'border-red-600 bg-red-600/10 animate-pulse'; // Rouge (Overtime)
    if (elapsedMins >= halfDuration - 2) return 'border-orange-500 bg-orange-500/10 animate-pulse-slow'; // Orange (Fin proche)
    return 'border-neon-cyan bg-black'; // Bleu (En cours)
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm', text: 'text-gray-900', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', accent: 'text-neon-cyan' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan opacity-40 text-center">Initialisation_Protocoles...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 2. NEXUS DECISION HUB */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          { activeWidget?.type === 'LIVE' ? `⏱️ Mi-temps ${currentHalf}/${halvesCount}` : activeWidget?.type === 'BATTLE_READY' ? '🚨 Alerte_Combat' : '📅 Planning_Tactique' }
        </h3>

        {activeWidget?.type === 'LIVE' ? (
          /* --- MODE MATCH LIVE (Le coeur du CDC) --- */
          <div className={`relative rounded-[3rem] overflow-hidden border-4 transition-all duration-700 ${getMatchBg()} shadow-2xl`}>
             <div className="p-8 text-center relative z-10">

                {/* CHRONO GÉANT */}
                <div className="flex flex-col items-center mb-10">
                   <div className={`text-6xl font-mono font-black italic tracking-tighter ${isPaused ? 'text-[#39FF14]' : 'text-white'}`}>
                      {Math.floor(matchChrono/60).toString().padStart(2,'0')}:{(matchChrono%60).toString().padStart(2,'0')}
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 opacity-40">Temps_Écoulé</p>
                </div>

                {/* SCORE & ACTIONS */}
                <div className="flex justify-between items-center mb-10">
                   <div className="w-1/3 text-center">
                      <div className="text-5xl font-black italic text-white mb-4">{activeWidget.data.home_score}</div>
                      <div className="flex justify-center gap-2">
                         <button onClick={() => changeScore('home', -1)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white"><Minus size={14}/></button>
                         <button onClick={() => changeScore('home', 1)} className="p-2 bg-neon-orange text-black rounded-xl shadow-lg shadow-neon-orange/20"><Plus size={14}/></button>
                      </div>
                   </div>
                   <div className="w-1/4 flex flex-col items-center gap-4">
                      <button onClick={togglePause} className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isPaused ? 'bg-[#39FF14] border-[#39FF14] text-black shadow-[0_0_20px_#39FF14]' : 'bg-transparent border-white/20 text-white'}`}>
                         {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                      </button>
                      <button onClick={() => setShowGameAction(true)} className="p-2 bg-white/5 rounded-full border border-white/10 text-gray-500 animate-pulse"><Zap size={14} /></button>
                   </div>
                   <div className="w-1/3 text-center">
                      <div className="text-5xl font-black italic text-white mb-4">{activeWidget.data.away_score}</div>
                      <div className="flex justify-center gap-2">
                         <button onClick={() => changeScore('away', -1)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white"><Minus size={14}/></button>
                         <button onClick={() => changeScore('away', 1)} className="p-2 bg-white/20 text-white rounded-xl"><Plus size={14}/></button>
                      </div>
                   </div>
                </div>

                {/* BOUTONS DE FIN */}
                <div className="space-y-3">
                   <button
                     onClick={handleEndHalf}
                     className={`w-full py-5 rounded-2xl font-black uppercase italic text-sm transition-all shadow-xl ${isPaused ? 'bg-[#39FF14] text-black' : 'bg-white/10 text-white border border-white/10'}`}
                   >
                     {currentHalf < halvesCount ? 'Clôturer Mi-temps' : 'Terminer le match'}
                   </button>
                   <button onClick={() => stopMission()} className="text-[10px] font-black text-red-500 uppercase tracking-widest opacity-40 py-2">Abandonner la mission</button>
                </div>
             </div>

             {/* MODALE FAIT DE JEU (Flash) */}
             {showGameAction && (
               <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-8 flex flex-col justify-center">
                  <div className="text-center mb-8">
                     <Target className="text-neon-cyan mx-auto mb-4" size={40} />
                     <h3 className="text-xl font-black uppercase italic text-white">Action_de_Jeu</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setShowGameAction(false)} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-3">
                        <Trophy size={20} className="text-neon-orange" />
                        <span className="text-[9px] font-black uppercase">Buteur</span>
                     </button>
                     <button onClick={() => setShowGameAction(false)} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-3">
                        <Zap size={20} className="text-neon-cyan" />
                        <span className="text-[9px] font-black uppercase">Passeur</span>
                     </button>
                  </div>
                  <button onClick={() => setShowGameAction(false)} className="mt-10 text-[10px] font-black text-gray-500 uppercase">Annuler</button>
               </div>
             )}
          </div>
        ) : activeWidget?.type === 'BATTLE_READY' ? (
          /* --- H-5 : PRÉPARATION DE COMBAT --- */
          <div className="bg-[#050505] border-4 border-neon-cyan rounded-[3rem] p-10 shadow-[0_0_50px_rgba(0,240,255,0.2)] text-center animate-in zoom-in duration-500">
             <Shield className="text-neon-cyan mx-auto mb-6 animate-pulse" size={48} />
             <h2 className="text-3xl font-black text-white uppercase italic leading-none mb-3">Mission_Imminente</h2>
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-10">L'unité adverse est détectée. Configurez la durée.</p>

             <div className="space-y-6 mb-10 text-left">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Mi-temps</span>
                      <div className="flex gap-2">
                         {[1,2].map(n => <button key={n} onClick={() => setHalvesCount(n)} className={`w-10 h-10 rounded-lg font-black border-2 transition-all ${halvesCount === n ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan' : 'border-white/5 text-gray-600'}`}>{n}</button>)}
                      </div>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Durée (min)</span>
                      <div className="flex items-center gap-4">
                         <button onClick={() => setHalfDuration(d => Math.max(5, d-5))} className="text-white p-1"><Minus size={16}/></button>
                         <span className="text-2xl font-black text-white italic w-8 text-center">{halfDuration}</span>
                         <button onClick={() => setHalfDuration(d => d+5)} className="text-white p-1"><Plus size={16}/></button>
                      </div>
                   </div>
                </div>
             </div>

             <button onClick={handleStartMatch} className="w-full py-6 bg-neon-cyan text-black rounded-[2rem] font-black uppercase italic text-sm shadow-xl active:scale-95 transition-all">ACTIVER_CHRONO_NEXUS</button>
          </div>
        ) : activeWidget?.type === 'NEXT' ? (
          /* --- AGENDA CLASSIQUE --- */
          <div className={`${styles.cardBg} border-2 p-8 rounded-[3rem] relative overflow-hidden group text-left shadow-2xl`}>
             <div className="flex justify-between items-start mb-8">
                <div className={`px-4 py-1.5 rounded-lg border ${activeWidget.mode === 'PREP' ? 'bg-neon-orange text-black border-neon-orange animate-pulse' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                   {activeWidget.mode === 'PREP' ? 'PRÉPARATION_MISSION' : new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                </div>
                <Zap size={20} className={activeWidget.mode === 'PREP' ? 'text-neon-orange' : 'text-neon-cyan'} fill="currentColor" />
             </div>
             <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3">{activeWidget.data.title}</h4>
             <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10"><Landmark size={14} className="inline mr-2 text-neon-cyan" /> {activeWidget.data.location || 'Base_Unité'}</p>
             <div className="grid grid-cols-2 gap-3">
                <Link href="/events" className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] text-center active:scale-95 transition-all flex items-center justify-center gap-2 text-center">Agenda</Link>
                {role === 'coach' && <button onClick={() => setShowConfig(true)} className="bg-neon-cyan text-black py-4 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 font-black">Démarrer <Play size={12} fill="currentColor" /></button>}
             </div>
          </div>
        ) : (
          /* VIDE */
          <Link href="/events/new" className="block p-16 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 active:scale-[0.98] transition-all group">
             <Shield size={32} className="mx-auto mb-3 group-hover:scale-110 transition-transform" />
             <p className="text-[11px] font-black uppercase tracking-widest text-center w-full">Initialiser_Nouvelle_Mission...</p>
          </Link>
        )}
      </section>

      <ActionCenter isPro={isPro} onAction={() => {}} />
      <SquadOverview players={squad} selectedIds={[]} onSelect={() => {}} isPro={isPro} />
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
