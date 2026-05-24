'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Megaphone, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Send, Users2, Landmark, Play, Pause, Check
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ActionModal } from '@/components/ui/ActionModal';
import { SquadOverview, SquadPlayer } from './components/dashboard/SquadOverview';
import { NextMissionCard } from './components/dashboard/NextMissionCard';
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

  // SMART WIDGET & LIVE MATCH STATE
  const [freshAlert, setFreshAlert] = useState<any>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [liveMatch, setLiveMatch] = useState<any>(null);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    if (isDataLoading) setIsDataLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Effectif
      const { data: players } = await supabase
        .from('club_players')
        .select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`)
        .eq('club_id', teamInfo.id);

      if (players) {
        setSquad(players.map((p: any) => ({
          id: p.profiles?.id,
          name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`,
          status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt',
          avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`,
          poste: p.poste || 'MIL'
        })));
      }

      // 2. État du Radar
      const { data: openRequests } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openRequests) {
        setRadarCount(openRequests.filter(r => r.type === 'Match Amical').length);
        setTournamentCount(openRequests.filter(r => r.type === 'Tournoi').length);
      }

      // 3. LOGIQUE SMART WIDGET & MATCH CENTER
      const today = new Date().toISOString().split('T')[0];
      const { data: currentMatch } = await supabase
        .from('events')
        .select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)')
        .eq('status', 'live')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentMatch) {
        setLiveMatch(currentMatch);
        const { data: mevs } = await supabase
          .from('match_events')
          .select('*, profiles:author_id(first_name, nickname, role)')
          .eq('match_id', currentMatch.id)
          .order('created_at', { ascending: false });
        setMatchEvents(mevs || []);
      } else {
        setLiveMatch(null);
      }

      if (!currentMatch) {
        const { data: pendingChallenge } = await supabase
          .from('match_requests')
          .select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))')
          .eq('coach_id', user.id)
          .eq('status', 'PENDING')
          .maybeSingle();

        if (pendingChallenge) {
          setFreshAlert({
            type: 'CHALLENGE',
            title: 'DÉFI RELEVÉ',
            subtitle: `${pendingChallenge.respondent?.clubs?.name || 'Unité Adjointe'}`,
            desc: `Coach ${pendingChallenge.respondent?.nickname || 'Nexus'} attend validation.`,
            icon: <Trophy className="text-neon-orange" size={24} />,
            color: 'border-neon-orange shadow-[0_0_20px_#FF6B0033]',
            link: '/radar',
            btnText: 'Valider'
          });
          setPendingResponses(1);
        } else {
          setFreshAlert(null);
          setPendingResponses(0);
        }
      }

      // 4. Fetch All Events
      const { data: dbEvents } = await supabase.from('events').select('*, home_club:home_club_id(stadium), away_club:away_club_id(stadium)').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).order('date', { ascending: true });
      const localEvents = JSON.parse(localStorage.getItem('team_events') || '[]');
      setEvents([...(dbEvents || []).map(e => ({ ...e, type: e.type.toLowerCase(), available: 0, total: squad.length, stadium: e.home_club?.stadium || e.away_club?.stadium })), ...localEvents.map((e: any) => ({ ...e, available: 0, total: squad.length }))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setActivities(JSON.parse(localStorage.getItem('team_messages') || '[]').slice(0, 6));

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, [teamInfo?.id, squad.length, role, isDataLoading]);

  // ABONNEMENT REALTIME
  useEffect(() => {
    if (!teamInfo?.id) return;
    const channel = supabase.channel('dashboard_master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, () => fetchDashboardData())
      .subscribe();
    fetchDashboardData();
    return () => { supabase.removeChannel(channel); };
  }, [teamInfo?.id, fetchDashboardData]);

  // --- ACTIONS ---
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  const handleOpenAction = (type: ActionType) => {
    setActionType(type);
    if (type === 'convocation' && selectedPlayerIds.length === 0) {
      setSelectedPlayerIds(squad.filter(p => p.status !== 'inactive').map(p => p.id));
    }
    setIsActionModalOpen(true);
  };

  const startMatch = async (id: string) => {
    await supabase.from('events').update({ status: 'live' }).eq('id', id);
    fetchDashboardData();
  };

  const stopMatch = async (id: string) => {
    await supabase.from('events').update({ status: 'finished' }).eq('id', id);
    fetchDashboardData();
  };

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

  const sendLiveAction = async (type: string, team: 'home' | 'away' | null, content?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('match_events').insert([{
      match_id: liveMatch.id,
      author_id: user?.id,
      type,
      team,
      content,
      status: role === 'coach' ? 'validated' : 'pending'
    }]);
    if (role === 'coach' && type === 'goal') {
      const side = team === 'home' ? 'home_score' : 'away_score';
      await supabase.rpc('increment_score', { row_id: liveMatch.id, column_name: side });
    }
    fetchDashboardData();
  };

  const styles = isPro ? {
    mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm',
    text: 'text-gray-900', textSub: 'text-gray-500', accent: 'text-orange-600',
  } : {
    mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10',
    text: 'text-white', textSub: 'text-gray-400', accent: 'text-neon-cyan',
  };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
        <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40">Synchronisation Cockpit...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center text-left">
               <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.textSub}`}>Unité_Connectée</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3>
               </div>
               {liveMatch && <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse"><div className="w-2 h-2 bg-white rounded-full" /><span className="text-[10px] font-black text-white uppercase tracking-tighter">Live</span></div>}
            </div>
            <div className="grid grid-cols-4 gap-2">
               <Link href="/radar" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95"><div className="flex items-center gap-1.5 mb-1 text-orange-600"><Radar size={12}/><span className="text-sm font-black">{radarCount}</span></div><p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">Amicaux</p></Link>
               <Link href="/radar" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95"><div className="flex items-center gap-1.5 mb-1 text-indigo-600"><Trophy size={12}/><span className="text-sm font-black">{tournamentCount}</span></div><p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">Tournois</p></Link>
               <Link href="/radar" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95"><div className="flex items-center gap-1.5 mb-1 text-neon-orange"><MessageSquare size={12}/><span className="text-sm font-black">{pendingResponses}</span></div><p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">Réponses</p></Link>
               <Link href="/team" className="p-3 rounded-xl border border-white/5 transition-all active:scale-95"><div className="flex items-center gap-1.5 mb-1 text-blue-600"><Users size={12}/><span className="text-sm font-black">{squad.length}</span></div><p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">Effectif</p></Link>
            </div>
         </div>
      </section>

      {/* 2. SMART WIDGET */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub} px-1`}>
          {liveMatch ? '⏱️ Match_Center_Live' : (freshAlert && !isAlertDismissed) ? '🚩 Action_Requise' : '📅 Agenda_Unité'}
        </h3>

        {liveMatch ? (
          <div className="bg-[#050505] border-2 border-red-600 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
             <div className="flex justify-between items-center mb-8 text-center">
                <div className="w-1/3">
                   <p className="text-[8px] font-black text-white/40 uppercase mb-2 truncate">{liveMatch.home_club?.name || 'Home'}</p>
                   <div className="text-5xl font-black italic text-white leading-none">{liveMatch.home_score}</div>
                </div>
                <div className="w-1/4"><div className="text-xs font-black text-red-500 animate-pulse">VS</div></div>
                <div className="w-1/3">
                   <p className="text-[8px] font-black text-white/40 uppercase mb-2 truncate">{liveMatch.away_club?.name || 'Away'}</p>
                   <div className="text-5xl font-black italic text-white leading-none">{liveMatch.away_score}</div>
                </div>
             </div>
             <div className="space-y-4 pt-4 border-t border-white/5">
                {role === 'coach' ? (
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => sendLiveAction('goal', 'home')} className="bg-neon-orange text-black py-4 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">BUT {liveMatch.home_club?.name?.split(' ')[0]}</button>
                      <button onClick={() => sendLiveAction('goal', 'away')} className="bg-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all">BUT ADVERSE</button>
                      <button onClick={() => stopMatch(liveMatch.id)} className="col-span-2 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[9px] mt-2 active:scale-95 transition-all">Terminer le match</button>
                   </div>
                ) : (
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => sendLiveAction('goal', 'home')} className="bg-neon-orange/20 border border-neon-orange text-neon-orange py-4 rounded-xl font-black uppercase text-[9px] active:scale-95 transition-all">Signaler un but !</button>
                      <button onClick={() => router.push('/feed')} className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[9px] active:scale-95 transition-all">Commenter</button>
                   </div>
                )}
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto no-scrollbar pt-2">
                   {matchEvents.map(evt => (
                      <div key={evt.id} className={`p-3 rounded-xl border text-[9px] flex justify-between items-center ${evt.status === 'pending' ? 'bg-neon-orange/10 border-neon-orange/30' : 'bg-white/5 border-white/5'}`}>
                         <div className="text-left flex-1">
                            <span className="font-black uppercase text-white/60">{evt.profiles?.nickname || evt.profiles?.first_name}</span>
                            <span className="ml-2 font-black uppercase text-white">{evt.type === 'goal' ? '⚽ BUT !!!' : evt.content}</span>
                         </div>
                         {role === 'coach' && evt.status === 'pending' && (
                            <div className="flex gap-1 ml-2">
                               <button onClick={() => validateEvent(evt.id, true)} className="p-1.5 bg-green-500 text-black rounded-lg"><Check size={10} strokeWidth={4}/></button>
                               <button onClick={() => validateEvent(evt.id, false)} className="p-1.5 bg-red-500 text-white rounded-lg"><X size={10}/></button>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
        ) : (freshAlert && !isAlertDismissed) ? (
          <div className={`bg-[#0A0A0A] border-2 ${freshAlert.color} p-6 rounded-[2.5rem] shadow-2xl animate-pulse-slow`}>
             <div className="flex items-start gap-4 text-left">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">{freshAlert.icon}</div>
                <div className="text-left flex-1 min-w-0">
                   <p className="text-[10px] font-black uppercase tracking-tighter italic opacity-60 text-white/50">{freshAlert.title}</p>
                   <h4 className="text-lg font-black text-white uppercase italic leading-tight mt-1 truncate">{freshAlert.subtitle}</h4>
                   <p className="text-[9px] font-medium text-gray-400 mt-2 italic">"{freshAlert.desc}"</p>
                </div>
                <button onClick={() => setIsAlertDismissed(true)} className="text-gray-600"><X size={16} /></button>
             </div>
             <button onClick={() => router.push(freshAlert.link)} className={`w-full py-4 mt-6 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 bg-neon-cyan text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]`}>{freshAlert.btnText} <ArrowRight size={14} /></button>
          </div>
        ) : (
          <div className="space-y-4">
            <Link href="/events" className="block group">
              <div className={`${styles.cardBg} p-8 rounded-[2.5rem] border-2 flex flex-col items-center justify-center space-y-4 active:scale-[0.98] transition-all text-center`}>
                <div className={`w-16 h-16 rounded-2xl ${isPro ? 'bg-orange-50' : 'bg-white/5'} flex items-center justify-center group-hover:scale-110 transition-transform`}><Calendar size={32} className={styles.accent} /></div>
                <div><p className={`text-sm font-black uppercase italic ${styles.text}`}>Calendrier Officiel</p><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Gérer les missions de l'unité</p></div>
              </div>
            </Link>
            {role === 'coach' && events.find(e => new Date(e.date).toDateString() === new Date().toDateString() && e.status !== 'finished' && e.status !== 'live') && (
              <button
                onClick={() => startMatch(events.find(e => new Date(e.date).toDateString() === new Date().toDateString()).id)}
                className="w-full py-5 bg-neon-cyan text-black rounded-2xl font-black uppercase italic text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Play size={18} fill="currentColor" /> DÉMARRER LA MISSION DU JOUR
              </button>
            )}
          </div>
        )}
      </section>

      {/* 3. MISSIONS SCROLLABLES */}
      {events.length > 0 && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center px-1">
             <h3 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Missions_En_Cours</h3>
             <Link href="/events" className={`text-[9px] font-black uppercase ${styles.accent}`}>Voir tout</Link>
          </div>
          <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-4 -mx-1 px-1">
            {events.map((ev, i) => (
              <div key={i} className="min-w-[85%] snap-center"><NextMissionCard event={ev} isPro={isPro} role={role || 'coach'} /></div>
            ))}
          </div>
        </div>
      )}

      <ActionCenter isPro={isPro} onAction={handleOpenAction} />
      <RecentActivity styles={styles} isPro={isPro} activities={activities} />

      <ActionModal
        isOpen={isActionModalOpen}
        onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }}
        selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))}
        onSend={() => setIsActionModalOpen(false)}
        actionType={actionType}
      />
    </div>
  );
}

