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
 * DASHBOARD V3 — TIMELINE CAROUSEL
 * Système de navigation temporelle : Swipe gauche (Passé) / Swipe droite (Futur).
 * Centrage automatique sur l'objectif prioritaire.
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

  // KPIs
  const [kpis, setKpis] = useState({
    matchsJoues:     0,
    annoncesPubliees: 0,
    matchsValides:   0,
    tauxDispo:       0,
  });

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Récupération de TOUS les événements pour le Carousel
      const { data: allEvts } = await supabase
        .from('events')
        .select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)')
        .is('deleted_at', null)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      const uniqueEvts = (allEvts || []).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setEvents(uniqueEvts);

      // 2. Compteur Radar (annonces OPEN dans ma catégorie)
      const { count: rc } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .neq('coach_id', user.id)
        .is('deleted_at', null);
      setRadarCount(rc || 0);

      // 3. Compteur réponses sur mes annonces (POSTMATCHED)
      const { count: resp } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .eq('status', 'POSTMATCHED');
      setResponseCount(resp || 0);

      // 4. Compteur messages (conversations actives)
      const { data: myReqs } = await supabase
        .from('match_requests')
        .select('id')
        .or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`)
        .in('status', ['POSTMATCHED', 'PENDING', 'MATCHED']);
      setChatCount(myReqs?.length || 0);

      // 5. KPIs réels
      const [
        { count: matchsJoues },
        { count: annoncesPubliees },
        { count: matchsValides },
        { data: dispoData },
      ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('type', 'match').eq('status', 'finished').is('deleted_at', null),
        supabase.from('match_requests').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).is('deleted_at', null),
        supabase.from('match_requests').select('*', { count: 'exact', head: true }).or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`).eq('status', 'MATCHED'),
        supabase.from('event_attendees').select('status, events!inner(created_by)').eq('events.created_by', user.id),
      ]);

      const total   = dispoData?.length || 0;
      const present = dispoData?.filter((d: any) => d.status === 'present').length || 0;
      const taux    = total > 0 ? Math.round((present / total) * 100) : 0;

      setKpis({ matchsJoues: matchsJoues || 0, annoncesPubliees: annoncesPubliees || 0, matchsValides: matchsValides || 0, tauxDispo: taux });

    } catch (err) { console.error(err); }
    finally { setIsDataLoading(false); }
  }, [teamInfo?.category]);

  // --- MOTEUR DE CENTRAGE AUTOMATIQUE ---
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
    if (isOfficial) base = { color: 'text-orange-500', bg: 'bg-orange-600', border: 'border-orange-500/40', glow: isNext ? 'shadow-[0_0_40px_rgba(249,115,22,0.4)]' : '' };
    else if (type.includes('match')) base = { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', border: 'border-[#39FF14]/40', glow: isNext ? 'shadow-[0_0_40px_rgba(57,255,20,0.4)]' : '' };
    else if (type.includes('plateau')) base = { color: 'text-purple-500', bg: 'bg-purple-600', border: 'border-purple-500/40', glow: isNext ? 'shadow-[0_0_40px_rgba(168,85,247,0.4)]' : '' };
    if (isPast) return { ...base, border: 'border-white/5', glow: '', color: 'text-gray-500', bg: 'bg-gray-700' };
    return base;
  };

  return (
    <div className={`min-h-screen pb-32 ${s.bg} transition-colors duration-500`}>
      <div className="max-w-md mx-auto px-4 pt-5 space-y-6">

        {/* 1. IDENTITÉ COACH */}
        <section className={`rounded-3xl border p-5 flex items-center gap-4 ${s.card}`} onClick={() => router.push('/profile')}>
          <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center shrink-0 ${isPro ? 'border-orange-200 bg-orange-50' : 'border-neon-cyan/30 bg-neon-cyan/10'}`}>
            {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain p-1" /> : <Shield size={24} className={s.accent} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black uppercase italic tracking-tight ${s.text}`}>{teamInfo?.clubAcronym || teamInfo?.clubName || 'Mon Club'}</p>
            <p className={`text-[10px] font-bold uppercase ${s.sub}`}>{teamInfo?.category} · {teamInfo?.level}</p>
            <p className={`text-[10px] font-black uppercase mt-0.5 ${s.accent}`}>{isPro ? `Coach ${teamInfo?.coachName}` : `Cmd. ${teamInfo?.coachName}`}</p>
          </div>
          <ChevronRight size={18} className={s.sub} />
        </section>

        {/* 2. CAROUSEL TACTIQUE (TIMELINE) */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
             <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${s.sub}`}>{isPro ? 'Timeline Missions' : 'Mission_Carousel'}</h3>
             <div className="flex gap-1 opacity-30"><div className="w-1 h-1 rounded-full bg-current"/><div className="w-2 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/></div>
          </div>

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
                  className={`min-w-[85%] snap-center relative rounded-[3rem] overflow-hidden border-4 ${style.border} ${style.glow} h-[320px] flex flex-col justify-between transition-all duration-500 shadow-2xl ${isPast ? 'opacity-40 grayscale-[0.5]' : ''}`}
                >
                   <div className={`absolute inset-0 ${isPast ? 'bg-gray-100' : (isPro ? 'bg-white' : 'bg-[#0A0A0A]')}`} />

                   <div className="relative z-10 p-6 flex flex-col h-full justify-between text-center">
                      <div className="flex justify-center">
                         <div className={`px-5 py-2 rounded-full border-2 ${isPast ? 'bg-gray-200 border-gray-300 text-gray-500' : `${s.accentBg} ${style.border} ${style.color}`} text-[11px] font-black uppercase tracking-[0.2em] shadow-sm`}>
                            {new Date(ev.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {ev.time.slice(0,5)}
                         </div>
                      </div>

                      {isMatch ? (
                        <div className="flex items-center justify-center gap-3">
                           <div className="flex flex-col items-center gap-1 flex-1">
                              <div className="w-14 h-14 rounded-2xl bg-black/5 p-2 flex items-center justify-center border border-black/5"><img src={ev.home_club?.logo_url} className="w-full h-full object-contain" /></div>
                              <p className={`text-[7px] font-black uppercase line-clamp-1 ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>{ev.home_club?.name}</p>
                           </div>
                           <span className="text-xl font-black italic opacity-20 transform -rotate-12">VS</span>
                           <div className="flex flex-col items-center gap-1 flex-1">
                              <div className="w-14 h-14 rounded-2xl bg-black/5 p-2 flex items-center justify-center border border-black/5"><img src={ev.away_club?.logo_url} className="w-full h-full object-contain" /></div>
                              <p className={`text-[7px] font-black uppercase line-clamp-1 ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>{ev.away_club?.name}</p>
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                           <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${style.border} ${style.color} bg-white/5`}><Target size={32} /></div>
                           <h4 className={`text-xl font-black uppercase italic leading-tight ${isPast ? 'text-gray-400' : s.text}`}>{ev.title}</h4>
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-1">
                         {isPast && <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10}/> Mission_Conclue</p>}
                         <div className={`w-full py-3 rounded-[1.8rem] ${isPast ? 'bg-gray-200' : 'bg-gray-50'} border-2 ${style.border} flex items-center justify-center gap-2 shadow-inner`}>
                            <MapPin size={14} className={style.color} />
                            <span className={`text-xs font-black uppercase italic tracking-widest ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>{ev.stadium_name || ev.city || 'Secteur Alpha'}</span>
                         </div>
                      </div>
                   </div>
                </div>
              );
            }) : (
              <div className="min-w-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200"><p className="text-[10px] font-black text-gray-300 uppercase">Aucune mission planifiée</p></div>
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
            <button key={i} onClick={() => router.push('/radar')} className={`rounded-2xl border p-4 flex flex-col items-center gap-1 active:scale-95 transition-all ${s.card} ${item.alert ? `${s.border} shadow-md` : ''}`}>
              {item.icon}
              <span className={`text-2xl font-black ${item.alert ? s.accent : s.text}`}>{item.count}</span>
              <span className={`text-[8px] font-black uppercase tracking-widest ${item.alert ? s.accent : s.sub}`}>{item.label}</span>
            </button>
          ))}
        </section>

        {/* 4. KPIs SAISON */}
        <section className="space-y-3">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] px-1 ${s.sub}`}>Rapport_Saison</h3>
          <div className={`rounded-3xl border overflow-hidden ${s.card}`}>
            <div className="grid grid-cols-2 divide-x divide-y border-collapse">
              {[
                { value: kpis.matchsJoues, label: 'Combats', icon: <Trophy size={18} className="text-yellow-400" />, color: 'text-yellow-400' },
                { value: kpis.matchsValides, label: 'Défis validés', icon: <CheckCircle2 size={18} className="text-green-500" />, color: 'text-green-500' },
                { value: kpis.annoncesPubliees, label: 'Signaux émis', icon: <Radar size={18} className="text-orange-500" />, color: 'text-orange-500' },
                { value: kpis.tauxDispo > 0 ? `${kpis.tauxDispo}%` : '—', label: 'Présence', icon: <Zap size={18} className="text-sky-400" />, color: 'text-sky-400' },
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
