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
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Typage strict
type EventType = 'match-champ' | 'match-amical' | 'plateau-off' | 'plateau-amical' | 'tournoi' | 'interclub' | 'autres';
type StatusType = 'terminé' | 'confirmé' | 'en-attente' | 'convoqué';

const SQUAD_SIZE = 12;

const eventTypes: Record<EventType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'match-champ': { label: 'Match Championnat', color: '#EF4444', bg: 'bg-red-500', icon: <Trophy size={20} fill="currentColor" /> },
  'match-amical': { label: 'Match Amical', color: '#F97316', bg: 'bg-orange-500', icon: <Zap size={20} fill="currentColor" /> },
  'plateau-off': { label: 'Plateau Officiel', color: '#22C55E', bg: 'bg-green-500', icon: <Star size={20} fill="currentColor" /> },
  'plateau-amical': { label: 'Plateau Amical', color: '#3B82F6', bg: 'bg-blue-500', icon: <Users size={20} /> },
  'tournoi': { label: 'Tournois', color: '#A855F7', bg: 'bg-purple-500', icon: <Trophy size={20} fill="currentColor" /> },
  'interclub': { label: 'Interclub', color: '#FACC15', bg: 'bg-yellow-400', icon: <Users size={20} /> },
  'autres': { label: 'Autres', color: '#9CA3AF', bg: 'bg-gray-400', icon: <CalendarIcon size={20} /> },
};

const statusStyles: Record<StatusType, { label: string; bg: string; text: string }> = {
  'terminé': { label: 'Terminé', bg: 'bg-gray-500/20', text: 'text-gray-400' },
  'confirmé': { label: 'Validé', bg: 'bg-green-500/20', text: 'text-green-500' },
  'en-attente': { label: 'À organiser', bg: 'bg-fc-orange/20', text: 'text-fc-orange' },
  'convoqué': { label: 'Convocations', bg: 'bg-blue-500/20', text: 'text-blue-500' },
};

