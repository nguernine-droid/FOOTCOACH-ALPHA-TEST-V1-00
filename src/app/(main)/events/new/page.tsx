'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Play,
  Trophy,
  Zap,
  Calendar,
  Clock,
  MapPin,
  Save,
  ChevronDown,
  Shield,
  X,
  Check,
  Repeat,
  ChevronRight
} from 'lucide-react';

type EventType = 'training' | 'match' | 'plateau' | 'tournament';

export default function NewEventPage() {
  const router = useRouter();
  const [type, setType] = useState<EventType>('training');
  const [showSuccess, setShowSuccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'weekly' | 'biweekly'>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique & physique', icon: <Play size={24} />, color: 'bg-sky-400', textColor: 'text-sky-400' },
    { id: 'match', label: 'Match', desc: 'Compétition ou amical', icon: <Trophy size={24} />, color: 'bg-match-red', textColor: 'text-match-red' },
    { id: 'plateau', label: 'Plateau', desc: 'Animation U5-U11', icon: <Zap size={24} />, color: 'bg-purple-600', textColor: 'text-purple-600' },
    { id: 'tournament', label: 'Tournoi', desc: 'Coupe ou Challenge', icon: <Shield size={24} />, color: 'bg-[#FFD700]', textColor: 'text-[#FFD700]' },
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const index = Math.round(scrollLeft / width);
    if (eventTypes[index] && eventTypes[index].id !== type) {
      setType(eventTypes[index].id as EventType);
    }
  };

  const handleSave = () => {
    if (!date || !title) {
      alert('Veuillez renseigner au moins un titre et une date.');
      return;
    }
    const typeMapping: Record<EventType, string> = {
      training: 'autres', match: 'match-amical', plateau: 'plateau-amical', tournament: 'tournoi'
    };
    const newEvent = {
      id: Date.now(), title, date, time, location, note,
      type: typeMapping[type], status: 'confirmé',
      isRecurring, recurrenceFrequency, recurrenceEndDate
    };
    const existingEvents = JSON.parse(localStorage.getItem('team_events') || '[]');
    localStorage.setItem('team_events', JSON.stringify([...existingEvents, newEvent]));

    // --- CENTRALISATION DANS L'HISTORIQUE DES MESSAGES ---
    const newMessage = {
      id: Date.now() + 4,
      title: `${newEvent.type === 'autres' ? 'Entraînement' : 'Match'} : ${title}`,
      lastSender: "Agenda Coach",
      lastMessage: `Nouveau rendez-vous le ${new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${time}. Lieu: ${location}`,
      type: newEvent.type === 'match-amical' || newEvent.type === 'tournoi' ? 'convocation' : 'alerte',
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      unread: 1,
      isSystem: true
    };
    const existingMessages = JSON.parse(localStorage.getItem('team_messages') || '[]');
    localStorage.setItem('team_messages', JSON.stringify([newMessage, ...existingMessages]));

    setShowSuccess(true);
    setTimeout(() => router.push('/events'), 2000);
  };

  return (
    <div className="bg-background-gray min-h-screen overflow-x-hidden relative">
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in duration-500 max-w-xs">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <Check size={40} className="text-green-500" strokeWidth={4} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2 leading-none">Événement créé !</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Ajouté avec succès.</p>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto bg-background-gray min-h-screen relative pb-80 shadow-2xl font-sans">
        <header className="bg-white/95 backdrop-blur-md py-5 px-6 sticky top-0 z-40 border-b border-gray-100 flex items-center gap-4 shadow-sm">
          <button onClick={() => router.back()} className="text-gray-900 active:scale-90 transition-transform p-1 -ml-1 rounded-full"><ChevronLeft size={28} strokeWidth={3} /></button>
          <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Créer</h1>
        </header>

        <div className="p-6 space-y-8">
          {/* SLIDE SELECTOR - RESTORED AND FIXED */}
          <section className="space-y-4">
            <h3 className="px-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">Choisir le type (Glisser)</h3>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] shadow-xl"
            >
              {eventTypes.map((t) => (
                <div
                  key={t.id}
                  className={`min-w-full snap-center ${t.color} p-10 text-white relative overflow-hidden h-48 flex flex-col justify-center transition-all duration-500`}
                >
                  <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-20 group-hover:scale-110 transition-transform">
                    {React.cloneElement(t.icon as React.ReactElement<any>, { size: 120 })}
                  </div>
                  <div className="relative z-10">
                    <h2 className={`text-4xl font-black italic uppercase leading-none tracking-tighter ${t.id === 'tournament' ? 'text-black' : 'text-white'}`}>{t.label}</h2>
                    <p className={`text-[12px] font-bold uppercase tracking-[0.25em] mt-2 ${t.id === 'tournament' ? 'text-black/60' : 'text-white/80'}`}>{t.desc}</p>
                    <div className="mt-6 flex items-center gap-2">
                       <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${t.id === 'tournament' ? 'bg-black/10 text-black' : 'bg-white/20 text-white'}`}>SÉLECTIONNÉ</div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-6 flex items-center gap-1 opacity-40 animate-pulse">
                     <span className="text-[8px] font-black uppercase italic">Slide</span>
                     <ChevronRight size={10} strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-2">
               {eventTypes.map(t => (
                 <div key={t.id} className={`h-1 rounded-full transition-all duration-300 ${type === t.id ? 'w-8 bg-brand-orange' : 'w-2 bg-gray-200'}`} />
               ))}
            </div>
          </section>

          {/* Form Fields */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 space-y-3">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-2">Intitulé</label>
              <input type="text" placeholder="Ex: Entraînement..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-5 text-lg font-black outline-none border-2 border-transparent focus:border-brand-orange/20" />
            </div>

            <div className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 grid grid-cols-2 gap-4 text-left">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase block ml-2 flex items-center gap-2"><Calendar size={14} className="text-brand-orange" /> Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 text-base font-black outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase block ml-2 flex items-center gap-2"><Clock size={14} className="text-brand-orange" /> Heure</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 text-base font-black outline-none" />
                </div>
            </div>

            {type === 'training' && (
              <div className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Repeat size={14} className="text-brand-orange" /> Répétition</label>
                  <button onClick={() => setIsRecurring(!isRecurring)} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isRecurring ? 'bg-brand-orange' : 'bg-gray-200'}`}><span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-transform ${isRecurring ? 'translate-x-7' : 'translate-x-1'}`} /></button>
                </div>
                {isRecurring && (
                  <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setRecurrenceFrequency('weekly')} className={`p-5 rounded-2xl text-[11px] font-black uppercase border-2 ${recurrenceFrequency === 'weekly' ? 'bg-brand-orange border-brand-orange text-white' : 'bg-gray-50 border-transparent text-gray-400'}`}>Hebdo</button>
                      <button type="button" onClick={() => setRecurrenceFrequency('biweekly')} className={`p-5 rounded-2xl text-[11px] font-black uppercase border-2 ${recurrenceFrequency === 'biweekly' ? 'bg-brand-orange border-brand-orange text-white' : 'bg-gray-50 border-transparent text-gray-400'}`}>Bimensuel</button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase block ml-2">Fin de récurrence</label>
                      <input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-4 text-base font-black outline-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 space-y-3">
              <label className="text-[11px] font-black text-gray-400 uppercase block ml-2 flex items-center gap-2"><MapPin size={14} className="text-brand-orange" /> Localisation</label>
              <input type="text" placeholder="Lieu..." value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-5 text-lg font-black outline-none border-2 border-transparent focus:border-brand-orange/20 transition-all placeholder:text-gray-300" />
            </div>

            <div className="bg-white rounded-[2.5rem] p-7 shadow-sm border border-gray-100 space-y-3 text-left">
              <label className="text-[11px] font-black text-gray-400 uppercase block ml-2">Notes & Consignes</label>
              <textarea placeholder="Détails..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-gray-50 rounded-2xl p-5 text-base font-medium outline-none min-h-[140px] resize-none" />
            </div>
          </div>
        </div>

        {/* FIXED FOOTER BUTTON */}
        <div className="fixed bottom-28 left-0 right-0 z-40 px-6 py-4 pointer-events-none">
          <div className="max-w-md mx-auto w-full pointer-events-auto">
            <div className="bg-gradient-to-t from-background-gray via-background-gray/98 to-transparent p-6 -m-6 text-left">
              <button
                onClick={handleSave}
                className={`w-full ${eventTypes.find(e => e.id === type)?.color} ${type === 'tournament' ? 'text-black' : 'text-white'} font-black py-6 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,0.15)] active:translate-y-2 active:shadow-[0_4px_0_rgba(0,0,0,0.15)] transition-all flex items-center justify-center gap-4 uppercase italic tracking-tighter text-2xl border-2 border-white/10`}
              >
                <Save size={28} strokeWidth={3} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
