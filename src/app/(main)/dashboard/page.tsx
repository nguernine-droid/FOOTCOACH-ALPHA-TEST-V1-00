'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Radar, Calendar, MessageCircle, Trophy,
  CheckCircle2, Zap, ChevronRight, Shield, MapPin,
  Clock, Bell, ArrowRight, Target, Star, Radio, History
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

/**
 * DASHBOARD V4 — EXACT IMAGE REPLICA
 * Carousel de missions avec layout éclaté : Date (Gauche), Heure (Droite), Lieu (Bas).
 */

interface FilItem {
  id: string;
  type: 'match_validé' | 'event_créé' | 'annonce_proche' | 'message_reçu' | 'résultat';
  title: string;
  subtitle: string;
  date: string;
  route?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { teamInfo, theme, isLoading: isContextLoading } = useTeam();
  const isPro = theme === 'classic';
  const scrollRef = useRef<HTMLDivElement>(null);

  const [events, setEvents]             = useState<any[]>([]);
  const [radarCount, setRadarCount]       = useState(0);
  const [chatCount, setChatCount]         = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [filItems, setFilItems]           = useState<FilItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [kpis, setKpis] = useState({ matchsJoues: 0, annoncesPubliees: 0, matchsValides: 0, tauxDispo: 0 });

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allEvts } = await supabase
        .from('events')
        .select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)')
        .is('deleted_at', null)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      const uniqueEvts = (allEvts || []).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setEvents(uniqueEvts);

      const { count: rc } = await supabase.from('match_requests').select('*', { count: 'exact', head: true }).eq('status', 'OPEN').neq('coach_id', user.id).is('deleted_at', null);
      setRadarCount(rc || 0);

      const { count: resp } = await supabase.from('match_requests').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'POSTMATCHED');
      setResponseCount(resp || 0);

      const { data: myReqs } = await supabase.from('match_requests').select('id').or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`).in('status', ['POSTMATCHED', 'PENDING', 'MATCHED']);
      setChatCount(myReqs?.length || 0);

      const [ { count: mj }, { count: ap }, { count: mv }, { data: dispo } ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('type', 'match').eq('status', 'finished').is('deleted_at', null),
        supabase.from('match_requests').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).is('deleted_at', null),
        supabase.from('match_requests').select('*', { count: 'exact', head: true }).or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`).eq('status', 'MATCHED'),
        supabase.from('event_attendees').select('status, events!inner(created_by)').eq('events.created_by', user.id),
      ]);

      const total = dispo?.length || 0;
      const present = dispo?.filter((d: any) => d.status === 'present').length || 0;
      setKpis({ matchsJoues: mj || 0, annoncesPubliees: ap || 0, matchsValides: mv || 0, tauxDispo: total > 0 ? Math.round((present/total)*100) : 0 });

    } catch (err) { console.error(err); }
    finally { setIsDataLoading(false); }
  }, [teamInfo?.category]);

  useEffect(() => {
    if (events.length > 0 && scrollRef.current) {
      const today = new Date().toISOString().split('T')[0];
      const nextIdx = events.findIndex(e => e.date >= today);
      const targetIdx = nextIdx === -1 ? events.length - 1 : nextIdx;
      setTimeout(() => {
        if (scrollRef.current) {
           const cardWidth = scrollRef.current.offsetWidth * 0.85;
           scrollRef.current.scrollTo({ left: targetIdx * (cardWidth + 16), behavior: 'smooth' });
        }
      }, 600);
    }
  }, [events]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = isPro
    ? { bg: 'bg-gray-50', card: 'bg-white border-gray-100', text: 'text-gray-900', sub: 'text-gray-400', accent: 'text-orange-600', accentBg: 'bg-orange-50', border: 'border-orange-200' }
    : { bg: 'bg-[#050510]', card: 'bg-white/5 border-white/10', text: 'text-white', sub: 'text-gray-500', accent: 'text-neon-cyan', accentBg: 'bg-neon-cyan/10', border: 'border-neon-cyan/30' };

  if (isContextLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-neon-cyan" size={40} /></div>;

  const todayStr = new Date().toISOString().split('T')[0];

  const getEventStyle = (ev: any, isNext: boolean, isPast: boolean) => {
    const type = ev.type?.toLowerCase() || '';
    const isOfficial = ev.tournament_config?.is_official === true;
    let base = { color: 'text-sky-400', bg: 'bg-sky-500', border: 'border-sky-500/20', glow: '' };
    if (isOfficial) base = { color: 'text-orange-500', bg: 'bg-orange-600', border: 'border-orange-500/20', glow: isNext ? 'shadow-[0_20px_50px_rgba(249,115,22,0.15)]' : 'shadow-xl' };
    else if (type.includes('match')) base = { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', border: 'border-[#39FF14]/20', glow: isNext ? 'shadow-[0_20px_50px_rgba(57,255,20,0.15)]' : 'shadow-xl' };
    else if (type.includes('plateau')) base = { color: 'text-purple-500', bg: 'bg-purple-600', border: 'border-purple-500/20', glow: isNext ? 'shadow-[0_20px_50px_rgba(168,85,247,0.15)]' : 'shadow-xl' };
    if (isPast) return { ...base, border: 'border-white/5', glow: '', color: 'text-gray-500', bg: 'bg-gray-700' };
    return base;
  };

  return (
    <div className={`min-h-screen pb-40 ${s.bg} transition-colors duration-500`}>
      <div className="max-w-md mx-auto px-4 pt-5 space-y-6">

        {/* 1. RÉSUMÉ CLUB */}
        <section className={`rounded-[2.5rem] border p-5 flex items-center gap-4 ${s.card} shadow-sm active:scale-95 transition-all`} onClick={() => router.push('/profile')}>
          <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center shrink-0 ${isPro ? 'border-orange-100 bg-orange-50' : 'border-neon-cyan/30 bg-neon-cyan/10'}`}>
            {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain p-1" /> : <Shield size={24} className={s.accent} />}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-xs font-black uppercase italic tracking-tight ${s.text}`}>{teamInfo?.clubAcronym || teamInfo?.clubName || 'Mon Club'}</p>
            <p className={`text-[9px] font-bold uppercase ${s.sub}`}>{teamInfo?.category} · {teamInfo?.level}</p>
            <p className={`text-[9px] font-black uppercase mt-0.5 ${s.accent}`}>{isPro ? `Coach ${teamInfo?.coachName}` : `Cmd. ${teamInfo?.coachName}`}</p>
          </div>
          <ChevronRight size={18} className={s.sub} />
        </section>

        {/* 2. CAROUSEL CHRONOLOGIQUE (DESIGN REPLICA) */}
        <section className="space-y-4">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] px-1 ${s.sub}`}>Prochain événement</h3>

          <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-4 px-4 pb-4">
            {events.length > 0 ? events.map((ev, i) => {
              const isPast = ev.date < todayStr;
              const isNext = ev.date === events.find(e => e.date >= todayStr)?.date && ev.id === events.find(e => e.date >= todayStr)?.id;
              const style = getEventStyle(ev, isNext, isPast);
              const isMatch = ev.type?.toLowerCase().includes('match');

              return (
                <div
                  key={i}
                  onClick={() => router.push(`/events/${ev.id}`)}
                  className={`min-w-[85%] snap-center relative rounded-[3rem] overflow-hidden border-2 ${style.border} ${style.glow} h-[320px] flex flex-col transition-all duration-500 ${isPast ? 'opacity-40 grayscale' : ''}`}
                >
                   <div className="absolute inset-0 bg-white" />

                   <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                      {/* HEADER ÉCLATÉ (REPLICA) */}
                      <div className="flex justify-between items-start">
                         <div className={`px-4 py-1.5 rounded-full ${s.accentBg} border ${style.border} text-[10px] font-black uppercase tracking-widest ${s.accent}`}>
                            {new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                         </div>
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                            <Clock size={14} /> {ev.time.slice(0,5)}
                         </div>
                      </div>

                      {/* CENTRE (REPLICA) */}
                      <div className="flex flex-col items-center gap-6">
                         {isMatch ? (
                            <div className="flex items-center justify-center gap-4 w-full">
                               <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center shadow-inner">
                                  <img src={ev.home_club?.logo_url} className="w-full h-full object-contain" />
                               </div>
                               <span className="text-2xl font-black italic text-gray-200 transform -rotate-12">VS</span>
                               <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center shadow-inner">
                                  <img src={ev.away_club?.logo_url} className="w-full h-full object-contain" />
                               </div>
                            </div>
                         ) : (
                            <div className={`w-16 h-16 rounded-full border-4 ${style.border} ${s.accentBg} flex items-center justify-center ${s.accent} shadow-inner`}>
                               <Target size={32} />
                            </div>
                         )}
                         <h4 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 text-center leading-none drop-shadow-sm">{ev.title}</h4>
                      </div>

                      {/* PIED DE CARTE (REPLICA) */}
                      <div className="flex flex-col items-center gap-2">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">
                            <MapPin size={12} className={s.accent} /> {ev.city || ev.stadium_name || 'SETE'}
                         </div>
                      </div>
                   </div>
                </div>
              );
            }) : (
              <div className="min-w-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200 shadow-inner"><p className="text-[10px] font-black text-gray-300 uppercase">Aucune mission planifiée</p></div>
            )}
          </div>
        </section>

        {/* 3. COMPTEURS TEMPS RÉEL */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { icon: <Radio size={20} className={radarCount > 0 ? 'text-orange-500' : s.sub} />, count: radarCount, label: 'Signaux', alert: radarCount > 0 },
            { icon: <MessageCircle size={20} className={chatCount > 0 ? 'text-purple-400' : s.sub} />, count: chatCount, label: 'Chats', alert: false },
            { icon: <Bell size={20} className={responseCount > 0 ? 'text-green-500' : s.sub} />, count: responseCount, label: 'Réponses', alert: responseCount > 0 },
          ].map((item, i) => (
            <button key={i} onClick={() => router.push('/radar')} className={`rounded-[2rem] border p-4 flex flex-col items-center gap-1 active:scale-95 transition-all ${s.card} ${item.alert ? `border-orange-200 shadow-md` : 'shadow-sm'}`}>
              {item.icon}
              <span className={`text-2xl font-black ${item.alert ? s.accent : s.text}`}>{item.count}</span>
              <span className={`text-[8px] font-black uppercase tracking-widest ${item.alert ? s.accent : s.sub}`}>{item.label}</span>
              <p className="text-[6px] font-bold text-gray-400 uppercase opacity-40">{item.count > 1 ? 'en cours' : 'actif'}</p>
            </button>
          ))}
        </section>

        {/* 4. KPIs SAISON */}
        <section className="space-y-3">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] px-1 ${s.sub}`}>Ma saison</h3>
          <div className={`rounded-[2.5rem] border overflow-hidden ${s.card} shadow-sm`}>
            <div className="grid grid-cols-2 divide-x divide-y border-collapse">
              {[
                { value: kpis.matchsJoues, label: 'Matchs joués', icon: <Trophy size={18} className="text-yellow-400" />, color: 'text-yellow-400' },
                { value: kpis.matchsValides, label: 'Via Radar', icon: <CheckCircle2 size={18} className="text-green-500" />, color: 'text-green-500' },
                { value: kpis.annoncesPubliees, label: 'Annonces publiées', icon: <Radar size={18} className="text-orange-500" />, color: 'text-orange-500' },
                { value: kpis.tauxDispo > 0 ? `${kpis.tauxDispo}%` : '—', label: 'Taux présence', icon: <Zap size={18} className="text-sky-400" />, color: 'text-sky-400' },
              ].map((kpi, i) => (
                <div key={i} className="p-5 flex flex-col items-center gap-2">
                  {kpi.icon}
                  <span className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</span>
                  <span className={`text-[9px] font-black uppercase text-center ${s.sub}`}>{kpi.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
