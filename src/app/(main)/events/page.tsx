'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  ChevronRight,
  Filter,
  Zap,
  Star,
  Trophy,
  Users,
  Trash2,
  Edit2,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { EventPushManager } from '@/components/EventPushManager';

/**
 * CALENDAR_PAGE (v11.0 - SMART SWIPE)
 * Gestion des événements avec Swipe-to-Delete et Mode Édition total.
 */
export default function CalendarPage() {
  const router = useRouter();
  const { teamInfo, theme } = useTeam();
  const isPro = theme === 'classic';
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [monthOffset, setMonthOffset] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Configuration du mois
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthShort = viewDate.toLocaleDateString('fr-FR', { month: 'short' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('events')
          .select('*')
          .is('deleted_at', null)
          .order('date', { ascending: true });

        if (filterMine && userId) query = query.eq('created_by', userId);

        const { data, error } = await query;
        if (error) throw error;
        setEvents(data || []);
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };
    fetchEvents();
  }, [filterMine, userId]);

  const getEventStyle = (ev: any) => {
    const type = ev.type?.toLowerCase() || '';
    const isOfficial = ev.tournament_config?.is_official === true;
    if (isOfficial) return { color: 'text-orange-500', bg: 'bg-orange-500', icon: <Trophy size={18} fill="currentColor" /> };
    if (type.includes('match')) return { color: 'text-[#39FF14]', bg: 'bg-[#39FF14]', icon: <Zap size={18} fill="currentColor" /> };
    if (type.includes('plateau')) return { label: 'Plateau', color: 'text-purple-500', bg: 'bg-purple-500', icon: <Users size={18} /> };
    if (type.includes('tournoi')) return { label: 'Tournoi', color: 'text-yellow-500', bg: 'bg-yellow-500', icon: <Star size={18} fill="currentColor" /> };
    return { color: 'text-sky-400', bg: 'bg-sky-500', icon: <Zap size={18} /> };
  };

  const monthEvents = useMemo(() => events.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getMonth() === month && d.getFullYear() === year; }), [events, month, year]);
  const currentDayEvents = useMemo(() => monthEvents.filter(e => new Date(e.date + 'T00:00:00').getDate() === selectedDay), [monthEvents, selectedDay]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (!error) setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32 max-w-md mx-auto shadow-2xl font-sans">
      <header className="bg-black/80 backdrop-blur-md py-5 px-6 sticky top-0 z-30 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="active:scale-90 transition-transform"><ChevronLeft size={24} strokeWidth={3} /></button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            {isPro ? 'Mon Agenda' : 'Agenda_Tactique'}
          </h1>
        </div>
        <button
          onClick={() => setFilterMine(prev => !prev)}
          className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${filterMine ? 'bg-neon-cyan text-black border-neon-cyan' : 'border-neon-cyan/30 text-neon-cyan'}`}
        >
          {filterMine ? 'Mes Events' : 'Tous'}
        </button>
      </header>

      <div className="p-5 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/events/new" className={`flex-1 font-black py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase italic text-sm
            ${isPro ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-neon-cyan text-black shadow-[0_0_20px_rgba(0,240,255,0.3)]'}`}>
            <Plus size={20} strokeWidth={4} />
            {isPro ? 'Planifier un événement' : 'Planifier Mission'}
          </Link>
          <EventPushManager />
        </div>

        {/* CALENDRIER COMPACT */}
        <section className="bg-white/5 rounded-[2.5rem] p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} className="text-neon-cyan" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">{monthLabel}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMonthOffset(prev => prev - 1)} className="p-2 bg-white/5 rounded-lg active:scale-90"><ChevronLeft size={16}/></button>
              <button onClick={() => setMonthOffset(prev => prev + 1)} className="p-2 bg-white/5 rounded-lg active:scale-90"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const hasEvt = monthEvents.some(e => new Date(e.date + 'T00:00:00').getDate() === d);
              return (
                <button key={i} onClick={() => setSelectedDay(d)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black relative transition-all ${selectedDay === d ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00F0FF]' : 'text-gray-500'}`}>
                  {d}
                  {hasEvt && selectedDay !== d && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-neon-cyan" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* LISTE DES MISSIONS AVEC SMART SWIPE */}
        <section className="space-y-4">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-2">
             {isPro ? `Événements du ${selectedDay} ${monthShort}` : `Planning du ${selectedDay} ${monthShort}`}
           </h3>
           <div className="space-y-4">
              <AnimatePresence>
                {currentDayEvents.length > 0 ? currentDayEvents.map((ev) => (
                  <SwipeableEventCard key={ev.id} event={ev} style={getEventStyle(ev)} onDelete={() => handleDelete(ev.id)} onEdit={() => router.push(`/events/new?edit=${ev.id}`)} onView={() => router.push(`/events/${ev.id}`)} />
                )) : (
                  <div className="py-12 text-center text-gray-700 font-black uppercase text-[10px] italic">
                    {isPro ? 'Aucun événement ce jour' : 'Aucune mission opérationnelle'}
                  </div>
                )}
              </AnimatePresence>
           </div>
        </section>
      </div>
    </main>
  );
}

/**
 * COMPOSANT CARTE AVEC GESTION DU SWIPE
 */
function SwipeableEventCard({ event, style, onDelete, onEdit, onView }: any) {
  const x = useMotionValue(0);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      if (confirm("Confirmer la suppression ?")) onDelete();
    } else if (info.offset.x > 80) {
      onEdit();
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl">
      {/* Fond gauche : supprimer */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-red-600 rounded-r-2xl flex items-center justify-end px-6">
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={20} className="text-white" />
          <span className="text-[8px] font-black uppercase">Supprimer</span>
        </div>
      </div>
      {/* Fond droit : modifier */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-sky-600 rounded-l-2xl flex items-center justify-start px-6">
        <div className="flex flex-col items-center gap-1">
          <Edit2 size={20} className="text-white" />
          <span className="text-[8px] font-black uppercase">Modifier</span>
        </div>
      </div>

      {/* La carte qui slide */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={onView}
        className="relative bg-[#0A0A0A] border-2 border-white/5 rounded-2xl p-5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer z-10"
      >
        <div className="flex items-center gap-4">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${style.color} shadow-inner`}>
              {style.icon}
           </div>
           <div className="text-left">
              <p className="text-sm font-black text-white uppercase italic tracking-tight">{event.title}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                <Clock size={10} className="text-neon-cyan" /> {event.time?.slice(0,5)} • {event.location}
              </p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-6 rounded-full ${style.bg} opacity-50`} />
           <ChevronRight size={16} className="text-white/10 group-hover:text-neon-cyan transition-colors" />
        </div>
      </motion.div>
    </div>
  );
}
