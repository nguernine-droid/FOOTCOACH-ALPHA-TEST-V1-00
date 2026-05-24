'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, ChevronRight, Calendar, Loader2, Trophy, Activity, Zap, Users, Radar, ArrowRight, MessageCircle, X, CheckCircle2, Landmark, Clock, Plus, Send, Layers, Timer, Minus, Play, Target, Brain, Flame
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
  const [radarStats, setRadarStats] = useState({ match: 0, tournament: 0, plateau: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [events, setEvents] = useState<any[]>([]);
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      const { data: catReqs } = await supabase.from('match_requests').select('type').eq('category', teamInfo.category).eq('status', 'OPEN').neq('coach_id', user.id);
      if (catReqs) setRadarStats({ match: catReqs.filter(r => r.type === 'Match Amical').length, tournament: catReqs.filter(r => r.type === 'Tournoi').length, plateau: catReqs.filter(r => r.type === 'Plateau').length });

      const { data: allEvts } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').order('date', { ascending: true });
      setEvents(allEvts || []);

      const { data: response } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
      if (response) setActiveWidget({ type: 'CHALLENGE', data: response });
      else setActiveWidget(null);

    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, teamInfo?.category]);

  useEffect(() => {
    if (events.length > 0 && scrollRef.current) {
      const today = new Date().toISOString().split('T')[0];
      const closestIdx = events.findIndex(e => e.date >= today);
      const targetIdx = closestIdx === -1 ? events.length - 1 : closestIdx;
      setTimeout(() => {
        if (scrollRef.current) {
           const cardWidth = scrollRef.current.offsetWidth * 0.85;
           scrollRef.current.scrollTo({ left: targetIdx * (cardWidth + 16), behavior: 'smooth' });
        }
      }, 500);
    }
  }, [events]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const getStyle = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('officiel')) return { color: 'text-orange-500', bg: 'bg-orange-600', glow: 'shadow-[0_0_20px_#f97316]' };
    if (t.includes('match')) return { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', glow: 'shadow-[0_0_20px_#39FF14]' };
    if (t.includes('plateau')) return { color: 'text-purple-500', bg: 'bg-purple-600', glow: 'shadow-[0_0_20px_#a855f7]' };
    return { color: 'text-sky-400', bg: 'bg-sky-500', glow: 'shadow-[0_0_20px_#0ea5e9]' };
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white', text: 'text-gray-900' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <Loader2 size={40} className="animate-spin text-neon-cyan" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan opacity-40">NEXUS_VISUAL_UPGRADE...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-6 ${styles.mainBg}`}>

      {/* HUB COMMANDEMENT */}
      <section className={`p-5 border rounded-[2rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 text-left space-y-4">
            <div className="flex justify-between items-center">
               <div className="text-left"><p className="text-[9px] font-black uppercase text-gray-500">Unité_Opérationnelle</p><h3 className={`text-lg font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName}</h3></div>
               <div className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-2"><Layers size={14} className="text-neon-cyan" /><p className="text-[8px] font-black uppercase text-gray-400">Radar {teamInfo?.category}</p></div>
               <div className="flex gap-3">
                  <div className="text-center"><p className="text-xs font-black text-white">{radarStats.match}</p><p className="text-[5px] text-gray-500 uppercase">Matchs</p></div>
                  <div className="text-center"><p className="text-xs font-black text-white">{radarStats.plateau}</p><p className="text-[5px] text-gray-500 uppercase">Plateaux</p></div>
               </div>
            </div>
         </div>
      </section>

      {/* ALERTES DÉFIS */}
      {activeWidget?.type === 'CHALLENGE' && (
        <section className="animate-in slide-in-from-top-4 duration-500">
           <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[2rem] p-6 shadow-2xl relative">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl border-2 border-neon-orange bg-black flex items-center justify-center"><Trophy className="text-neon-orange" size={24} /></div>
                 <div className="text-left flex-1 min-w-0"><p className="text-[9px] font-black text-neon-orange uppercase italic">Défi Relevé !</p><h4 className="text-base font-black text-white uppercase italic truncate">{activeWidget.data.respondent?.clubs?.name}</h4></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                 <button onClick={() => router.push('/comms')} className="bg-white/5 text-white py-3 rounded-xl font-black uppercase text-[8px] border border-white/10">Discuter</button>
                 <button onClick={() => router.push('/radar')} className="bg-neon-orange text-black py-3 rounded-xl font-black uppercase text-[8px] shadow-lg">Accepter</button>
              </div>
           </div>
        </section>
      )}

      {/* CARROUSEL TIMELINE AVEC FOND STADE VISIBLE */}
      <section className="space-y-3 text-left">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-1">Missions_&_Événements</h3>

        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-4 px-4 pb-4">
          {events.length > 0 ? events.map((ev, i) => {
            const mStyle = getStyle(ev.type);
            const isMatch = ev.type?.toLowerCase().includes('match');
            return (
              <div key={i} className="min-w-[85%] snap-center relative rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl h-72 flex flex-col justify-end group transition-all active:scale-95">

                 {/* FOND STADIUM ÉPIQUE (Plus clair et sans flou) */}
                 {isMatch ? (
                   <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}>
                      {/* Dégradé vignette pour la lisibilité basse uniquement */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                   </div>
                 ) : (
                   <div className="absolute inset-0 bg-[#0A0A0A]" />
                 )}

                 <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                       <div className="px-4 py-1.5 rounded-full border border-white/20 bg-black/60 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-lg">
                          {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {ev.time}
                       </div>
                       <Zap size={20} className={`${mStyle.color} drop-shadow-[0_0_8px_currentColor]`} fill="currentColor" />
                    </div>

                    <div className="text-left space-y-1 mb-2">
                       <h4 className="text-4xl font-black text-white uppercase italic leading-none truncate drop-shadow-2xl">
                          {isMatch ? `VS ${ev.away_club?.name || 'ADV'}` : ev.title}
                       </h4>
                       <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest flex items-center gap-1.5 drop-shadow-lg"><Landmark size={12} className={mStyle.color} /> {ev.location}</p>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-end px-1">
                          <p className="text-[9px] font-black uppercase text-white/50 tracking-widest drop-shadow-lg">Capacité Unité</p>
                          <p className={`text-xs font-black ${mStyle.color} drop-shadow-lg`}>0 / {squad.length}</p>
                       </div>

                       {/* JAUGE SEGMENTÉE */}
                       <div className="flex gap-1 h-2 px-1">
                          {[1,2,3,4,5,6,7,8].map(s => (
                            <div key={s} className="flex-1 rounded-sm bg-white/10 border border-white/5 shadow-inner" />
                          ))}
                       </div>

                       <button
                         onClick={() => router.push('/events')}
                         className={`w-full py-5 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-4 transition-all ${mStyle.bg} ${mStyle.glow} text-black animate-pulse-slow border-t-2 border-white/20`}
                       >
                         Consulter Effectif <ArrowRight size={14} strokeWidth={4} />
                       </button>
                    </div>
                 </div>
              </div>
            );
          }) : (
            <Link href="/events/new" className="min-w-[85%] snap-center block p-16 border-2 border-dashed border-white/10 rounded-[2.5rem] text-center opacity-30 active:scale-95">
               <Plus size={32} className="mx-auto mb-3 text-neon-cyan" />
               <p className="text-[10px] font-black uppercase tracking-widest">Planifier Mission...</p>
            </Link>
          )}
        </div>
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
       <p className="text-[5px] font-black uppercase text-gray-500 tracking-tighter text-center">{label}</p>
    </div>
  );
}
