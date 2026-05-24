'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, ChevronRight, Calendar, Loader2, Trophy, Activity, Zap, Users, Radar, ArrowRight, MessageCircle, X, CheckCircle2, Landmark, Clock, Plus, Send, Layers, Timer, Minus, Play, Target, Brain, Flame, MapPin
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
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan opacity-40 text-center">NEXUS_VISUAL_BOOST...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-5 ${styles.mainBg}`}>

      {/* HUB COMMANDEMENT */}
      <section className={`p-4 border rounded-[2rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 text-left space-y-3">
            <div className="flex justify-between items-center">
               <div className="text-left"><p className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Unité_Nox</p><h3 className={`text-lg font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName}</h3></div>
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

      {/* CARROUSEL TIMELINE - SOLUTION B (NO BUTTON, XXL LOGOS) */}
      <section className="space-y-2 text-left">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-1">Missions_&_Événements</h3>

        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-4 px-4 pb-2">
          {events.length > 0 ? events.map((ev, i) => {
            const mStyle = getStyle(ev.type);
            const isMatch = ev.type?.toLowerCase().includes('match');
            return (
              <div
                key={i}
                onClick={() => router.push('/events')}
                className="min-w-[85%] snap-center relative rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-2xl h-[330px] flex flex-col justify-between group transition-all active:scale-[0.98] cursor-pointer"
              >

                 {/* FOND STADIUM DYNAMIQUE */}
                 {isMatch ? (
                   <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                   </div>
                 ) : (
                   <div className="absolute inset-0 bg-[#0A0A0A]" />
                 )}

                 <div className="relative z-10 p-6 flex flex-col h-full justify-between text-center">
                    {/* HAUT : DATE & HEURE GÉANTE */}
                    <div className="flex justify-center">
                       <div className="px-6 py-2.5 rounded-full border-2 border-white/20 bg-black/60 text-[12px] font-black uppercase tracking-[0.2em] text-neon-cyan backdrop-blur-md shadow-2xl animate-pulse-slow">
                          {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {ev.time}
                       </div>
                    </div>

                    {/* CENTRE : DUEL DE BLASONS COLOSSAUX */}
                    {isMatch ? (
                      <div className="flex justify-center items-center gap-2 my-auto">
                         <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-28 h-28 rounded-[2.5rem] border-2 border-white/20 bg-black/40 p-4 flex items-center justify-center backdrop-blur-md overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] group-hover:scale-110 transition-transform duration-700">
                               {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" alt="" /> : <Shield size={48} className="text-gray-600" />}
                            </div>
                            <p className="text-xs font-black uppercase italic text-white drop-shadow-2xl line-clamp-1 tracking-tighter">{teamInfo?.clubName}</p>
                         </div>

                         <div className="text-5xl font-black italic text-white/30 tracking-tighter transform -rotate-12 drop-shadow-2xl px-2">VS</div>

                         <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-28 h-28 rounded-[2.5rem] border-2 border-white/20 bg-black/40 p-4 flex items-center justify-center backdrop-blur-md overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] group-hover:scale-110 transition-transform duration-700">
                               {ev.away_club?.logo_url ? <img src={ev.away_club.logo_url} className="w-full h-full object-contain" alt="" /> : <Shield size={48} className="text-gray-600" />}
                            </div>
                            <p className="text-xs font-black uppercase italic text-white drop-shadow-2xl line-clamp-1 tracking-tighter">{ev.away_club?.name || 'ADVERSAIRE'}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-6 my-auto">
                         <div className={`w-32 h-32 rounded-full bg-white/5 border-4 border-white/10 flex items-center justify-center ${mStyle.color} shadow-2xl group-hover:scale-110 transition-transform duration-700`}>
                            {ev.type === 'training' ? <Target size={60} /> : <Trophy size={60} />}
                         </div>
                         <h4 className="text-4xl font-black text-white uppercase italic leading-none drop-shadow-2xl">{ev.title}</h4>
                      </div>
                    )}

                    {/* BAS : LIEU XXL ET CONTRASTÉ */}
                    <div className="flex items-center justify-center gap-3 text-xs font-black text-white uppercase tracking-[0.2em] drop-shadow-2xl bg-black/50 py-4 rounded-[1.8rem] backdrop-blur-md border border-white/10 mt-auto shadow-xl group-hover:border-neon-cyan/50 transition-colors">
                       <MapPin size={18} className={mStyle.color} strokeWidth={3} />
                       <span className="truncate">{ev.location}</span>
                    </div>
                 </div>
              </div>
            );
          }) : (
            <Link href="/events/new" className="min-w-[85%] snap-center block p-12 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 active:scale-95">
               <Plus size={32} className="mx-auto mb-2 text-neon-cyan" />
               <p className="text-[9px] font-black uppercase tracking-widest text-center w-full">Initialiser Mission...</p>
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
       <p className="text-[6px] font-black uppercase text-gray-500 tracking-tighter text-center">{label}</p>
    </div>
  );
}
