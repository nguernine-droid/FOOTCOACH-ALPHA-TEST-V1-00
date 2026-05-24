'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
  Zap,
  Star,
  Trophy,
  Users,
  Trash2,
  Edit2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

/**
 * CALENDAR_PAGE (v10.0 - ALPHA TEST V1)
 * Gestion des événements avec code couleur tactique et mode édition.
 */
export default function CalendarPage() {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [isExpanded, setIsExpanded] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration du mois
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthShort = viewDate.toLocaleDateString('fr-FR', { month: 'short' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // CHARGEMENT DES ÉVÉNEMENTS
  useEffect(() => {
    const fetchEvents = async () => {
      if (!teamInfo?.id) return;
      setIsLoading(true);
      try {
        const { data } = await supabase.from('events').select('*').or(`home_club_id.eq.${teamInfo.id},away_club_id.eq.${teamInfo.id}`);
        setEvents(data || []);
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };
    fetchEvents();
  }, [teamInfo?.id]);

  // LOGIQUE COULEUR TACTIQUE (FIX)
  const getEventStyle = (ev: any) => {
    const type = ev.type?.toLowerCase() || '';
    const isOfficial = ev.tournament_config?.is_official === true;

    if (isOfficial) return { label: 'Match Officiel', color: 'text-orange-500', bg: 'bg-orange-500', icon: <Trophy size={18} fill="currentColor" /> };
    if (type.includes('match')) return { label: 'Match Amical', color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', icon: <Zap size={18} fill="currentColor" /> };
    if (type.includes('plateau')) return { label: 'Plateau', color: 'text-purple-500', bg: 'bg-purple-500', icon: <Users size={18} /> };
    if (type.includes('tournoi')) return { label: 'Tournoi', color: 'text-yellow-500', bg: 'bg-yellow-500', icon: <Star size={18} fill="currentColor" /> };
    return { label: 'Entraînement', color: 'text-sky-400', bg: 'bg-sky-500', icon: <ActivityIcon size={18} /> };
  };

  const monthEvents = useMemo(() => events.filter(e => { const d = new Date(e.date); return d.getMonth() === month && d.getFullYear() === year; }), [events, month, year]);
  const currentDayEvents = useMemo(() => monthEvents.filter(e => new Date(e.date).getDate() === selectedDay), [monthEvents, selectedDay]);
  const upcomingEvents = useMemo(() => [...events].filter(e => new Date(e.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 10), [events]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Supprimer définitivement cet événement ?")) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32 max-w-md mx-auto shadow-2xl font-sans">
      <header className="bg-black/80 backdrop-blur-md py-5 px-6 sticky top-0 z-30 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="active:scale-90 transition-transform"><ChevronLeft size={24} strokeWidth={3} /></button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">Calendrier_Unité</h1>
        </div>
        <div className="px-3 py-1 rounded-lg border border-neon-cyan/30 text-neon-cyan text-[8px] font-black uppercase">Alpha_V1</div>
      </header>

      <div className="p-4 space-y-6">
        <Link href="/events/new" className="w-full bg-white text-black font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase italic text-sm">
          <Plus size={20} strokeWidth={4} /> Planifier Mission
        </Link>

        {/* CALENDRIER */}
        <section className="bg-white/5 rounded-[2.5rem] p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6 px-2">
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} className="text-neon-cyan" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">{monthLabel}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMonthOffset(prev => prev - 1)} className="p-2 bg-white/5 rounded-lg active:scale-90"><ChevronLeft size={16}/></button>
              <button onClick={() => setMonthOffset(prev => prev + 1)} className="p-2 bg-white/5 rounded-lg active:scale-90"><ChevronRight size={16}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4 text-center">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-[9px] font-black text-gray-600">{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = i + 1; // Simplification pour l'affichage
              if (dayNum > daysInMonth) return null;
              const hasEvt = monthEvents.some(e => new Date(e.date).getDate() === dayNum);
              const isSelected = selectedDay === dayNum;
              return (
                <button key={i} onClick={() => setSelectedDay(dayNum)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black relative transition-all ${isSelected ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00F0FF]' : 'text-gray-500'}`}>
                  {dayNum}
                  {hasEvt && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-neon-cyan" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* LISTE DU JOUR */}
        <section className="space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-2">Planning du {selectedDay} {monthShort}</h3>
           {currentDayEvents.length > 0 ? currentDayEvents.map((ev, i) => {
             const style = getEventStyle(ev);
             return (
               <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between group active:bg-white/10 transition-all cursor-pointer" onClick={() => router.push(`/events/new?edit=${ev.id}`)}>
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${style.color}`}>{style.icon}</div>
                     <div className="text-left">
                        <p className="text-sm font-black text-white uppercase italic">{ev.title}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{ev.location} • {ev.time}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <button onClick={(e) => handleDelete(e, ev.id)} className="p-2 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                     <Edit2 size={16} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
               </div>
             );
           }) : (
             <div className="py-10 text-center text-gray-700 font-black uppercase text-[10px] italic">Aucune mission ce jour</div>
           )}
        </section>

        {/* PROCHAINS RDV */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-2">Flux_Missions_Futures</h3>
          <div className="space-y-3">
            {upcomingEvents.map((ev, i) => {
              const style = getEventStyle(ev);
              return (
                <div key={i} onClick={() => router.push(`/events/new?edit=${ev.id}`)} className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-10 rounded-full ${style.bg}`} />
                    <div className="text-left">
                      <h4 className="font-black text-white text-sm uppercase italic">{ev.title}</h4>
                      <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">
                        {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {ev.time}
                      </p>
                    </div>
                  </div>
                  <Edit2 size={16} className="text-gray-700 group-hover:text-neon-cyan transition-colors" />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActivityIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
