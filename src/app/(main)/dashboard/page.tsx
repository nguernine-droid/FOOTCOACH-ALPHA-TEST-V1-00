'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Radar, Calendar, MessageCircle, Trophy,
  CheckCircle2, Zap, ChevronRight, Shield, MapPin,
  Clock, Bell, ArrowRight, Target, Star
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

/**
 * DASHBOARD V2 — HUB DE COMMANDE
 * Évolutif : prêt pour Live Match, Feed X, Stories Instagram
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

  const [nextEvent, setNextEvent]         = useState<any>(null);
  const [radarCount, setRadarCount]       = useState(0);
  const [chatCount, setChatCount]         = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [filItems, setFilItems]           = useState<FilItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // KPIs
  const [kpis, setKpis] = useState({
    matchsJoues:     0,   // events de type match avec status finished
    annoncesPubliees: 0,  // mes match_requests
    matchsValides:   0,   // mes annonces MATCHED
    tauxDispo:       0,   // % présents sur mes événements
  });

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // 1. Prochain événement
      const { data: evts } = await supabase
        .from('events')
        .select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)')
        .is('deleted_at', null)
        .gte('date', today)
        .in('status', ['scheduled', 'live'])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(1);
      if (evts?.[0]) setNextEvent(evts[0]);

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

      // 4. Compteur messages non lus (conversations actives)
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
        // Matchs joués (events finished)
        supabase.from('events')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'match')
          .eq('status', 'finished')
          .is('deleted_at', null),
        // Annonces publiées (toutes mes match_requests)
        supabase.from('match_requests')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', user.id)
          .is('deleted_at', null),
        // Matchs validés via Radar
        supabase.from('match_requests')
          .select('*', { count: 'exact', head: true })
          .or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`)
          .eq('status', 'MATCHED'),
        // Taux de dispo : présents sur mes événements
        supabase.from('event_attendees')
          .select('status, events!inner(created_by)')
          .eq('events.created_by', user.id),
      ]);

      // Calcul taux présence
      const total   = dispoData?.length || 0;
      const present = dispoData?.filter((d: any) => d.status === 'present').length || 0;
      const taux    = total > 0 ? Math.round((present / total) * 100) : 0;

      setKpis({
        matchsJoues:      matchsJoues   || 0,
        annoncesPubliees: annoncesPubliees || 0,
        matchsValides:    matchsValides  || 0,
        tauxDispo:        taux,
      });

      // 6. Fil d'info — derniers événements significatifs
      const fil: FilItem[] = [];

      // Matchs validés récents
      const { data: matched } = await supabase
        .from('match_requests')
        .select('id, type, date, category')
        .or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`)
        .eq('status', 'MATCHED')
        .order('date', { ascending: false })
        .limit(2);
      matched?.forEach(m => fil.push({
        id: m.id,
        type: 'match_validé',
        title: `${m.type} validé`,
        subtitle: `Catégorie ${m.category} · ${m.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Flexible'}`,
        date: m.date,
        route: '/radar',
      }));

      // Événements créés récemment
      const { data: recentEvts } = await supabase
        .from('events')
        .select('id, title, type, date, time')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3);
      recentEvts?.forEach(e => fil.push({
        id: e.id,
        type: 'event_créé',
        title: e.title,
        subtitle: `${e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''} · ${e.time?.slice(0,5) || ''}`,
        date: e.date,
        route: `/events/${e.id}`,
      }));

      // Annonces proches dans ma catégorie
      const { data: nearAds } = await supabase
        .from('match_requests')
        .select('id, type, category, city')
        .eq('status', 'OPEN')
        .neq('coach_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(2);
      nearAds?.forEach(a => fil.push({
        id: a.id,
        type: 'annonce_proche',
        title: `Nouvelle annonce ${a.type}`,
        subtitle: `${a.category || ''} · ${a.city || 'Lieu non précisé'}`,
        date: '',
        route: '/radar',
      }));

      // Trier par date décroissante
      fil.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setFilItems(fil.slice(0, 6));

    } catch (err) { console.error(err); }
    finally { setIsDataLoading(false); }
  }, [teamInfo?.category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = isPro
    ? { bg: 'bg-gray-50', card: 'bg-white border-gray-100', text: 'text-gray-900', sub: 'text-gray-400', accent: 'text-orange-600', accentBg: 'bg-orange-50', border: 'border-orange-200' }
    : { bg: 'bg-[#050510]', card: 'bg-white/5 border-white/10', text: 'text-white', sub: 'text-gray-500', accent: 'text-neon-cyan', accentBg: 'bg-neon-cyan/10', border: 'border-neon-cyan/30' };

  if (isContextLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-neon-cyan" size={40} />
    </div>
  );

  const filIcon = (type: FilItem['type']) => {
    switch (type) {
      case 'match_validé':    return <CheckCircle2 size={16} className="text-green-500" />;
      case 'event_créé':      return <Calendar size={16} className="text-sky-400" />;
      case 'annonce_proche':  return <Radar size={16} className="text-orange-500" />;
      case 'message_reçu':    return <MessageCircle size={16} className="text-purple-400" />;
      case 'résultat':        return <Trophy size={16} className="text-yellow-400" />;
    }
  };

  return (
    <div className={`min-h-screen pb-32 ${s.bg} transition-colors duration-500`}>
      <div className="max-w-md mx-auto px-4 pt-5 space-y-6">

        {/* ══════════════════════════════════════
            BLOC 1 — IDENTITÉ COACH
        ══════════════════════════════════════ */}
        <section className={`rounded-3xl border p-5 flex items-center gap-4 ${s.card}`}>
          <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center shrink-0 ${isPro ? 'border-orange-200 bg-orange-50' : 'border-neon-cyan/30 bg-neon-cyan/10'}`}>
            {teamInfo?.clubLogo
              ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain p-1" />
              : <Shield size={24} className={s.accent} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black uppercase italic tracking-tight ${s.text}`}>
              {teamInfo?.clubName || 'Mon Club'}
            </p>
            <p className={`text-[10px] font-bold uppercase ${s.sub}`}>
              {teamInfo?.category} · {teamInfo?.level}
            </p>
            <p className={`text-[10px] font-black uppercase mt-0.5 ${s.accent}`}>
              {isPro ? `Coach ${teamInfo?.coachName}` : `Cmd. ${teamInfo?.coachName}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className={`p-2 rounded-xl ${s.accentBg} ${s.accent}`}
          >
            <ChevronRight size={18} />
          </button>
        </section>

        {/* ══════════════════════════════════════
            BLOC 2A — PROCHAIN ÉVÉNEMENT
        ══════════════════════════════════════ */}
        <section className="space-y-3">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] px-1 ${s.sub}`}>
            {isPro ? 'Prochain événement' : 'Prochaine mission'}
          </h3>

          {isDataLoading ? (
            <div className={`rounded-3xl border p-8 flex items-center justify-center ${s.card}`}>
              <Loader2 size={24} className={`animate-spin ${s.accent}`} />
            </div>
          ) : nextEvent ? (
            <div
              onClick={() => router.push(`/events/${nextEvent.id}`)}
              className={`rounded-3xl border-2 overflow-hidden cursor-pointer active:scale-[0.98] transition-all shadow-lg ${
                nextEvent.type === 'match'
                  ? 'border-[#39FF14]/40 shadow-[0_0_20px_#39FF1420]'
                  : `${s.border}`
              }`}
            >
              {/* Background image pour les matchs */}
              <div className="relative h-[180px]">
                {nextEvent.type === 'match' && (
                  <div className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }} />
                )}
                <div className={`absolute inset-0 ${isPro ? 'bg-white' : 'bg-[#0A0A0A]'}`}
                  style={{ opacity: nextEvent.type === 'match' ? 0.7 : 1 }} />

                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                  {/* Date + heure */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${s.border} ${s.accent} ${s.accentBg}`}>
                      {new Date(nextEvent.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`text-[10px] font-black flex items-center gap-1 ${s.sub}`}>
                      <Clock size={12} /> {nextEvent.time?.slice(0,5)}
                    </span>
                  </div>

                  {/* Contenu central */}
                  {nextEvent.type === 'match' ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-16 h-16 rounded-2xl border-2 p-2 flex items-center justify-center ${isPro ? 'bg-white border-gray-100' : 'bg-black/40 border-white/20'}`}>
                          {nextEvent.home_club?.logo_url
                            ? <img src={nextEvent.home_club.logo_url} className="w-full h-full object-contain" />
                            : <Shield size={20} className={s.sub} />}
                        </div>
                        <p className={`text-[8px] font-black uppercase text-center line-clamp-1 ${s.text}`}>
                          {nextEvent.home_club?.name || 'Domicile'}
                        </p>
                      </div>
                      <span className={`text-2xl font-black italic opacity-30 ${s.text}`}>VS</span>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-16 h-16 rounded-2xl border-2 p-2 flex items-center justify-center ${isPro ? 'bg-white border-gray-100' : 'bg-black/40 border-white/20'}`}>
                          {nextEvent.away_club?.logo_url
                            ? <img src={nextEvent.away_club.logo_url} className="w-full h-full object-contain" />
                            : <Shield size={20} className={s.sub} />}
                        </div>
                        <p className={`text-[8px] font-black uppercase text-center line-clamp-1 ${s.text}`}>
                          {nextEvent.away_club?.name || 'Extérieur'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Target size={32} className={s.accent} />
                      <p className={`text-lg font-black uppercase italic ${s.text}`}>{nextEvent.title}</p>
                    </div>
                  )}

                  {/* Lieu */}
                  <div className={`flex items-center justify-center gap-2 text-[10px] font-bold uppercase ${s.sub}`}>
                    <MapPin size={12} className={s.accent} />
                    {nextEvent.stadium_name || nextEvent.city || nextEvent.location || 'Lieu à définir'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => router.push('/events/new')}
              className={`rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer active:scale-[0.98] transition-all ${s.card}`}
            >
              <Calendar size={28} className={`mx-auto mb-2 ${s.sub}`} />
              <p className={`text-[11px] font-black uppercase ${s.sub}`}>
                {isPro ? 'Aucun événement planifié' : 'Aucune mission programmée'}
              </p>
              <p className={`text-[10px] font-bold mt-1 ${s.accent}`}>
                {isPro ? 'Créer un événement →' : 'Planifier une mission →'}
              </p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════
            BLOC 2B — COMPTEURS TEMPS RÉEL
        ══════════════════════════════════════ */}
        <section className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Radar size={20} className={radarCount > 0 ? 'text-orange-500' : s.sub} />,
              count: radarCount,
              label: isPro ? 'Annonces' : 'Signaux',
              sublabel: isPro ? 'en cours' : 'actifs',
              route: '/radar',
              alert: radarCount > 0,
            },
            {
              icon: <MessageCircle size={20} className={chatCount > 0 ? 'text-purple-400' : s.sub} />,
              count: chatCount,
              label: 'Chats',
              sublabel: isPro ? 'en cours' : 'actifs',
              route: '/radar',
              alert: false,
            },
            {
              icon: <Bell size={20} className={responseCount > 0 ? 'text-green-500' : s.sub} />,
              count: responseCount,
              label: isPro ? 'Réponses' : 'Réponses',
              sublabel: 'reçues',
              route: '/radar',
              alert: responseCount > 0,
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => router.push(item.route)}
              className={`rounded-2xl border p-4 flex flex-col items-center gap-1 active:scale-95 transition-all ${s.card}
                ${item.alert ? `${s.border} shadow-md` : ''}`}
            >
              {item.icon}
              <span className={`text-2xl font-black ${item.alert ? s.accent : s.text}`}>
                {item.count}
              </span>
              <span className={`text-[8px] font-black uppercase tracking-widest ${item.alert ? s.accent : s.sub}`}>
                {item.label}
              </span>
              <span className={`text-[7px] font-bold uppercase ${s.sub} opacity-60`}>
                {item.sublabel}
              </span>
            </button>
          ))}
        </section>

        {/* ══════════════════════════════════════
            BLOC 2C — KPIs SAISON
        ══════════════════════════════════════ */}
        <section className="space-y-3">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] px-1 ${s.sub}`}>
            {isPro ? 'Ma saison' : 'Stats_Saison'}
          </h3>
          <div className={`rounded-3xl border overflow-hidden ${s.card}`}>
            <div className="grid grid-cols-2 divide-x divide-y">
              {[
                {
                  value: kpis.matchsJoues,
                  label: isPro ? 'Matchs joués' : 'Combats',
                  icon: <Trophy size={18} className="text-yellow-400" />,
                  color: 'text-yellow-400',
                },
                {
                  value: kpis.matchsValides,
                  label: isPro ? 'Via Radar' : 'Défis validés',
                  icon: <CheckCircle2 size={18} className="text-green-500" />,
                  color: 'text-green-500',
                },
                {
                  value: kpis.annoncesPubliees,
                  label: isPro ? 'Annonces publiées' : 'Signaux émis',
                  icon: <Radar size={18} className="text-orange-500" />,
                  color: 'text-orange-500',
                },
                {
                  value: kpis.tauxDispo > 0 ? `${kpis.tauxDispo}%` : '—',
                  label: isPro ? 'Taux présence' : 'Présence',
                  icon: <Zap size={18} className="text-sky-400" />,
                  color: 'text-sky-400',
                },
              ].map((kpi, i) => (
                <div key={i} className={`p-5 flex flex-col items-center gap-2 ${isPro ? 'divide-gray-50' : 'divide-white/5'}`}>
                  {kpi.icon}
                  <span className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</span>
                  <span className={`text-[9px] font-black uppercase text-center ${s.sub}`}>{kpi.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            BLOC 3 — FIL D'INFO (type X — V2)
            Évolutif : commentaires, live, stories
        ══════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${s.sub}`}>
              {isPro ? 'Fil d\'info' : 'Signal_Feed'}
            </h3>
            {/* V2 : badge "LIVE" si match en cours */}
            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${s.accentBg} ${s.accent}`}>
              {isPro ? 'En direct' : 'Live_Feed'} ·  V2
            </span>
          </div>

          {isDataLoading ? (
            <div className={`rounded-3xl border p-8 flex items-center justify-center ${s.card}`}>
              <Loader2 size={20} className={`animate-spin ${s.accent}`} />
            </div>
          ) : filItems.length === 0 ? (
            <div className={`rounded-3xl border-2 border-dashed p-8 text-center ${s.card}`}>
              <Zap size={24} className={`mx-auto mb-2 ${s.sub}`} />
              <p className={`text-[11px] font-black uppercase ${s.sub}`}>
                {isPro ? 'Aucune activité récente' : 'Aucun signal reçu'}
              </p>
            </div>
          ) : (
            <div className={`rounded-3xl border overflow-hidden divide-y ${s.card} ${isPro ? 'divide-gray-50' : 'divide-white/5'}`}>
              {filItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.route && router.push(item.route)}
                  className={`w-full px-5 py-4 flex items-center gap-3 text-left active:scale-[0.98] transition-all ${isPro ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.accentBg}`}>
                    {filIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase italic truncate ${s.text}`}>{item.title}</p>
                    <p className={`text-[9px] font-bold uppercase ${s.sub}`}>{item.subtitle}</p>
                  </div>
                  <ArrowRight size={14} className={`shrink-0 ${s.sub} opacity-50`} />
                </button>
              ))}

              {/* Placeholder V2 — feed social */}
              <div className={`px-5 py-4 flex items-center gap-3 opacity-30`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.accentBg}`}>
                  <MessageCircle size={16} className={s.accent} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase italic ${s.text}`}>
                    {isPro ? 'Commentaires & Live match' : 'Live_Chat_V2'}
                  </p>
                  <p className={`text-[9px] font-bold uppercase ${s.sub}`}>
                    Disponible en V2
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