function RecentActivity({ styles, isPro, activities }: { styles: any, isPro: boolean, activities: any[] }) {
  const router = useRouter();
  const getColor = (type: string) => isPro ? (type === 'match' ? 'bg-orange-600' : 'bg-blue-600') : (type === 'match' ? 'bg-neon-orange' : 'bg-neon-cyan');
  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 px-1 text-left"><Activity size={14} className={styles.accent} /><h3 className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${styles.accent}`}>Activité_Récente</h3></div>
      <div className={`${isPro ? 'bg-white border-gray-200' : 'bg-white/[0.03] border-white/5'} border rounded-2xl p-2 space-y-1`}>
        {activities.length > 0 ? (
          activities.map((item, i) => (
            <div key={i} onClick={() => router.push(item.type === 'calendar' ? '/events' : '/comms')} className={`flex items-center justify-between p-4 border border-transparent ${isPro ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]'} rounded-xl transition-all cursor-pointer group text-left`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${getColor(item.type)}`}>
                   {item.type === 'match' ? <Trophy size={16} /> : item.type === 'calendar' ? <Calendar size={16} /> : <Megaphone size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black uppercase italic truncate ${styles.text}`}>{item.title}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest font-mono mt-1 truncate ${styles.textSub}`}>{item.desc}</p>
                </div>
                <p className={`text-[8px] font-black uppercase opacity-40 shrink-0 ml-2 ${styles.textSub}`}>{item.date}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center italic text-[9px] uppercase tracking-widest text-gray-500">En attente de nouvelles transmissions...</div>
        )}
      </div>
    </section>
  );
}
