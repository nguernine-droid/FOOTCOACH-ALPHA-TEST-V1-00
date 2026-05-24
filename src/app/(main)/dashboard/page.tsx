'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Play, Pause, Check, Landmark, Clock, Plus, Minus, Timer, AlertCircle, Target, Brain, Flame, Layout
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

  // --- ÉTATS DU HUB ---
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // MATCH CONFIG & LIVE
  const [matchChrono, setMatchChrono] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [currentHalf, setCurrentHalf] = useState(1);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      const now = new Date();
      const { data: liveEvent } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();
      const { data: pendingChallenge } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
      const { data: futureEvents } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').neq('status', 'finished').order('date', { ascending: true }).order('time', { ascending: true }).limit(1);
      const nextEvt = futureEvents?.[0];

      if (liveEvent) {
        setActiveWidget({ type: 'LIVE', data: liveEvent });
      } else if (pendingChallenge && dismissedId !== pendingChallenge.id) {
        setActiveWidget({ type: 'CHALLENGE', data: pendingChallenge });
      } else if (nextEvt) {
        setActiveWidget({ type: 'NEXT', data: nextEvt });
      } else {
        setActiveWidget(null);
      }
    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, dismissedId]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // --- LOGIQUE VISUELLE PAR TYPE ---
  const getMissionConfig = (evtType: string) => {
    const type = evtType?.toLowerCase() || '';
    if (type.includes('match') && activeWidget?.data?.tournament_config?.is_official)
      return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'OFFICIEL' };
    if (type.includes('match'))
      return { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', label: 'AMICAL' };
    if (type.includes('plateau'))
      return { color: 'text-purple-500', bg: 'bg-purple-500', label: 'PLATEAU' };
    return { color: 'text-sky-500', bg: 'bg-sky-500', label: 'ENTRAÎNEMENT' };
  };

  const stopMission = async () => {
    await supabase.from('events').update({ status: 'finished' }).eq('id', activeWidget.data.id);
    fetchDashboardData();
  };

  const changeScore = async (side: 'home' | 'away', amount: number) => {
    const current = side === 'home' ? activeWidget.data.home_score : activeWidget.data.away_score;
    await supabase.from('events').update({ [`${side}_score`]: Math.max(0, current + amount) }).eq('id', activeWidget.data.id);
    fetchDashboardData();
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm', text: 'text-gray-900', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', accent: 'text-neon-cyan' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan opacity-40 text-center animate-pulse">Synchronisation_Hub_Master...</p>
    </div>
  );

  const mConfig = getMissionConfig(activeWidget?.data?.type);

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center text-left">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 opacity-60">Unité_Opérationnelle</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3>
               </div>
               <div className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_10px_#39FF14]" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
               <StatBox label="Amicaux" val={0} color="text-orange-600" />
               <StatBox label="Tournois" val={0} color="text-indigo-600" />
               <StatBox label="Réponses" val={0} color="text-neon-orange" />
               <StatBox label="Effectif" val={squad.length} color="text-blue-600" />
            </div>
         </div>
      </section>

      {/* 2. LE NEXUS HUB MASTER (Style Photo 2) */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          { activeWidget?.type === 'LIVE' ? '⏱️ Mission_En_Cours' : activeWidget?.type === 'CHALLENGE' ? '🚩 Alerte_Radar' : '📅 Focus_Mission' }
        </h3>

        {activeWidget ? (
          <div className={`relative rounded-[3rem] overflow-hidden border-2 shadow-2xl transition-all duration-700 ${mConfig.bg === 'bg-red-600' ? 'border-red-600' : 'border-white/10'} ${styles.cardBg}`}>

             {/* FOND STADIUM DYNAMIQUE (Si Match ou Live) */}
             {(activeWidget.type === 'LIVE' || activeWidget.data.type?.toLowerCase().includes('match')) && (
               <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}>
                  <div className="absolute inset-0 bg-black/60" />
               </div>
             )}

             <div className="relative z-10 p-8">
                {/* 1. BARRE DATE/HEURE PILULE */}
                <div className="flex justify-between items-start mb-10">
                   <div className={`px-4 py-1.5 rounded-full border ${mConfig.bg}/10 ${mConfig.color} border-${mConfig.color}/30 text-[10px] font-black uppercase tracking-widest bg-white/5`}>
                      {new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                   </div>
                   <Zap size={20} className={mConfig.color} fill="currentColor" />
                </div>

                {/* 2. COEUR DU HUB : DUEL OU COALITION */}
                <div className="flex justify-center items-center gap-6 mb-10">
                   {/* BLASON DOMICILE */}
                   <div className="flex flex-col items-center gap-3">
                      <div className={`w-20 h-20 rounded-3xl border-2 ${mConfig.bg}/30 bg-black/40 p-2 flex items-center justify-center shadow-lg overflow-hidden`}>
                         {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" /> : <Shield size={40} className="text-gray-600" />}
                      </div>
                      <p className="text-[10px] font-black uppercase italic text-white/40 line-clamp-1">{teamInfo?.clubName || 'Nexus'}</p>
                   </div>

                   {/* INTERFACE CENTRALE (VS ou SCORE) */}
                   <div className="flex flex-col items-center">
                      {activeWidget.type === 'LIVE' ? (
                        <div className="flex items-center gap-2">
                           <div className="text-5xl font-black italic text-white">{activeWidget.data.home_score}</div>
                           <div className="text-xs font-black text-red-500 animate-pulse">:</div>
                           <div className="text-5xl font-black italic text-white">{activeWidget.data.away_score}</div>
                        </div>
                      ) : activeWidget.data.type?.toLowerCase().includes('match') ? (
                        <div className="text-2xl font-black italic text-white/20 tracking-tighter">VS</div>
                      ) : activeWidget.data.type?.toLowerCase().includes('plateau') ? (
                        <Plus size={20} className="text-purple-500" />
                      ) : (
                        <Activity size={24} className="text-sky-500" />
                      )}
                   </div>

                   {/* BLASON ADVERSAIRE (Sauf Entraînement) */}
                   {activeWidget.data.type?.toLowerCase() !== 'training' && (
                     <div className="flex flex-col items-center gap-3">
                        <div className={`w-20 h-20 rounded-3xl border-2 ${mConfig.bg}/30 bg-black/40 p-2 flex items-center justify-center shadow-lg overflow-hidden`}>
                           {activeWidget.data.away_club?.logo_url ? <img src={activeWidget.data.away_club.logo_url} className="w-full h-full object-contain" /> : <Shield size={40} className="text-gray-600" />}
                        </div>
                        <p className="text-[10px] font-black uppercase italic text-white/40 line-clamp-1">{activeWidget.data.away_club?.name || 'Adversaire'}</p>
                     </div>
                   )}
                </div>

                {/* 3. TITRE IMPACT */}
                <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3 text-left">
                   {activeWidget.data.title || 'Mission_Nexus'}
                </h4>
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10 text-left">
                   <Landmark size={14} className={mConfig.color} /> {activeWidget.data.location || 'Terrain Nexus'}
                </div>

                {/* 4. BARRE DE DISPONIBILITÉ (Style Photo 2) */}
                <div className="space-y-2 mb-10">
                   <div className="flex justify-between items-end px-1">
                      <p className="text-[9px] font-black uppercase text-gray-400">Effectif opérationnel</p>
                      <p className={`text-xs font-black ${mConfig.color}`}>0 / {squad.length}</p>
                   </div>
                   <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div className={`h-full ${mConfig.bg} shadow-[0_0_15px_currentColor] transition-all duration-1000`} style={{ width: '0%' }} />
                   </div>
                </div>

                {/* 5. BOUTONS D'ACTION MASSIFS */}
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => router.push('/events')} className="bg-white/5 border border-white/10 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] active:scale-95 transition-all">Consulter</button>
                   {role === 'coach' && (
                     <button
                       onClick={() => activeWidget.type === 'LIVE' ? stopMission() : router.push('/events')}
                       className={`${mConfig.bg} text-black py-5 rounded-[1.5rem] font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2`}
                     >
                       {activeWidget.type === 'LIVE' ? 'Terminer' : 'Démarrer'} <ArrowRight size={14} strokeWidth={4} />
                     </button>
                   )}
                </div>
             </div>
          </div>
        ) : (
          /* ÉTAT VIDE : PLANIFIER MISSION */
          <Link href="/events/new" className="block p-16 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 active:scale-[0.98] transition-all group">
             <Shield size={32} className="mx-auto mb-3 group-hover:scale-110 transition-transform" />
             <p className="text-[11px] font-black uppercase tracking-widest text-center w-full">Initialiser_Nouvelle_Mission...</p>
          </Link>
        )}
      </section>

      {/* 3. ACTIONS RAPIDES & EFFECTIF (Reste inchangé pour stabilité) */}
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
