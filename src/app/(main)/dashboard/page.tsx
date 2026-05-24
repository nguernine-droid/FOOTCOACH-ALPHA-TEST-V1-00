'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, ChevronRight, Calendar, Loader2, Trophy, Activity, Zap, Users, Radar, ArrowRight, MessageCircle, X, CheckCircle2, Landmark, Plus, Send, Layers, Timer, Minus, Play
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ActionModal } from '@/components/ui/ActionModal';
import { SquadOverview, SquadPlayer } from './components/dashboard/SquadOverview';
import { ActionCenter, ActionType } from './components/dashboard/ActionCenter';
import { supabase } from '@/lib/supabase/client';

/**
 * DASHBOARD_PAGE (v12.9 - STABLE MASTER)
 * Focus Essentiel : Agenda, Alertes et Intelligence de Marché.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { teamInfo, role, theme, isLoading: isContextLoading } = useTeam();
  const isPro = theme === 'classic';

  // --- ÉTATS DES DONNÉES ---
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [radarStats, setRadarStats] = useState({ match: 0, tournament: 0 });
  const [categoryStats, setCategoryStats] = useState({ match: 0, tournament: 0, plateau: 0 });
  const [pendingResponses, setPendingResponses] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- ÉTATS DU DECISION HUB ---
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // --- ÉTATS DES ACTIONS RAPIDES ---
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  // ==========================================
  // SYNC MOTEUR (FETCH)
  // ==========================================
  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;

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

      // 2. Radar Stats Globale
      const { data: openReqs } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openReqs) {
        setRadarStats({
          match: openReqs.filter(r => r.type.toLowerCase().includes('match')).length,
          tournament: openReqs.filter(r => r.type.toLowerCase().includes('tournoi')).length
        });
      }

      // 3. Stats Catégorie Spécifique
      if (teamInfo.category) {
        const { data: catReqs } = await supabase
          .from('match_requests')
          .select('type')
          .eq('category', teamInfo.category)
          .eq('status', 'OPEN')
          .neq('coach_id', user.id);

        if (catReqs) {
          setCategoryStats({
            match: catReqs.filter(r => r.type === 'Match Amical').length,
            tournament: catReqs.filter(r => r.type === 'Tournoi').length,
            plateau: catReqs.filter(r => r.type === 'Plateau').length
          });
        }
      }

      // 4. Logique Decision Hub
      const today = new Date().toISOString().split('T')[0];

      // A. Quelqu'un a répondu
      const { data: myAdResponse } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();

      // B. Nouvelle annonce (Alerte)
      const { data: newAd } = await supabase.from('match_requests').select('*, profiles:coach_id(nickname, clubs:club_id(name, logo_url))').eq('status', 'OPEN').neq('coach_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

      // C. Agenda Focus
      const { data: futureEvents } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).gte('date', today).neq('status', 'finished').order('date', { ascending: true }).limit(1);
      const nextEvt = futureEvents?.[0];

      if (myAdResponse) {
        setActiveWidget({ type: 'DECISION', data: myAdResponse });
      } else if (newAd && dismissedId !== newAd.id) {
        setActiveWidget({ type: 'ALERT', data: newAd });
      } else if (nextEvt) {
        setActiveWidget({ type: 'NEXT', data: nextEvt });
      } else {
        setActiveWidget(null);
      }

      setPendingResponses(myAdResponse ? 1 : 0);
    } catch (err) {
      console.error("Dashboard Sync Fail:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, [teamInfo?.id, teamInfo?.category, dismissedId]);

  // ABONNEMENT REALTIME
  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    const sub = supabase.channel('hub_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, () => fetchDashboardData()).subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, [teamInfo?.id, fetchDashboardData]);

  // --- ACTIONS ---
  const handleOpenAction = (type: ActionType) => {
    setActionType(type);
    if (type === 'convocation' && selectedPlayerIds.length === 0) {
      setSelectedPlayerIds(squad.filter(p => p.status !== 'inactive').map(p => p.id));
    }
    setIsActionModalOpen(true);
  };

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const styles = isPro ? {
    mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm', text: 'text-gray-900', accent: 'text-orange-600'
  } : {
    mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10 shadow-2xl', text: 'text-white', accent: 'text-neon-cyan'
  };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan animate-pulse">Synchronisation_Hub...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center">
               <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 opacity-60">Unité_Opérationnelle</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3>
               </div>
               <div className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_10px_#39FF14]" />
            </div>

            {/* BARRE D'INTELLIGENCE CATÉGORIE */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between animate-in slide-in-from-top-2">
               <div className="flex items-center gap-3">
                  <Layers size={16} className={styles.accent} />
                  <p className="text-[9px] font-black uppercase text-gray-400">Opportunités {teamInfo?.category || 'Séniors'}</p>
               </div>
               <div className="flex gap-4">
                  <div className="text-center"><p className="text-xs font-black text-white">{categoryStats.match}</p><p className="text-[6px] text-gray-500 uppercase">Matchs</p></div>
                  <div className="text-center"><p className="text-xs font-black text-white">{categoryStats.plateau}</p><p className="text-[6px] text-gray-500 uppercase">Plateaux</p></div>
                  <div className="text-center"><p className="text-xs font-black text-white">{categoryStats.tournament}</p><p className="text-[6px] text-gray-500 uppercase">Tournois</p></div>
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

      {/* 2. LE NEXUS ESSENTIAL HUB (Le Widget Interactif) */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          { (activeWidget?.type === 'DECISION' || activeWidget?.type === 'ALERT') ? '🚩 Signal_Prioritaire' : '📅 Agenda_Unité' }
        </h3>

        {activeWidget?.type === 'DECISION' && (
          <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-500">
             <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-3xl border-2 border-neon-orange bg-black flex items-center justify-center overflow-hidden">
                   {activeWidget.data.respondent?.clubs?.logo_url ? <img src={activeWidget.data.respondent.clubs.logo_url} className="w-full h-full object-contain p-2" alt="" /> : <Trophy className="text-neon-orange" size={32} />}
                </div>
                <div className="text-left flex-1 min-w-0">
                   <p className="text-[10px] font-black text-neon-orange uppercase italic tracking-tighter">DÉFI RELEVÉ !</p>
                   <h4 className="text-xl font-black text-white uppercase italic leading-none mt-1 truncate">{activeWidget.data.respondent?.clubs?.name || 'Coach Nexus'}</h4>
                   <p className="text-[9px] font-bold text-gray-500 uppercase mt-2 italic leading-relaxed">Action requise pour validation</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push('/radar')} className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all shadow-sm">Détails</button>
                <button onClick={() => router.push('/comms')} className="bg-blue-600/20 border border-blue-600/30 text-blue-400 py-4 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all shadow-sm">Chatter</button>
                <button onClick={() => router.push('/radar')} className="col-span-2 bg-neon-cyan text-black py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg flex items-center justify-center gap-2 italic active:scale-95 transition-all">Accepter le défi <ArrowRight size={14}/></button>
             </div>
          </div>
        )}

        {activeWidget?.type === 'ALERT' && (
          <div className="bg-[#050505] border-2 border-neon-cyan rounded-[3rem] p-8 shadow-2xl relative animate-in slide-in-from-right duration-500">
             <button onClick={() => setDismissedId(activeWidget.data.id)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-600"><X size={20}/></button>
             <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20"><Radar className="text-neon-cyan" size={24} /></div>
                <div className="text-left flex-1 min-w-0 text-left">
                   <p className="text-[10px] font-black text-neon-cyan uppercase">Nouveau Signal Radar</p>
                   <h4 className="text-lg font-black text-white uppercase italic truncate mt-1">{activeWidget.data.profiles?.clubs?.name || 'Unité Adjointe'}</h4>
                </div>
             </div>
             <button onClick={() => router.push('/radar')} className="w-full py-4 bg-neon-cyan text-black rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Consulter le Radar</button>
          </div>
        )}

        {activeWidget?.type === 'NEXT' && (
          <div className={`${styles.cardBg} border-2 p-8 rounded-[3rem] relative overflow-hidden group text-left shadow-2xl animate-in fade-in duration-700`}>
             <div className="flex justify-between items-start mb-10 text-left">
                <div className={`px-4 py-1.5 rounded-lg border ${isPro ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                   {new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                </div>
                <Zap size={20} className="text-neon-cyan opacity-20" fill="currentColor" />
             </div>
             <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3 text-left">{activeWidget.data.title}</h4>
             <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10 text-left"><Landmark size={14} className="inline mr-2 text-neon-cyan" /> {activeWidget.data.location || 'Terrain Nexus'}</p>
             <Link href="/events" className="block w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] text-center active:scale-95 transition-all">Consulter l'Agenda</Link>
          </div>
        )}

        {!activeWidget && (
          <Link href="/events/new" className="block p-16 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 active:scale-[0.98] transition-all group">
             <Plus size={32} className="mx-auto mb-3" />
             <p className="text-[11px] font-black uppercase tracking-widest text-center">Planifier_Nouvelle_Mission...</p>
          </Link>
        )}
      </section>

      {/* 3. CENTRE D'ACTION RAPIDE */}
      <ActionCenter isPro={isPro} onAction={handleOpenAction} />

      {/* 4. VUE D'ENSEMBLE EFFECTIF */}
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={handleSelectPlayer} isPro={isPro} />

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
