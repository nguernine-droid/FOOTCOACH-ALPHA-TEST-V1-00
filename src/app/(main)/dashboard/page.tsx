'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Megaphone, Trophy, MessageSquare, Activity
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ActionModal } from '@/components/ui/ActionModal';
import { SquadOverview, SquadPlayer } from './components/dashboard/SquadOverview';
import { NextMissionCard } from './components/dashboard/NextMissionCard';
import { ActionCenter, ActionType } from './components/dashboard/ActionCenter';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const { teamInfo, role, theme, isLoading: isContextLoading, isProfileComplete } = useTeam();
  const isPro = theme === 'classic';

  // ==========================================
  // STATE RÉEL
  // ==========================================
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [coachStats, setCoachStats] = useState({ grade: 'RECUEILLEUR', doctrine: 0, synergie: 0, influence: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // ==========================================
  // FETCH DES DONNÉES RÉELLES
  // ==========================================
  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    setIsDataLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Stats & Profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCoachStats({
          grade: profile.coach_grade || 'RECUEILLEUR',
          doctrine: profile.coach_doctrine || 0,
          synergie: profile.coach_synergie || 0,
          influence: profile.coach_influence || 0,
        });
      }

      // 2. Fetch Effectif
      const { data: players } = await supabase
        .from('club_players')
        .select(`
          id, poste, status,
          profiles (id, first_name, last_name, avatar_url)
        `)
        .eq('club_id', teamInfo.id);

      if (players) {
        const formatted: SquadPlayer[] = players.map((p: any) => ({
          id: p.profiles?.id,
          name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`,
          status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt',
          avatarUrl: p.profiles?.avatar_url || `https://i.pravatar.cc/40?u=${p.profiles?.id}`,
          poste: p.poste || 'MIL'
        }));
        setSquad(formatted);
      }

      // 3. Fetch Events (Future and Past) - Including Stadium
      const { data: dbEvents } = await supabase
        .from('events')
        .select('*, match_requests(profiles:coach_id(clubs:club_id(stadium)))')
        .or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`)
        .order('date', { ascending: true });

      const localEvents = JSON.parse(localStorage.getItem('team_events') || '[]');

      const allEvents = [
        ...(dbEvents || []).map(e => ({
          ...e,
          type: 'match',
          available: 0,
          total: squad.length,
          stadium: e.match_requests?.profiles?.clubs?.stadium
        })),
        ...localEvents.map((e: any) => ({ ...e, available: 0, total: squad.length }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(allEvents);

      // 4. Fetch Activités Récentes
      const localBriefings = JSON.parse(localStorage.getItem('team_messages') || '[]');

      const { data: matches } = await supabase
        .from('match_requests')
        .select('*, respondent:respondent_id(nickname, first_name)')
        .eq('status', 'MATCHED')
        .or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(3);

      const formattedMatches = (matches || []).map(m => ({
        id: m.id,
        type: 'match',
        title: `Match Confirmé : ${m.type}`,
        desc: `Vs Coach ${m.respondent?.nickname || m.respondent?.first_name || 'Nexus'}`,
        date: new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      }));

      const formattedLocalEvents = localEvents.slice(0, 3).map((e: any) => ({
        id: e.id,
        type: 'calendar',
        title: `RDV : ${e.title}`,
        desc: `${e.date} à ${e.time} - ${e.location}`,
        date: new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      }));

      const combined = [
        ...localBriefings.map((b: any) => ({ id: b.id, type: b.type || 'info', title: b.title, desc: b.lastMessage, date: b.date })),
        ...formattedMatches,
        ...formattedLocalEvents
      ].sort((a, b) => {
         const dateA = a.date.includes('/') ? new Date(a.date.split('/').reverse().join('-')) : new Date();
         const dateB = b.date.includes('/') ? new Date(b.date.split('/').reverse().join('-')) : new Date();
         return dateB.getTime() - dateA.getTime();
      }).slice(0, 6);

      setActivities(combined);

    } catch (err) {
      console.error("Erreur Dashboard Data:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, [teamInfo?.id, squad.length]);

  useEffect(() => {
    if (teamInfo?.id) {
      fetchDashboardData();
    } else if (!isContextLoading) {
       setIsDataLoading(false);
    }
  }, [teamInfo?.id, isContextLoading, fetchDashboardData]);

  // ==========================================
  // STYLES
  // ==========================================
  const styles = isPro ? {
    mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm',
    text: 'text-gray-900', textSub: 'text-gray-500', accent: 'text-orange-600',
    accentBg: 'bg-orange-50 border-orange-200', progressBg: 'bg-gray-100',
  } : {
    mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10',
    text: 'text-white', textSub: 'text-gray-400', accent: 'text-neon-orange',
    accentBg: 'bg-neon-orange/10 border-neon-orange/30', progressBg: 'bg-white/10',
  };

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

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

      {/* 1. COACH PROFILE WIDGET */}
      {role === 'coach' && (
        <Link href="/profile" className="block">
          <section className={`p-5 cursor-pointer active:scale-[0.98] transition-all group text-left border rounded-2xl ${styles.cardBg}`}>
            <div className="flex items-center gap-4 mb-4">
               <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center flex-shrink-0 ${styles.accentBg}`}>
                  {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" /> : <Camera size={24} className={styles.accent} />}
               </div>
               <div className="flex-1 min-w-0 text-left">
                  <h3 className={`text-base font-black uppercase italic truncate leading-tight ${styles.text}`}>
                     {teamInfo?.clubName || 'CLUB_NEXUS'}
                  </h3>
                  <p className={`text-[9px] font-black font-mono uppercase tracking-widest mt-1 ${styles.accent}`}>
                     {teamInfo?.coachName || 'COACH'} // {teamInfo?.grade || 'COACH'}
                  </p>
               </div>
               <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex items-center justify-center ${styles.cardBg}`}>
                     {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} alt="Blason" className="w-full h-full object-cover" /> : <Shield size={24} className={styles.textSub} />}
                  </div>
                  <ChevronRight size={20} className={`${styles.textSub} transition-colors`} />
               </div>
            </div>
          </section>
        </Link>
      )}

      {/* 2. SQUAD OVERVIEW */}
      <SquadOverview
        players={squad}
        selectedIds={selectedPlayerIds}
        onSelect={handleSelectPlayer}
        isPro={isPro}
      />

      {/* 3. SCROLLABLE MISSION CARDS */}
      <div className="space-y-4">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub} px-1`}>Missions & Événements</h3>
        {events.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-4 -mx-1 px-1">
            {events.map((ev, i) => (
              <div key={i} className="min-w-[85%] snap-center">
                <NextMissionCard event={ev} isPro={isPro} role={role || 'coach'} />
              </div>
            ))}
          </div>
        ) : (
          <Link href="/events" className="block">
            <div className={`${styles.cardBg} p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center space-y-4 active:scale-[0.98] transition-all`}>
               <Calendar size={32} className={styles.accent} />
               <div>
                 <p className={`text-sm font-black uppercase italic ${styles.text}`}>Calendrier</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Consultez l'agenda de l'unité</p>
               </div>
               <span className={`text-[9px] font-black underline uppercase ${styles.accent}`}>Ouvrir l'agenda</span>
            </div>
          </Link>
        )}
      </div>

      {/* 4. CENTRE D'ACTION */}
      <ActionCenter isPro={isPro} onAction={handleOpenAction} />

      {/* 5. ACTIVITÉ RÉCENTE */}
      <RecentActivity styles={styles} isPro={isPro} activities={activities} />

      {/* MODALE D'ACTION */}
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
  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Trophy size={16} />;
      case 'calendar': return <Calendar size={16} />;
      case 'message': return <MessageSquare size={16} />;
      default: return <Megaphone size={16} />;
    }
  };

  const getColor = (type: string) => {
    if (isPro) {
      if (type === 'match') return 'bg-orange-600';
      if (type === 'calendar') return 'bg-sky-500';
      return 'bg-blue-600';
    }
    if (type === 'match') return 'bg-neon-orange shadow-[0_0_8px_#FF6B00]';
    if (type === 'calendar') return 'bg-sky-400 shadow-[0_0_8px_#38bdf8]';
    return 'bg-neon-cyan shadow-[0_0_8px_#00F0FF]';
  };

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 px-1 text-left">
        <Activity size={14} className={styles.accent} />
        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${styles.accent}`}>
          Activité_Récente
        </h3>
      </div>
      <div className={`${isPro ? 'bg-white border-gray-200' : 'bg-white/[0.03] border-white/5'} border rounded-2xl p-2 space-y-1 text-left`}>
        {activities.length > 0 ? (
          activities.map((item, i) => (
            <div key={i} className={`flex items-center justify-between p-4 border border-transparent ${isPro ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]'} rounded-xl transition-all cursor-pointer group text-left`}>
              <div className="flex items-center gap-4 text-left flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${getColor(item.type)}`}>
                  {getIcon(item.type)}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-xs font-black uppercase italic tracking-tight truncate ${styles.text}`}>{item.title}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest font-mono mt-1 truncate ${styles.textSub}`}>{item.desc}</p>
                </div>
                <p className={`text-[8px] font-black uppercase opacity-40 shrink-0 ml-2 ${styles.textSub}`}>{item.date}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center italic text-[9px] uppercase tracking-widest text-gray-500">
             En attente de nouvelles transmissions...
          </div>
        )}
      </div>
    </section>
  );
}
