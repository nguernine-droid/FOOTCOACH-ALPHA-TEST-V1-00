'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ActionModal } from '@/components/ui/ActionModal';
import { SquadOverview, SquadPlayer } from './components/dashboard/SquadOverview';
import { NextMissionCard } from './components/dashboard/NextMissionCard';
import { ActionCenter, ActionType } from './components/dashboard/ActionCenter';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const { teamInfo, role, theme, isLoading: isContextLoading } = useTeam();
  const isPro = theme === 'classic';

  // ==========================================
  // STATE RÉEL
  // ==========================================
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
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

      let totalPlayers = 0;

      // 2. Fetch Effectif (Club Players)
      const { data: players } = await supabase
        .from('club_players')
        .select(`
          id,
          poste,
          status,
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
        totalPlayers = formatted.length;
      }

      // 3. Fetch Next Event (Réel)
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(1);

      if (events && events.length > 0) {
        setNextEvent({
          id: events[0].id,
          title: events[0].title,
          date: events[0].date,
          time: events[0].time,
          location: events[0].location,
          type: 'match',
          available: 0,
          total: totalPlayers
        });
      }

    } catch (err) {
      console.error("Erreur Dashboard Data:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, [teamInfo?.id]);

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

      {/* BANNIÈRE RAPPEL PROFIL (Règle des 3 clics) */}

      {/* 2. SQUAD OVERVIEW */}
      <SquadOverview
        players={squad.length > 0 ? squad : []}
        selectedIds={selectedPlayerIds}
        onSelect={handleSelectPlayer}
        isPro={isPro}
      />

      {/* 3. NEXT MISSION CARD */}
      <div className="space-y-3 text-left">
        {nextEvent ? (
          <NextMissionCard event={nextEvent} isPro={isPro} role={role || 'coach'} />
        ) : (
          <div className={`${styles.cardBg} p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4`}>
             <Calendar size={32} className="opacity-20" />
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Aucune mission programmée</p>
             <button onClick={() => handleOpenAction('convocation')} className={`text-[9px] font-black underline uppercase ${styles.accent}`}>Planifier un match</button>
          </div>
        )}
      </div>

      {/* 4. CENTRE D'ACTION */}
      <ActionCenter isPro={isPro} onAction={handleOpenAction} />

      {/* 5. COMPACT PLANNING */}
      <CompactPlanning styles={styles} isPro={isPro} />

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

function MiniCoachBar({ label, value, color, styles }: { label: string, value: number, color: string, styles: any }) {
  return (
    <div className="space-y-1 text-left">
       <div className="flex justify-between items-center text-[7px] font-black font-mono text-left">
         <span className={styles.textSub}>{label}</span>
         <span className={styles.text}>{value}%</span>
       </div>
       <div className={`h-1 w-full ${styles.progressBg} rounded-full overflow-hidden text-left`}>
         <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
       </div>
    </div>
  );
}

function CompactPlanning({ styles, isPro }: { styles: any, isPro: boolean }) {
  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 px-1 text-left">
        <Calendar size={14} className={styles.accent} />
        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${styles.accent}`}>
          {isPro ? 'PLANNING_SAISON' : 'CALENDRIER_MISSION'}
        </h3>
      </div>
      <div className={`${isPro ? 'bg-white border-gray-200' : 'bg-white/[0.03] border-white/5'} border rounded-2xl p-6 text-center italic text-[9px] uppercase tracking-widest text-gray-500`}>
        Initialisation du flux de données...
      </div>
    </section>
  );
}
