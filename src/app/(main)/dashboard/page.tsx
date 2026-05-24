'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, ChevronRight, Calendar, Loader2, Trophy, Activity, Zap, Users, Radar, ArrowRight, MessageCircle, X, CheckCircle2, Landmark, Plus, Send, Layers, Timer, Minus, Play, Target, Brain, Flame
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
  const [activeWidget, setActiveWidget] = useState<any>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!teamInfo?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Effectif
      const { data: players } = await supabase.from('club_players').select(`id, poste, status, profiles (id, first_name, last_name, avatar_url)`).eq('club_id', teamInfo.id);
      if (players) setSquad(players.map((p: any) => ({ id: p.profiles?.id, name: `${p.profiles?.first_name} ${p.profiles?.last_name?.charAt(0)}.`, status: p.status === 'Actif' ? 'active' : p.status === 'Inactif' ? 'inactive' : 'doubt', avatarUrl: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.profiles?.id}`, poste: p.poste || 'MIL' })));

      // 2. Intelligence Radar
      const { data: catReqs } = await supabase.from('match_requests').select('type').eq('category', teamInfo.category).eq('status', 'OPEN').neq('coach_id', user.id);
      if (catReqs) setRadarStats({ match: catReqs.filter(r => r.type === 'Match Amical').length, tournament: catReqs.filter(r => r.type === 'Tournoi').length, plateau: catReqs.filter(r => r.type === 'Plateau').length });

      // 3. Priorité Hub
      const today = new Date().toISOString().split('T')[0];
      const { data: response } = await supabase.from('match_requests').select('*, respondent:respondent_id(nickname, first_name, clubs:club_id(name, logo_url))').eq('coach_id', user.id).eq('status', 'PENDING').maybeSingle();
      const { data: future } = await supabase.from('events').select('*, home_club:home_club_id(name, logo_url), away_club:away_club_id(name, logo_url)').gte('date', today).neq('status', 'finished').order('date', { ascending: true }).limit(1);
      const nextEvt = future?.[0];

      if (response && dismissedId !== response.id) {
        setActiveWidget({ type: 'CHALLENGE', data: response });
      } else if (nextEvt) {
        setActiveWidget({ type: 'NEXT', data: nextEvt });
      } else {
        setActiveWidget(null);
      }
    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, [teamInfo?.id, teamInfo?.category, dismissedId]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Configuration visuelle
  const getStyle = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('officiel')) return { color: 'text-orange-500', bg: 'bg-orange-600', glow: 'shadow-[0_0_20px_#f97316]', label: 'COMPÉTITION' };
    if (t.includes('match') || t.includes('amical')) return { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', glow: 'shadow-[0_0_20px_#39FF14]', label: 'AMICAL' };
    if (t.includes('plateau')) return { color: 'text-purple-500', bg: 'bg-purple-600', glow: 'shadow-[0_0_20px_#a855f7]', label: 'PLATEAU' };
    return { color: 'text-sky-400', bg: 'bg-sky-500', glow: 'shadow-[0_0_20px_#0ea5e9]', label: 'ENTRAÎNEMENT' };
  };

  const styles = isPro ? { mainBg: 'bg-gray-50', cardBg: 'bg-white', text: 'text-gray-900' } : { mainBg: 'bg-[#050510]', cardBg: 'bg-white/5 border-white/10', text: 'text-white' };

  if (isContextLoading || (isDataLoading && teamInfo?.id)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <Loader2 size={40} className="animate-spin text-neon-cyan" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neon-cyan opacity-40">NEXUS_LINK_START...</p>
    </div>
  );

  const mStyle = getStyle(activeWidget?.data?.type || '');

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-500 px-4 pt-4 space-y-8 ${styles.mainBg}`}>

      {/* HUB COMMANDEMENT */}
      <section className={`p-6 border rounded-[2.5rem] shadow-xl relative overflow-hidden ${styles.cardBg}`}>
         <div className="relative z-10 text-left">
            <div className="flex justify-between items-center mb-6">
               <div className="text-left"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Unité_Opérationnelle</p><h3 className={`text-xl font-black uppercase italic leading-none mt-1 ${styles.text}`}>Bonjour {teamInfo?.coachName}</h3></div>
               <div className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_10px_#39FF14]" />
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between mb-4">
               <div className="flex items-center gap-3"><Layers size={16} className="text-neon-cyan" /><p className="text-[9px] font-black uppercase text-gray-400">Radar {teamInfo?.category}</p></div>
               <div className="flex gap-4">
                  <div className="text-center"><p className="text-xs font-black text-white">{radarStats.match}</p><p className="text-[6px] text-gray-500 uppercase">Matchs</p></div>
                  <div className="text-center"><p className="text-xs font-black text-white">{radarStats.plateau}</p><p className="text-[6px] text-gray-500 uppercase">Plateaux</p></div>
               </div>
            </div>
         </div>
      </section>

      {/* NEXUS HUB MASTER V14 */}
      <section className="space-y-4 text-left relative">
        <h3 className={`text-[10px] font-black uppercase tracking-widest text-gray-500 px-1`}>
          { activeWidget?.type === 'CHALLENGE' ? '🚩 Alerte_Radar' : '📅 Prochaine_Mission' }
        </h3>

        {activeWidget ? (
          <div className={`relative rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-2xl animate-in zoom-in duration-500`}>

             {/* BACKGROUND STADIUM IMMERSIF */}
             {activeWidget.data.type?.toLowerCase().includes('match') ? (
               <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800)' }}>
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
               </div>
             ) : (
               <div className="absolute inset-0 bg-[#0A0A0A]" />
             )}

             <div className="relative z-10 p-8">
                {/* DATE & HEURE PILULE */}
                <div className="flex justify-between items-start mb-10">
                   <div className="px-4 py-1.5 rounded-full border border-white/20 bg-black/40 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                      {new Date(activeWidget.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase()} // {activeWidget.data.time}
                   </div>
                   <Zap size={20} className={mStyle.color} fill="currentColor" />
                </div>

                {/* DUEL DE BLASONS XXL (Pour les Matchs) */}
                {activeWidget.data.type?.toLowerCase().includes('match') ? (
                  <div className="flex justify-center items-center gap-6 mb-12">
                     <div className="flex flex-col items-center gap-3">
                        <div className={`w-24 h-24 rounded-[2rem] border-2 border-white/20 bg-black/40 p-3 flex items-center justify-center shadow-2xl backdrop-blur-md overflow-hidden`}>
                           {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" /> : <Shield size={48} className="text-gray-600" />}
                        </div>
                        <p className="text-[10px] font-black uppercase italic text-white/50">{teamInfo?.clubName}</p>
                     </div>

                     <div className="text-4xl font-black italic text-white/20 tracking-tighter transform -rotate-12">VS</div>

                     <div className="flex flex-col items-center gap-3">
                        <div className={`w-24 h-24 rounded-[2rem] border-2 border-white/20 bg-black/40 p-3 flex items-center justify-center shadow-2xl backdrop-blur-md overflow-hidden`}>
                           {activeWidget.data.away_club?.logo_url ? <img src={activeWidget.data.away_club.logo_url} className="w-full h-full object-contain" /> : <Shield size={48} className="text-gray-600" />}
                        </div>
                        <p className="text-[10px] font-black uppercase italic text-white/50">{activeWidget.data.away_club?.name || 'Adversaire'}</p>
                     </div>
                  </div>
                ) : (
                  /* AFFICHAGE ENTRAÎNEMENT / PLATEAU */
                  <div className="flex items-center gap-6 mb-12">
                     <div className={`w-20 h-20 rounded-3xl bg-white/5 border-2 border-white/10 flex items-center justify-center ${mStyle.color}`}>
                        {activeWidget.data.type === 'training' ? <Target size={40} /> : <Trophy size={40} />}
                     </div>
                     <div className="text-left">
                        <h4 className="text-4xl font-black italic text-white leading-none uppercase">{activeWidget.data.title || 'Mission'}</h4>
                        <p className={`text-[10px] font-black uppercase mt-2 tracking-widest ${mStyle.color}`}>{mStyle.label}</p>
                     </div>
                  </div>
                )}

                {/* TITRE & LIEU */}
                {activeWidget.data.type?.toLowerCase().includes('match') && (
                   <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-3 text-left">VS {activeWidget.data.away_club?.name || 'ADVERSAIRE'}</h4>
                )}
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-10 text-left">
                   <Landmark size={14} className={mStyle.color} /> {activeWidget.data.location || 'Bassin d\'unité'}
                </div>

                {/* JAUGE DE PUISSANCE BIONIQUE */}
                <div className="space-y-3 mb-10">
                   <div className="flex justify-between items-end px-1">
                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Effectif_Opérationnel</p>
                      <p className={`text-sm font-black ${mStyle.color}`}>0 / {squad.length}</p>
                   </div>
                   <div className="flex gap-1 h-3">
                      {[1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className={`flex-1 rounded-sm border border-white/5 bg-white/5 transition-all duration-1000`} />
                      ))}
                   </div>
                </div>

                {/* BOUTON AURA PULSE */}
                <button
                  onClick={() => router.push('/events')}
                  className={`w-full py-6 rounded-[2rem] font-black uppercase italic text-sm flex items-center justify-center gap-4 transition-all active:scale-95 ${mStyle.bg} ${mStyle.glow} text-black animate-pulse-slow`}
                >
                  <Users size={18} strokeWidth={3} />
                  Consulter Effectif
                </button>
             </div>
          </div>
        ) : (
          <Link href="/events/new" className="block p-16 border-2 border-dashed border-white/10 rounded-[3rem] text-center opacity-30 active:scale-[0.98] transition-all"><Plus size={32} className="mx-auto mb-3" /><p className="text-[11px] font-black uppercase tracking-widest text-center">Initialiser_Nouvelle_Mission...</p></Link>
        )}
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
