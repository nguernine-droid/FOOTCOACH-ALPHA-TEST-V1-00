'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Megaphone, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Play, Pause, Check, Landmark, Clock
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
  const [events, setEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [radarCount, setRadarCount] = useState(0);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [pendingResponses, setPendingResponses] = useState(0);

  // LIVE & ALERTS
  const [freshAlert, setFreshAlert] = useState<any>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [liveMatch, setLiveMatch] = useState<any>(null);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);

  const [isDataLoading, setIsDataLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. Radar Stats
      const { data: openRequests } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openRequests) {
        setRadarCount(openRequests.filter(r => r.type === 'match').length);
        setTournamentCount(openRequests.filter(r => r.type === 'tournament').length);
      }

      // 3. PRIORITÉS D'AFFICHAGE

      // A. MATCH EN DIRECT ?
      const { data: currentMatch } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();
      if (currentMatch) {
        setLiveMatch(currentMatch);
        const { data: mevs } = await supabase.from('match_events').select('*, profiles:author_id(first_name, nickname, role)').eq('match_id', currentMatch.id).order('created_at', { ascending: false });
        setMatchEvents(mevs || []);
      } else {
        setLiveMatch(null);
      }

      // B. DÉFI À VALIDER ? (Si pas de match live)
      if (!currentMatch) {
        const { data: pendingChallenge } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
        if (pendingChallenge) {
          setFreshAlert({ type: 'CHALLENGE', title: 'DÉFI RELEVÉ', subtitle: pendingChallenge.respondent?.clubs?.name || 'Coach Nexus', desc: 'Attend votre validation.', icon: <Trophy className="text-neon-orange" />, color: 'border-neon-orange', link: '/radar' });
          setPendingResponses(1);
        } else {
          setFreshAlert(null);
          setPendingResponses(0);
        }
      }

      // 4. TOUS LES ÉVÉNEMENTS
      const { data: dbEvents } = await supabase.from('events').select('*, home_club:home_club_id(stadium), away_club:away_club_id(stadium)').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).order('date', { ascending: true });
      setEvents(dbEvents || []);

    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id]);

  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();
    else if (!isContextLoading) setIsDataLoading(false);
  }, [teamInfo?.id, isContextLoading, fetchDashboardData]);

  // ABONNEMENT REALTIME
  useEffect(() => {
    if (!teamInfo?.id) return;
    const channel = supabase.channel('nexus_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events' }, () => fetchDashboardData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teamInfo?.id, fetchDashboardData]);

  // ACTIONS
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  const startMatch = async (id: string) => { await supabase.from('events').update({ status: 'live' }).eq('id', id); fetchDashboardData(); };
  const stopMatch = async (id: string) => { await supabase.from('events').update({ status: 'finished' }).eq('id', id); fetchDashboardData(); };

  const validateEvent = async (eventId: string, accept: boolean) => {
    if (accept) {
      const evt = matchEvents.find(e => e.id === eventId);
      if (evt?.type === 'goal') {
        const side = evt.team === 'home' ? 'home_score' : 'away_score';
        await supabase.rpc('increment_score', { row_id: liveMatch.id, column_name: side });
      }
      await supabase.from('match_events').update({ status: 'validated' }).eq('id', eventId);
    } else {
      await supabase.from('match_events').update({ status: 'rejected' }).eq('id', eventId);
    }
    fetchDashboardData();
  };

  const nextEvent = events.find(e => new Date(e.date) >= new Date() && e.status !== 'finished');

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm', text: 'text-gray-900', textSub: 'text-gray-500', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', textSub: 'text-gray-400', accent: 'text-neon-cyan' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40">Initialisation Cockpit...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center">
               <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.textSub}`}>Unité_Connectée</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3>
               </div>
               {liveMatch && <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse"><div className="w-2 h-2 bg-white rounded-full" /><span className="text-[10px] font-black text-white uppercase">Live</span></div>}
            </div>
            <div className="grid grid-cols-4 gap-2">
               <Link href="/radar" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95 text-center"><div className="flex items-center justify-center gap-1 text-orange-600 mb-1"><Radar size={12}/><span className="text-sm font-black">{radarCount}</span></div><p className="text-[6px] font-black uppercase text-gray-500">Amicaux</p></Link>
               <Link href="/radar" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95 text-center"><div className="flex items-center justify-center gap-1 text-indigo-600 mb-1"><Trophy size={12}/><span className="text-sm font-black">{tournamentCount}</span></div><p className="text-[6px] font-black uppercase text-gray-500">Tournois</p></Link>
               <Link href="/radar" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95 text-center"><div className="flex items-center justify-center gap-1 text-neon-orange mb-1"><MessageSquare size={12}/><span className="text-sm font-black">{pendingResponses}</span></div><p className="text-[6px] font-black uppercase text-gray-500">Réponses</p></Link>
               <Link href="/team" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95 text-center"><div className="flex items-center justify-center gap-1 text-blue-600 mb-1"><Users size={12}/><span className="text-sm font-black">{squad.length}</span></div><p className="text-[6px] font-black uppercase text-gray-500">Effectif</p></Link>
            </div>
         </div>
      </section>

      {/* 2. LE NEXUS SUPER-WIDGET (Dynamique) */}
      <section className="space-y-4 text-left">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub} px-1`}>
          {liveMatch ? '⏱️ Match_Center_Live' : (freshAlert && !isAlertDismissed) ? '🚩 Action_Requise' : '📅 Focus_Mission'}
        </h3>

        {liveMatch ? (
          /* ÉTAT : MATCH LIVE */
          <div className="bg-[#050505] border-2 border-red-600 rounded-[2.5rem] p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-8 text-center">
                <div className="w-1/3">
                   <p className="text-[8px] font-black text-white/40 uppercase mb-2 truncate">{liveMatch.home_club?.name || 'Home'}</p>
                   <div className="text-5xl font-black italic text-white leading-none">{liveMatch.home_score}</div>
                </div>
                <div className="w-1/4 text-xs font-black text-red-500 animate-pulse">VS</div>
                <div className="w-1/3">
                   <p className="text-[8px] font-black text-white/40 uppercase mb-2 truncate">{liveMatch.away_club?.name || 'Away'}</p>
                   <div className="text-5xl font-black italic text-white leading-none">{liveMatch.away_score}</div>
                </div>
             </div>
             <div className="space-y-3">
                <button onClick={() => stopMatch(liveMatch.id)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase italic text-xs active:scale-95 transition-all">Terminer la mission</button>
                <Link href="/feed" className="block text-center text-[9px] font-black text-white/30 uppercase underline">Ouvrir le flux Radio Nexus</Link>
             </div>
          </div>
        ) : (freshAlert && !isAlertDismissed) ? (
          /* ÉTAT : ALERTE DÉFI */
          <div className={`bg-[#0A0A0A] border-2 ${freshAlert.color} p-6 rounded-[2.5rem] shadow-2xl animate-pulse-slow relative`}>
             <button onClick={() => setIsAlertDismissed(true)} className="absolute top-6 right-6 text-gray-600"><X size={20} /></button>
             <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">{freshAlert.icon}</div>
                <div className="text-left flex-1 min-w-0">
                   <p className="text-[10px] font-black uppercase text-white/50">{freshAlert.title}</p>
                   <h4 className="text-lg font-black text-white uppercase italic truncate mt-1">{freshAlert.subtitle}</h4>
                   <p className="text-[9px] font-medium text-gray-400 mt-2 italic">"{freshAlert.desc}"</p>
                </div>
             </div>
             <button onClick={() => router.push(freshAlert.link)} className="w-full py-4 mt-6 rounded-2xl font-black uppercase text-[10px] bg-neon-cyan text-black shadow-lg flex items-center justify-center gap-2">Déployer la réponse <ArrowRight size={14}/></button>
          </div>
        ) : nextEvent ? (
          /* ÉTAT : PROCHAIN RDV (Le Calendrier Interactif) */
          <div className={`${styles.cardBg} border-2 p-6 rounded-[2.5rem] relative overflow-hidden group`}>
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12"><Calendar size={100} /></div>
             <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-lg border ${isPro ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                   {new Date(nextEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {nextEvent.time}
                </div>
                <Trophy size={20} className={isPro ? 'text-gray-300' : 'text-white/10'} />
             </div>
             <h4 className="text-2xl font-black text-white uppercase italic leading-tight mb-2">{nextEvent.title}</h4>
             <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8">
                <Landmark size={14} className={styles.accent} /> {nextEvent.location || 'Stade Nexus'}
             </div>
             <div className="grid grid-cols-2 gap-3">
                <Link href="/events" className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] text-center active:scale-95 transition-all">Tout l'agenda</Link>
                {role === 'coach' && <button onClick={() => startMatch(nextEvent.id)} className="bg-neon-cyan text-black py-4 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Démarrer <Play size={12} fill="currentColor" /></button>}
             </div>
          </div>
        ) : (
          /* ÉTAT VIDE : AUCUN RDV */
          <Link href="/events/new" className="block p-12 border-2 border-dashed border-white/10 rounded-[2.5rem] text-center opacity-30 hover:opacity-100 transition-opacity">
             <Plus size={32} className="mx-auto mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest">Planifier une mission...</p>
          </Link>
        )}
      </section>

      <ActionCenter isPro={isPro} onAction={(type) => { setActionType(type); setIsActionModalOpen(true); }} />

      {/* 4. SQUAD OVERVIEW */}
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={(id) => setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])} isPro={isPro} />

      <ActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }} selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} onSend={() => setIsActionModalOpen(false)} actionType={actionType} />
    </div>
  );
}
