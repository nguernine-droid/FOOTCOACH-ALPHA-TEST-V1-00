'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ChevronRight, Calendar, Loader2, Trophy, Activity, Zap, Users, Radar, ArrowRight, MessageCircle, X, CheckCircle2, Landmark, Clock, Plus, Send, Layers, Timer, Minus, Play, Target, Brain, Flame, MapPin, Navigation
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'active' ? 'active' : 'inactive', avatarUrl: p.profiles?.avatar_url || '', poste: p.poste })));
      const { data: catReqs } = await supabase.from('match_requests').select('type').eq('category', teamInfo.category).eq('status', 'OPEN').neq('coach_id', user.id);
      if (catReqs) setRadarStats({ match: catReqs.filter(r => r.type === 'Match Amical').length, tournament: catReqs.filter(r => r.type === 'Tournoi').length, plateau: catReqs.filter(r => r.type === 'Plateau').length });
      const { data: allEvts } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').order('date', { ascending: true });
      setEvents(allEvts || []);
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

  const handleNavigate = (e: React.MouseEvent, ev: any) => {
    e.stopPropagation();
    const destination = ev.stadium_name ? `${ev.stadium_name} ${ev.city}` : ev.location;
    if (!destination || destination.toLowerCase().includes('à définir')) {
      alert("📍 LOCALISATION REQUISE\nVeuillez renseigner la ville ou le stade.");
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`, '_blank');
  };

  const getStyle = (ev: any) => {
    const type = ev.type?.toLowerCase() || '';
    const isOfficial = ev.tournament_config?.is_official === true;
    if (isOfficial) return { color: 'text-orange-500', bg: 'bg-orange-600', border: 'border-orange-500/50', glow: 'shadow-[0_0_25px_#f9731644]' };
    if (type.includes('match')) return { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', border: 'border-[#39FF14]/50', glow: 'shadow-[0_0_25px_#39FF1444]' };
    if (type.includes('plateau')) return { color: 'text-purple-500', bg: 'bg-purple-600', border: 'border-purple-500/50', glow: 'shadow-[0_0_25px_#a855f744]' };
    return { color: 'text-sky-400', bg: 'bg-sky-500', border: 'border-sky-500/30', glow: 'shadow-[0_0_25px_#0ea5e944]' };
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white', text: 'text-gray-900' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-neon-cyan" size={40} /></div>;

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-6 ${styles.mainBg}`}>
      <ActionCenter isPro={isPro} onAction={() => {}} />

      <section className="space-y-3 text-left">
        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 px-1 opacity-50">Missions_Opérationnelles</h3>
        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-4 px-4 pb-2">
          {events.map((ev, i) => {
            const mStyle = getStyle(ev);
            const isMatch = ev.type?.toLowerCase().includes('match');
            const isHome = ev.home_club_id === teamInfo?.id;
            const displayLocation = isHome ? (ev.stadium_name || 'DOMICILE') : (ev.city || 'EXTÉRIEUR');

            return (
              <div
                key={i}
                onClick={(e) => handleNavigate(e, ev)}
                className={`min-w-[85%] snap-center relative rounded-[3rem] overflow-hidden border-4 ${mStyle.border} ${mStyle.glow} h-[310px] flex flex-col justify-between group transition-all active:scale-[0.97] cursor-pointer shadow-2xl`}
              >
                 {isMatch ? (
                   <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}><div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" /></div>
                 ) : <div className="absolute inset-0 bg-[#0A0A0A]" />}

                 <div className="relative z-10 p-5 flex flex-col h-full justify-between text-center">
                    {/* TOP: DATE */}
                    <div className="flex justify-center">
                       <div className="px-5 py-2 rounded-full border-2 border-white/20 bg-black/60 text-[11px] font-black uppercase tracking-[0.2em] text-neon-cyan backdrop-blur-md shadow-2xl">
                          {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {ev.time}
                       </div>
                    </div>

                    {/* CENTER: CONTENT */}
                    {isMatch ? (
                      <div className="flex justify-center items-center gap-2">
                         <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-20 h-20 rounded-3xl border-2 border-white/20 bg-black/40 p-3 flex items-center justify-center backdrop-blur-md overflow-hidden shadow-2xl group-hover:scale-105 transition-transform"><img src={teamInfo?.clubLogo} className="w-full h-full object-contain" /></div>
                            <p className="text-[9px] font-black uppercase italic text-white drop-shadow-2xl line-clamp-1">{teamInfo?.clubName}</p>
                         </div>
                         <div className="text-4xl font-black italic text-white/20 tracking-tighter transform -rotate-12 px-1">VS</div>
                         <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-20 h-20 rounded-3xl border-2 border-white/20 bg-black/40 p-3 flex items-center justify-center backdrop-blur-md overflow-hidden shadow-2xl"><img src={ev.away_club?.logo_url} className="w-full h-full object-contain" /></div>
                            <p className="text-[9px] font-black uppercase italic text-white drop-shadow-2xl line-clamp-1">{ev.away_club?.name || 'ADVERSAIRE'}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                         <div className={`w-20 h-20 rounded-full bg-white/5 border-4 ${mStyle.border} flex items-center justify-center ${mStyle.color} shadow-2xl`}><Target size={40} /></div>
                         <h4 className="text-2xl font-black text-white uppercase italic leading-none drop-shadow-2xl">{ev.title}</h4>
                      </div>
                    )}

                    {/* BOTTOM: LOCATION */}
                    <div className={`flex flex-col items-center gap-1`}>
                       <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.4em]">Destination_Combat</p>
                       <div className={`w-full py-3 rounded-[1.8rem] bg-black/60 backdrop-blur-xl border-2 ${mStyle.border} flex items-center justify-center gap-2 shadow-2xl group-hover:bg-white transition-all group-hover:text-black`}>
                          <Navigation size={16} className={mStyle.color} fill="currentColor" />
                          <span className="text-sm font-black uppercase italic tracking-widest">{displayLocation}</span>
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </section>

      <SquadOverview players={squad} selectedIds={[]} onSelect={() => {}} isPro={isPro} />
    </div>
  );
}
