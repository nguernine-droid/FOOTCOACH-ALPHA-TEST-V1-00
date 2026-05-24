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

/**
 * DASHBOARD_PAGE (v13.0 - ACTION FIRST)
 * Restructuration tactique : Actions Rapides -> Missions Carousel -> Effectif.
 */
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

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('message');

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      const { data: allEvts } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').order('date', { ascending: true });
      setEvents(allEvts || []);

      const { data: response } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
      if (response) setActiveWidget({ type: 'CHALLENGE', data: response });
      else setActiveWidget(null);

    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, dismissedId]);

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

  const getStyle = (ev: any) => {
    const type = ev.type?.toLowerCase() || '';
    const isOfficial = ev.tournament_config?.is_official === true;
    if (isOfficial) return { color: 'text-orange-500', bg: 'bg-orange-600', border: 'border-orange-500/50', glow: 'shadow-[0_0_20px_#f9731633]' };
    if (type.includes('match')) return { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', border: 'border-[#39FF14]/50', glow: 'shadow-[0_0_20px_#39FF1433]' };
    if (type.includes('plateau')) return { color: 'text-purple-500', bg: 'bg-purple-600', border: 'border-purple-500/50', glow: 'shadow-[0_0_20px_#a855f733]' };
    return { color: 'text-sky-400', bg: 'bg-sky-500', border: 'border-sky-500/30', glow: 'shadow-[0_0_20px_#0ea5e933]' };
  };

  const handleOpenAction = (type: ActionType) => {
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white', text: 'text-gray-900' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <Loader2 size={40} className="animate-spin text-neon-cyan" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan opacity-40 text-center">NEXUS_DEPLOYMENT...</p>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* 1. ACTIONS RAPIDES (Remontées tout en haut) */}
      <ActionCenter isPro={isPro} onAction={handleOpenAction} />

      {/* ALERTES DÉFIS (Radar) */}
      {activeWidget?.type === 'CHALLENGE' && (
        <section className="animate-in slide-in-from-top-4 duration-500">
           <div className="bg-[#0A0A0A] border-2 border-neon-orange rounded-[2rem] p-5 shadow-2xl relative">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl border-2 border-neon-orange bg-black flex items-center justify-center"><Trophy className="text-neon-orange" size={24} /></div>
                 <div className="text-left flex-1 min-w-0">
                    <p className="text-[9px] font-black text-neon-orange uppercase italic">Défi Relevé !</p>
                    <h4 className="text-base font-black text-white uppercase italic truncate">{activeWidget.data.respondent?.clubs?.name}</h4>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                 <button onClick={() => router.push('/comms')} className="bg-white/5 text-white py-3 rounded-xl font-black uppercase text-[8px] border border-white/10">Discuter</button>
                 <button onClick={() => router.push('/radar')} className="bg-neon-orange text-black py-3 rounded-xl font-black uppercase text-[8px] shadow-lg">Accepter</button>
              </div>
           </div>
        </section>
      )}

      {/* 2. CARROUSEL TIMELINE (Missions) */}
      <section className="space-y-3 text-left">
        <div className="flex justify-between items-center px-1">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Missions_&_Événements</h3>
           <Link href="/events" className="text-[9px] font-black text-neon-cyan uppercase underline italic">Tout voir</Link>
        </div>

        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-4 px-4 pb-2">
          {events.length > 0 ? events.map((ev, i) => {
            const mStyle = getStyle(ev);
            const isMatch = ev.type?.toLowerCase().includes('match');
            return (
              <div
                key={i}
                onClick={() => router.push('/events')}
                className={`min-w-[85%] snap-center relative rounded-[3rem] overflow-hidden border-4 ${mStyle.border} ${mStyle.glow} h-[310px] flex flex-col justify-between group transition-all active:scale-[0.98] cursor-pointer`}
              >
                 {isMatch ? (
                   <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                   </div>
                 ) : (
                   <div className="absolute inset-0 bg-[#0A0A0A]" />
                 )}

                 <div className="relative z-10 p-6 flex flex-col h-full justify-between text-center">
                    <div className="flex justify-center">
                       <div className="px-6 py-2.5 rounded-full border-2 border-white/20 bg-black/60 text-[11px] font-black uppercase tracking-[0.2em] text-neon-cyan backdrop-blur-md shadow-2xl">
                          {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {ev.time}
                       </div>
                    </div>

                    {isMatch ? (
                      <div className="flex justify-center items-center gap-2 my-auto">
                         <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-20 h-20 rounded-3xl border-2 border-white/10 bg-black/40 p-3 flex items-center justify-center backdrop-blur-md overflow-hidden shadow-2xl">
                               {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" alt="" /> : <Shield size={36} className="text-gray-600" />}
                            </div>
                            <p className="text-[10px] font-black uppercase italic text-white drop-shadow-2xl line-clamp-1">{teamInfo?.clubName}</p>
                         </div>
                         <div className="text-4xl font-black italic text-white/30 tracking-tighter transform -rotate-12 px-2">VS</div>
                         <div className="flex flex-col items-center gap-3 flex-1">
                            <div className="w-20 h-20 rounded-3xl border-2 border-white/10 bg-black/40 p-3 flex items-center justify-center backdrop-blur-md overflow-hidden shadow-2xl">
                               {ev.away_club?.logo_url ? <img src={ev.away_club.logo_url} className="w-full h-full object-contain" alt="" /> : <Shield size={36} className="text-gray-600" />}
                            </div>
                            <p className="text-[10px] font-black uppercase italic text-white drop-shadow-2xl line-clamp-1">{ev.away_club?.name || 'ADV'}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-6 my-auto">
                         <div className={`w-18 h-18 rounded-full bg-white/5 border-4 ${mStyle.border} flex items-center justify-center ${mStyle.color} shadow-2xl`}>
                            {ev.type === 'training' ? <Target size={40} /> : <Trophy size={40} />}
                         </div>
                         <h4 className="text-3xl font-black text-white uppercase italic leading-none drop-shadow-2xl">{ev.title}</h4>
                      </div>
                    )}

                    <div className={`flex items-center justify-center gap-3 text-xs font-black text-white uppercase tracking-[0.2em] drop-shadow-2xl bg-black/50 py-4 rounded-[1.8rem] backdrop-blur-md border ${mStyle.border} mt-auto shadow-xl`}>
                       <MapPin size={18} className={mStyle.color} strokeWidth={3} />
                       <span className="truncate">{ev.location}</span>
                    </div>
                 </div>
              </div>
            );
          }) : (
            <Link href="/events/new" className="min-w-[85%] snap-center block p-12 border-2 border-dashed border-white/10 rounded-[2.5rem] text-center opacity-30 active:scale-95">
               <Plus size={32} className="mx-auto mb-2 text-neon-cyan" />
               <p className="text-[9px] font-black uppercase tracking-widest text-center w-full">Initialiser Mission...</p>
            </Link>
          )}
        </div>
      </section>

      {/* 3. VUE EFFECTIF (Bas de page) */}
      <SquadOverview players={squad} selectedIds={[]} onSelect={() => {}} isPro={isPro} />

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
