'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Camera, ChevronRight, Calendar, Loader2, Megaphone, Trophy, MessageSquare, Activity, Zap, Users, Radar, Bell, ArrowRight, MessageCircle, X, CheckCircle2, Play, Pause, Check, Landmark, Clock, Plus, Minus
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
  const [pendingResponses, setPendingResponses] = useState(0);

  // DECISION HUB STATE
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. Radar
      const { data: openReqs } = await supabase.from('match_requests').select('type').eq('status', 'OPEN').neq('coach_id', user.id);
      if (openReqs) setRadarStats({ match: openReqs.filter(r => r.type === 'match').length, tournament: openReqs.filter(r => r.type === 'tournament').length });

      // 3. HIÉRARCHIE DES PRIORITÉS
      const { data: liveMatch } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').eq('status', 'live').limit(1).maybeSingle();
      const { data: pendingChallenge } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
      const { data: lastMsg } = await supabase.from('messages').select('*, profiles:sender_id(nickname, first_name, avatar_url)').neq('sender_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

      // On récupère TOUS les événements futurs
      const { data: futureEvents } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`).gte('date', new Date().toISOString().split('T')[0]).neq('status', 'finished').order('date', { ascending: true }).limit(1);
      const nextEvt = futureEvents?.[0];

      if (liveMatch) {
        setActiveWidget({ type: 'LIVE', data: liveMatch });
      } else if (pendingChallenge && !isAlertDismissed) {
        setActiveWidget({ type: 'CHALLENGE', data: pendingChallenge });
      } else if (lastMsg && !isAlertDismissed) {
        setActiveWidget({ type: 'MESSAGE', data: lastMsg });
      } else if (nextEvt) {
        setActiveWidget({ type: 'NEXT', data: nextEvt });
      } else {
        setActiveWidget(null);
      }

      setPendingResponses(pendingChallenge ? 1 : 0);
    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, isAlertDismissed]);

  useEffect(() => {
    if (teamInfo?.id) fetchDashboardData();
    else if (!isContextLoading) setIsDataLoading(false);
  }, [teamInfo?.id, isContextLoading, fetchDashboardData]);

  // ACTIONS
  const startMatch = async (id: string) => { await supabase.from('events').update({ status: 'live' }).eq('id', id); fetchDashboardData(); };
  const stopMatch = async (id: string) => { await supabase.from('events').update({ status: 'finished' }).eq('id', id); fetchDashboardData(); };
  const changeScore = async (side: 'home' | 'away', amount: number) => {
    const current = side === 'home' ? activeWidget.data.home_score : activeWidget.data.away_score;
    await supabase.from('events').update({ [`${side}_score`]: Math.max(0, current + amount) }).eq('id', activeWidget.data.id);
    fetchDashboardData();
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white border-gray-200', text: 'text-gray-900', accent: 'text-orange-600' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white', accent: 'text-neon-cyan' };

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${styles.mainBg}`}>
      <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40">Synchronisation_Tactique...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. HUB DE COMMANDEMENT */}
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
          { (activeWidget?.type === 'LIVE' || activeWidget?.type === 'CHALLENGE') ? '🚩 Mission_Prioritaire' : '📅 Agenda_Unité' }
        </h3>

        {activeWidget?.type === 'LIVE' && (
          <div className="relative rounded-[3rem] overflow-hidden border-2 border-red-600 shadow-2xl">
             <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}>
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
             </div>
             <div className="relative z-10 p-8 text-center">
                <div className="flex justify-between items-center mb-8">
                   <div className="w-1/3">
                      <div className="text-4xl font-black italic text-white mb-2">{activeWidget.data.home_score}</div>
                      <div className="flex justify-center gap-1">
                         <button onClick={() => changeScore('home', -1)} className="p-1 bg-white/5 rounded-lg"><Minus size={12}/></button>
                         <button onClick={() => changeScore('home', 1)} className="p-1 bg-neon-orange text-black rounded-lg"><Plus size={12}/></button>
                      </div>
                   </div>
                   <div className="w-1/4 text-[10px] font-black text-red-500 animate-pulse uppercase tracking-[0.3em]">LIVE</div>
                   <div className="w-1/3">
                      <div className="text-4xl font-black italic text-white mb-2">{activeWidget.data.away_score}</div>
                      <div className="flex justify-center gap-1">
                         <button onClick={() => changeScore('away', -1)} className="p-1 bg-white/5 rounded-lg"><Minus size={12}/></button>
                         <button onClick={() => changeScore('away', 1)} className="p-1 bg-white/20 text-white rounded-lg"><Plus size={12}/></button>
                      </div>
                   </div>
                </div>
                <button onClick={() => stopMatch(activeWidget.data.id)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase italic text-xs shadow-lg">Terminer la mission</button>
             </div>
          </div>
        )}

        {activeWidget?.type === 'CHALLENGE' && (
          <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[3rem] p-8 shadow-2xl relative">
             <button onClick={() => setIsAlertDismissed(true)} className="absolute top-6 right-6 text-gray-600"><X size={20}/></button>
             <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-3xl border-2 border-neon-orange bg-black flex items-center justify-center overflow-hidden"><Trophy className="text-neon-orange" size={32} /></div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-neon-orange uppercase italic">Défi Relevé !</p>
                   <h4 className="text-xl font-black text-white uppercase italic leading-none mt-1">{activeWidget.data.respondent?.clubs?.name}</h4>
                </div>
             </div>
             <button onClick={() => router.push('/radar')} className="w-full py-4 bg-neon-cyan text-black rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">Déployer la réponse <ArrowRight size={14}/></button>
          </div>
        )}

        {activeWidget?.type === 'NEXT' && (
          <div className={`relative rounded-[3rem] overflow-hidden border-2 ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
             {activeWidget.data.type === 'Match' && (
               <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }} />
             )}
             <div className="relative z-10 p-8 text-left">
                <div className="flex justify-between items-start mb-6">
                   <div className={`px-4 py-1.5 rounded-lg border ${isPro ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'} text-[10px] font-black uppercase tracking-widest`}>
                      {new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                   </div>
                </div>
                <h4 className="text-2xl font-black text-white uppercase italic leading-tight mb-2">{activeWidget.data.title}</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-10"><Landmark size={14} className="inline mr-2" /> {activeWidget.data.location || 'Terrain Nexus'}</p>
                <div className="grid grid-cols-2 gap-3">
                   <Link href="/events" className="bg-white/5 border border-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] text-center">Agenda</Link>
                   {role === 'coach' && <button onClick={() => startMatch(activeWidget.data.id)} className="bg-neon-cyan text-black py-4 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 font-black">Démarrer <Play size={12} fill="currentColor" /></button>}
                </div>
             </div>
          </div>
        )}

        {!activeWidget && (
          <Link href="/events" className="block group">
            <div className={`${styles.cardBg} p-10 rounded-[3rem] border-2 flex flex-col items-center justify-center space-y-4 active:scale-[0.98] transition-all text-center`}>
              <div className={`w-20 h-20 rounded-3xl ${isPro ? 'bg-orange-50' : 'bg-white/5'} flex items-center justify-center group-hover:scale-110 transition-transform`}><Calendar size={40} className={styles.accent} /></div>
              <div><p className={`text-lg font-black uppercase italic ${styles.text}`}>Calendrier Officiel</p><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Consulter les prochaines missions</p></div>
            </div>
          </Link>
        )}
      </section>

      <ActionCenter isPro={isPro} onAction={(type) => { setActionType(type); setIsActionModalOpen(true); }} />
      <SquadOverview players={squad} selectedIds={selectedPlayerIds} onSelect={(id) => setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])} isPro={isPro} />
      <ActionModal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setSelectedPlayerIds([]); }} selectedPlayers={squad.filter(p => selectedPlayerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} onSend={() => setIsActionModalOpen(false)} actionType={actionType} />
    </div>
  );
}

function StatBox({ label, val, color }: { label: string, val: number, color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
       <p className={`text-lg font-black ${color} leading-none mb-1`}>{val}</p>
       <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter">{label}</p>
    </div>
  );
}
