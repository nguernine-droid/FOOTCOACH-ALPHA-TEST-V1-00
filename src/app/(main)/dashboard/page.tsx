'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Megaphone, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ActionModal } from '@/components/ui/ActionModal';
import { SquadOverview, SquadPlayer } from './components/dashboard/SquadOverview';
import { NextMissionCard } from './components/dashboard/NextMissionCard';
import { ActionCenter, ActionType } from './components/dashboard/ActionCenter';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const { teamInfo, role, theme, isLoading: isContextLoading, isProfileComplete } = useTeam();
  const isPro = theme === 'classic';

  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [radarCount, setRadarCount] = useState(0);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [pendingResponses, setPendingResponses] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    setIsDataLoading(true);

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
          avatarUrl: p.profiles?.avatar_url || `https://i.pravatar.cc/40?u=${p.profiles?.id}`,
          poste: p.poste || 'MIL'
        })));
      }

      // 2. État du Radar
      const { data: openRequests } = await supabase
        .from('match_requests')
        .select('type')
        .eq('status', 'OPEN')
        .neq('coach_id', user.id);

      if (openRequests) {
        setRadarCount(openRequests.filter(r => r.type === 'Match Amical').length);
        setTournamentCount(openRequests.filter(r => r.type === 'Tournoi').length);
      }

      // 3. Réponses en attente
      const { count: pendingCount } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .eq('status', 'PENDING');
      setPendingResponses(pendingCount || 0);

      // 4. Fetch Events avec Stades réels
      const { data: dbEvents } = await supabase
        .from('events')
        .select('*, home_club:home_club_id(stadium), away_club:away_club_id(stadium)')
        .or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`)
        .order('date', { ascending: true });

      const localEvents = JSON.parse(localStorage.getItem('team_events') || '[]');
      const allEvents = [
        ...(dbEvents || []).map(e => ({
          ...e,
          type: 'match',
          available: 0,
          total: squad.length,
          stadium: e.home_club?.stadium || e.away_club?.stadium
        })),
        ...localEvents.map((e: any) => ({ ...e, available: 0, total: squad.length }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(allEvents);

      // 5. Fetch Activités Récentes (Fusion)
      const localBriefings = JSON.parse(localStorage.getItem('team_messages') || '[]');
      const combined = [
        ...localBriefings.map((b: any) => ({ id: b.id, type: b.type || 'info', title: b.title, desc: b.lastMessage, date: b.date, link: '/comms' })),
        ...(dbEvents || []).slice(0, 3).map(e => ({ id: e.id, type: 'calendar', title: `Mission : ${e.title}`, desc: `Le ${e.date} à ${e.time}`, date: e.date, link: '/events' }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

      setActivities(combined);

    } catch (err) {
      console.error("Erreur Dashboard Data:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, [teamInfo?.id, squad.length]);

  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();
    else if (!isContextLoading) setIsDataLoading(false);
  }, [teamInfo?.id, isContextLoading, fetchDashboardData]);

  // AUTO-SCROLL vers le premier événement futur
  useEffect(() => {
    if (events.length > 0 && scrollRef.current) {
      const firstFutureIndex = events.findIndex(e => new Date(e.date) >= new Date());
      if (firstFutureIndex !== -1) {
        const cardWidth = scrollRef.current.offsetWidth * 0.85;
        scrollRef.current.scrollTo({ left: firstFutureIndex * (cardWidth + 16), behavior: 'smooth' });
      }
    }
  }, [events]);

  const styles = isPro ? {
    mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm',
    text: 'text-gray-900', textSub: 'text-gray-500', accent: 'text-orange-600',
    accentBg: 'bg-orange-50 border-orange-200', progressBg: 'bg-gray-100',
  } : {
    mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10',
    text: 'text-white', textSub: 'text-gray-400', accent: 'text-neon-cyan',
    accentBg: 'bg-neon-orange/10 border-neon-orange/30', progressBg: 'bg-white/10',
  };

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

  if (isContextLoading || (isDataLoading && teamInfo?.id)) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
        <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40">Initialisation Cockpit...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-10 -mt-10 ${isPro ? 'text-black' : 'text-neon-cyan'}`}>
            <Shield size={120} />
         </div>

         <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center text-left">
               <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.textSub}`}>Unité_Connectée</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>
                     Bonjour {teamInfo?.coachName || 'Coach'}
                  </h3>
               </div>
               {pendingResponses > 0 && <div className="animate-bounce"><Bell size={18} className="text-neon-orange" fill="currentColor" /></div>}
            </div>

            <div className="grid grid-cols-4 gap-2">
               <Link href="/radar" className={`p-3 rounded-xl border ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} transition-all active:scale-95 text-left`}>
                  <div className="flex items-center gap-1.5 mb-1">
                     <Radar size={12} className={isPro ? 'text-orange-600' : 'text-neon-cyan'} />
                     <span className={`text-sm font-black ${styles.text}`}>{radarCount}</span>
                  </div>
                  <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter leading-none">Amicaux</p>
               </Link>
               <Link href="/radar" className={`p-3 rounded-xl border ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} transition-all active:scale-95 text-left`}>
                  <div className="flex items-center gap-1.5 mb-1">
                     <Trophy size={12} className={isPro ? 'text-indigo-600' : 'text-neon-magenta'} />
                     <span className={`text-sm font-black ${styles.text}`}>{tournamentCount}</span>
                  </div>
                  <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter leading-none">Tournois</p>
               </Link>
               <Link href="/radar" className={`p-3 rounded-xl border ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} transition-all active:scale-95 text-left`}>
                  <div className="flex items-center gap-1.5 mb-1">
                     <MessageSquare size={12} className={pendingResponses > 0 ? 'text-neon-orange' : 'text-gray-500'} />
                     <span className={`text-sm font-black ${styles.text}`}>{pendingResponses}</span>
                  </div>
                  <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter leading-none">Réponses</p>
               </Link>
               <Link href="/team" className={`p-3 rounded-xl border ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} transition-all active:scale-95 text-left`}>
                  <div className="flex items-center gap-1.5 mb-1">
                     <Users size={12} className={isPro ? 'text-blue-600' : 'text-[#39FF14]'} />
                     <span className={`text-sm font-black ${styles.text}`}>{squad.length}</span>
                  </div>
                  <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter leading-none">Effectif</p>
               </Link>
            </div>
         </div>
      </section>

      {/* 2. SQUAD OVERVIEW */}
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={(id) => setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])} isPro={isPro} />

      {/* 3. SCROLLABLE MISSION CARDS (Auto-focus sur le prochain) */}
      <div className="space-y-4 text-left">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub} px-1`}>Missions & Événements</h3>
        {events.length > 0 ? (
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-4 -mx-1 px-1"
          >
            {events.map((ev, i) => (
              <div key={i} className="min-w-[85%] snap-center">
                <NextMissionCard event={ev} isPro={isPro} role={role || 'coach'} />
              </div>
            ))}
          </div>
        ) : (
          <Link href="/events" className="block text-center">
            <div className={`${styles.cardBg} p-8 rounded-3xl border-2 flex flex-col items-center justify-center space-y-4 active:scale-[0.98] transition-all`}>
               <Calendar size={32} className={styles.accent} />
               <div><p className={`text-sm font-black uppercase italic ${styles.text}`}>Calendrier</p></div>
               <span className={`text-[9px] font-black underline uppercase ${styles.accent}`}>Ouvrir l'agenda</span>
            </div>
          </Link>
        )}
      </div>

      <ActionCenter isPro={isPro} onAction={handleOpenAction} />

      {/* 5. ACTIVITÉ RÉCENTE (CLIQUABLE) */}
      <section className="space-y-4 text-left">
        <div className="flex items-center gap-2 px-1 text-left">
          <Activity size={14} className={styles.accent} /><h3 className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${styles.accent}`}>Activité_Récente</h3>
        </div>
        <div className={`${isPro ? 'bg-white border-gray-200' : 'bg-white/[0.03] border-white/5'} border rounded-2xl p-2 space-y-1`}>
          {activities.length > 0 ? (
            activities.map((item, i) => (
              <div
                key={i}
                onClick={() => router.push(item.link)}
                className={`flex items-center justify-between p-4 border border-transparent ${isPro ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]'} rounded-xl transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${item.type === 'match' || item.type === 'calendar' ? 'bg-orange-600' : 'bg-blue-600'}`}>
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

      <ActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }} selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} onSend={() => setIsActionModalOpen(false)} actionType={actionType} />
    </div>
  );
}
