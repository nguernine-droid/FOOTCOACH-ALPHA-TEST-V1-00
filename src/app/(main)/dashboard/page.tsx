'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Megaphone, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Play, Pause, Check, Landmark, Clock, Send
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
  const [radarStats, setRadarStats] = useState({ match: 0, tournament: 0 });
  const [pendingResponses, setPendingResponses] = useState(0);

  // NEXUS DECISION HUB STATE
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. Radar Activity
      const { data: openReqs } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openReqs) setRadarStats({ match: openReqs.filter(r => r.type === 'match').length, tournament: openReqs.filter(r => r.type === 'tournament').length });

      // 3. HIÉRARCHIE DES PRIORITÉS (Le Cerveau Nexus)

      // PRIORITÉ 1 : MATCH EN DIRECT
      const { data: liveMatch } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();

      // PRIORITÉ 2 : DÉFI RELEVÉ
      const { data: pendingChallenge } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();

      // PRIORITÉ 3 : MESSAGE NON LU
      const { data: lastMsg } = await supabase.from('messages').select('*, profiles:sender_id(nickname, first_name, avatar_url)').neq('sender_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

      // PRIORITÉ 4 : PROCHAIN RDV
      const { data: nextEvt } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).gte('date', new Date().toISOString().split('T')[0]).neq('status', 'finished').order('date', { ascending: true }).order('time', { ascending: true }).limit(1).maybeSingle();

      // --- LOGIQUE DE SÉLECTION DU WIDGET ---
      if (liveMatch) {
        setActiveWidget({ type: 'LIVE', data: liveMatch });
      } else if (pendingChallenge && dismissedId !== pendingChallenge.id) {
        setActiveWidget({ type: 'CHALLENGE', data: pendingChallenge });
      } else if (lastMsg && dismissedId !== lastMsg.id) {
        setActiveWidget({ type: 'MESSAGE', data: lastMsg });
      } else if (nextEvt) {
        setActiveWidget({ type: 'NEXT', data: nextEvt });
      } else {
        setActiveWidget(null);
      }

      setPendingResponses(pendingChallenge ? 1 : 0);
      setEvents(nextEvt ? [nextEvt] : []);

    } catch (err) { console.error("Sync Error:", err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, dismissedId]);

  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();
    else if (!isContextLoading) setIsDataLoading(false);

    const channel = supabase.channel('nexus_live_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, () => fetchDashboardData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamInfo?.id, isContextLoading, fetchDashboardData]);

  // ACTIONS
  const startMatch = async (id: string) => { await supabase.from('events').update({ status: 'live' }).eq('id', id); fetchDashboardData(); };
  const stopMatch = async (id: string) => { await supabase.from('events').update({ status: 'finished' }).eq('id', id); fetchDashboardData(); };

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200 shadow-sm', text: 'text-gray-900', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', accent: 'text-neon-cyan' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-neon-cyan">Initialisation_Tactique...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT (Compact) */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 space-y-6 text-left">
            <div className="flex justify-between items-center">
               <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Unité_Opérationnelle</p>
                  <h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName || 'Coach'}</h3>
               </div>
               <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Activity size={18} className={activeWidget?.type === 'LIVE' ? 'text-red-500 animate-pulse' : 'text-gray-600'} />
               </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
               <StatBox label="Amicaux" val={radarStats.match} color="text-orange-600" />
               <StatBox label="Tournois" val={radarStats.tournament} color="text-indigo-600" />
               <StatBox label="Réponses" val={pendingResponses} color="text-neon-orange" />
               <StatBox label="Effectif" val={squad.length} color="text-blue-600" />
            </div>
         </div>
      </section>

      {/* 2. LE NEXUS DECISION HUB (Interactive Widget) */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          {activeWidget ? '🚩 Action_Requise' : '📅 Agenda_Unité'}
        </h3>

        {activeWidget?.type === 'LIVE' && (
          /* --- ÉTAT : MATCH LIVE --- */
          <div className="bg-[#050505] border-2 border-red-600 rounded-[3rem] p-8 shadow-[0_0_40px_rgba(239,68,68,0.2)] animate-in zoom-in duration-500 relative text-center">
             <div className="flex justify-between items-center mb-8">
                <div className="w-1/3 text-center">
                   <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-3 flex items-center justify-center overflow-hidden">
                      {activeWidget.data.home_club?.logo_url ? <img src={activeWidget.data.home_club.logo_url} className="w-full h-full object-contain p-1" /> : <Shield size={24} className="text-gray-600" />}
                   </div>
                   <div className="text-3xl font-black italic text-white leading-none">{activeWidget.data.home_score}</div>
                </div>
                <div className="w-1/4 text-center">
                   <div className="text-[10px] font-black text-red-500 animate-pulse uppercase tracking-[0.3em] mb-2">En Direct</div>
                   <div className="text-gray-600 font-bold italic text-sm">VS</div>
                </div>
                <div className="w-1/3 text-center">
                   <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-3 flex items-center justify-center overflow-hidden">
                      {activeWidget.data.away_club?.logo_url ? <img src={activeWidget.data.away_club.logo_url} className="w-full h-full object-contain p-1" /> : <Shield size={24} className="text-gray-600" />}
                   </div>
                   <div className="text-3xl font-black italic text-white leading-none">{activeWidget.data.away_score}</div>
                </div>
             </div>
             <button onClick={() => stopMatch(activeWidget.data.id)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase italic text-xs active:scale-95 transition-all shadow-lg">Terminer la mission</button>
             <Link href="/feed" className="block text-center text-[9px] font-black text-gray-500 uppercase mt-4 underline">Ouvrir le flux Radio Nexus</Link>
          </div>
        )}

        {activeWidget?.type === 'CHALLENGE' && (
          /* --- ÉTAT : DÉFI RELEVÉ --- */
          <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[3rem] p-8 shadow-[0_0_30px_rgba(255,107,0,0.2)] animate-pulse-slow relative">
             <button onClick={() => setDismissedId(activeWidget.data.id)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-600"><X size={20}/></button>
             <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-3xl border-2 border-neon-orange bg-black flex items-center justify-center overflow-hidden shadow-lg">
                   {activeWidget.data.respondent?.clubs?.logo_url ? <img src={activeWidget.data.respondent.clubs.logo_url} /> : <Trophy className="text-neon-orange" size={32} />}
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-neon-orange uppercase tracking-tighter italic">Défi Relevé !</p>
                   <h4 className="text-xl font-black text-white uppercase italic leading-none mt-1">{activeWidget.data.respondent?.clubs?.name || 'Coach Nexus'}</h4>
                   <p className="text-[9px] font-bold text-gray-500 uppercase mt-2">Coach {activeWidget.data.respondent?.nickname || 'Inconnu'}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push('/radar')} className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all">Consulter</button>
                <button onClick={() => router.push('/comms')} className="bg-neon-orange text-black py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Discuter <ArrowRight size={14}/></button>
             </div>
          </div>
        )}

        {activeWidget?.type === 'MESSAGE' && (
          /* --- ÉTAT : NOUVEAU MESSAGE --- */
          <div className="bg-[#0A0A0A] border-2 border-neon-cyan rounded-[3rem] p-8 shadow-[0_0_30px_rgba(0,240,255,0.2)] animate-in slide-in-from-right duration-500 relative">
             <button onClick={() => setDismissedId(activeWidget.data.id)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-600"><X size={20}/></button>
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-neon-cyan/20 flex items-center justify-center shrink-0 border border-neon-cyan/30">
                   {activeWidget.data.profiles?.avatar_url ? <img src={activeWidget.data.profiles.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : <MessageCircle className="text-neon-cyan" size={24} />}
                </div>
                <div className="text-left flex-1 min-w-0">
                   <p className="text-[10px] font-black text-neon-cyan uppercase tracking-tighter">Nouveau Message</p>
                   <h4 className="text-lg font-black text-white uppercase italic truncate">Coach {activeWidget.data.profiles?.nickname || activeWidget.data.profiles?.first_name}</h4>
                </div>
             </div>
             <p className="bg-white/5 p-4 rounded-2xl text-[11px] text-gray-300 italic mb-6 leading-relaxed">"{activeWidget.data.text}"</p>
             <button onClick={() => router.push('/comms')} className="w-full py-4 bg-neon-cyan text-black rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">Ouvrir le chat <ArrowRight size={14}/></button>
          </div>
        )}

        {activeWidget?.type === 'NEXT' && (
          /* --- ÉTAT : MISSION FOCUS --- */
          <div className={`${styles.cardBg} border-2 p-8 rounded-[3rem] relative overflow-hidden group`}>
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 group-hover:rotate-45 transition-transform duration-1000"><Calendar size={120} /></div>
             <div className="flex justify-between items-start mb-8 text-left">
                <div className={`px-4 py-1.5 rounded-lg border ${isPro ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                   {new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                </div>
                <Zap size={20} className={isPro ? 'text-orange-400' : 'text-neon-cyan'} fill="currentColor" />
             </div>
             <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3 text-left">{activeWidget.data.title}</h4>
             <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10 text-left">
                <Landmark size={14} className={styles.accent} /> {activeWidget.data.location || 'Terrain Nexus'}
             </div>
             <div className="grid grid-cols-2 gap-3">
                <Link href="/events" className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] text-center active:scale-95 transition-all">Agenda</Link>
                {role === 'coach' && <button onClick={() => startMatch(activeWidget.data.id)} className="bg-neon-cyan text-black py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Démarrer <Play size={12} fill="currentColor" /></button>}
             </div>
          </div>
        )}

        {!activeWidget && (
          /* --- ÉTAT VIDE --- */
          <Link href="/events/new" className="block p-16 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 hover:opacity-100 transition-opacity active:scale-[0.98]">
             <PlusIcon size={32} className="mx-auto mb-3" />
             <p className="text-[11px] font-black uppercase tracking-widest">Planifier_Mission...</p>
          </Link>
        )}
      </section>

      <ActionCenter isPro={isPro} onAction={(type) => { setActionType(type); setIsActionModalOpen(true); }} />

      {/* 4. SQUAD OVERVIEW */}
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={handleSelectPlayer} isPro={isPro} />

      <ActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }} selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} onSend={() => setIsActionModalOpen(false)} actionType={actionType} />
    </div>
  );
}

function StatBox({ label, val, color }: { label: string, val: number, color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-center">
       <p className={`text-lg font-black ${color} leading-none mb-1`}>{val}</p>
       <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">{label}</p>
    </div>
  );
}

function PlusIcon({ size, className }: any) { return <Send size={size} className={className} />; }