export default function CalendarPage() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [isExpanded, setIsExpanded] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  // Calcul dynamique du mois affiché
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthShort = viewDate.toLocaleDateString('fr-FR', { month: 'short' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Chargement des événements (Mock + LocalStorage)
  useEffect(() => {
    const defaultEvents = [
      { id: 1, title: 'Plateau Amical Sèvres', date: '2026-05-14', time: '14h00', location: 'Stade Mun.', type: 'plateau-amical', status: 'confirmé', presents: 10, total: SQUAD_SIZE },
      { id: 2, title: 'Match vs Versailles', date: '2026-05-16', time: '14h30', location: 'Terrain B', type: 'match-amical', status: 'convoqué', presents: 7, total: SQUAD_SIZE },
      { id: 3, title: 'vs AS Meudon', date: '2026-05-20', time: '15h00', location: 'Stade Meudon', type: 'match-champ', status: 'en-attente', presents: 0, total: SQUAD_SIZE },
    ];

    const stored = JSON.parse(localStorage.getItem('team_events') || '[]');
    setEvents([...defaultEvents, ...stored]);
  }, []);

  // Filtrage des événements pour le mois en cours
  const monthEvents = useMemo(() => {
    return events.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === month && eDate.getFullYear() === year;
    });
  }, [events, month, year]);

  const calendarGrid = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const blanks = Array.from({ length: offset }, (_, i) => `blank-${i}`);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [year, month, daysInMonth]);

  const visibleDays = useMemo(() => {
    if (isExpanded) return calendarGrid;
    const dayIndex = calendarGrid.indexOf(selectedDay);
    if (dayIndex === -1) return calendarGrid.slice(0, 7);
    const rowIndex = Math.floor(dayIndex / 7);
    return calendarGrid.slice(rowIndex * 7, (rowIndex + 1) * 7);
  }, [isExpanded, selectedDay, calendarGrid]);

  const currentDayEvents = useMemo(() => {
    return monthEvents.filter(e => new Date(e.date).getDate() === selectedDay);
  }, [monthEvents, selectedDay]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter(e => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <main className="min-h-screen bg-dark-bg text-white pb-32 max-w-md mx-auto shadow-2xl">
      <header className="bg-dark-bg py-4 px-6 sticky top-0 z-30 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white active:scale-90 transition-transform">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <h1 className="text-xl font-black italic uppercase tracking-tight">Calendrier</h1>
        </div>
        <button className="bg-white/5 p-2 rounded-xl text-gray-400">
          <Filter size={20} />
        </button>
      </header>

      <div className="p-4 space-y-6">
        <Link href="/events/new" className="w-full bg-fc-orange text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 border border-fc-orange/20 active:scale-95 transition-all">
          <Plus size={24} strokeWidth={3} /> CRÉER UN ÉVÉNEMENT
        </Link>

        <section className="bg-dark-card rounded-[2.5rem] p-6 border border-white/5 shadow-xl">
          <div className="flex justify-between items-center mb-6 px-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 group active:scale-95 transition-transform">
              <CalendarIcon size={16} className="text-sky-blue" />
              <h3 className="text-sm font-bold uppercase tracking-widest capitalize">{monthLabel}</h3>
              <ChevronRight size={16} className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            <div className="flex gap-4">
              <button onClick={() => setMonthOffset(prev => prev - 1)} className="text-gray-600 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
              <button onClick={() => setMonthOffset(prev => prev + 1)} className="text-gray-600 hover:text-white transition-colors"><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4 text-center">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
              <span key={i} className="text-[10px] font-black text-gray-600 uppercase">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
            {visibleDays.map((dayNum, idx) => {
              if (typeof dayNum === 'string') return <div key={idx} />;
              const hasEvent = monthEvents.some(e => new Date(e.date).getDate() === dayNum);
              const isSelected = selectedDay === dayNum;
              const isToday = today.getDate() === dayNum && month === today.getMonth() && year === today.getFullYear();

              return (
                <button key={idx} onClick={() => setSelectedDay(dayNum)} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all relative ${
                    isSelected ? 'bg-fc-orange text-white shadow-lg scale-110' : isToday ? 'bg-white/10 text-brand-orange border border-brand-orange/30' : 'text-gray-500'
                  }`}>
                    {dayNum}
                    {hasEvent && !isSelected && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-orange" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-dark-card rounded-[2.5rem] p-6 border border-white/5 shadow-xl">
          <h3 className="text-xs font-black uppercase text-white tracking-widest mb-6">
            Planning du {selectedDay} {monthShort}
          </h3>

          {currentDayEvents.length > 0 ? (
            <div className="space-y-4">
              {currentDayEvents.map((ev, i) => {
                const type = eventTypes[ev.type as EventType] || eventTypes['autres'];
                return (
                  <div key={i} className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 ${type.bg} bg-opacity-20 rounded-xl flex items-center justify-center`} style={{ color: type.color }}>
                          {type.icon}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{ev.title}</p>
                          <p className="text-[9px] text-gray-500 font-bold uppercase">{ev.location || 'Lieu non défini'}</p>
                        </div>
                      </div>
                      <p className="font-black text-white">{ev.time || '--:--'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-600 font-black uppercase text-[10px] italic">
              Aucun événement prévu
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 px-2">Prochains Rendez-vous</h3>
          <div className="space-y-3">
            {upcomingEvents.map((item, i) => {
              const type = eventTypes[item.type as EventType] || eventTypes['autres'];
              return (
                <div key={i} className="bg-dark-card rounded-3xl p-5 border border-white/5 shadow-xl flex items-center justify-between active:bg-white/5 transition-colors cursor-pointer group" onClick={() => {
                  const d = new Date(item.date);
                  setMonthOffset((d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth()));
                  setSelectedDay(d.getDate());
                }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-10 rounded-full ${type.bg}`} />
                    <div>
                      <h4 className="font-black text-white text-sm uppercase italic">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                        {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {item.time}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-600" />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
