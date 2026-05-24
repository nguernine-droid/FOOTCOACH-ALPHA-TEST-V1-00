'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Shield,
  Check,
  Repeat,
  Target,
  Brain,
  Flame,
  Layout,
  Search,
  CheckCircle2,
  Plus,
  Loader2
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type EventType = 'training' | 'match' | 'plateau' | 'tournament';

interface Club {
  id: string;
  name: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [type, setType] = useState<EventType>('training');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [trainingTheme, setTrainingTheme] = useState('Technique');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'weekly' | 'biweekly'>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Club search states (for match type)
  const [allClubs, setClubs] = useState<Club[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState<Club | null>(null);
  const [isClubMenuOpen, setIsClubListOpen] = useState(false);

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('id, name').order('name');
      if (data) setClubs(data);
    };
    fetchClubs();
  }, []);

  const filteredClubs = useMemo(() => {
    if (!clubSearch.trim()) return [];
    return allClubs.filter(c =>
      c.name.toLowerCase().includes(clubSearch.toLowerCase())
    ).slice(0, 5);
  }, [allClubs, clubSearch]);

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique & physique', icon: <Play size={24} />, color: 'bg-sky-400', textColor: 'text-sky-400' },
    { id: 'match', label: 'Match', desc: 'Compétition ou amical', icon: <Trophy size={24} />, color: 'bg-match-red', textColor: 'text-match-red' },
    { id: 'plateau', label: 'Plateau', desc: 'Animation U5-U11', icon: <Zap size={24} />, color: 'bg-purple-600', textColor: 'text-purple-600' },
    { id: 'tournament', label: 'Tournoi', desc: 'Coupe ou Challenge', icon: <Shield size={24} />, color: 'bg-[#FFD700]', textColor: 'text-[#FFD700]' },
  ];

  const trainingThemes = [
    { id: 'Technique', icon: <Target size={14} /> },
    { id: 'Tactique', icon: <Brain size={14} /> },
    { id: 'Physique', icon: <Flame size={14} /> },
    { id: 'Jeu / Match', icon: <Layout size={14} /> },
    { id: 'Spécifique', icon: <Shield size={14} /> }
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

  const handleSave = async () => {
    let finalTitle = title.trim();
    const opponent = selectedOpponent ? selectedOpponent.name : clubSearch.trim();

    if (type === 'match') {
      if (!opponent) { alert("Veuillez indiquer l'équipe adverse."); return; }
      finalTitle = `vs ${opponent}`;
    } else if (type === 'training' && !finalTitle) {
      finalTitle = `Séance ${trainingTheme}`;
    }

    if (!date) { alert("Veuillez sélectionner une date."); return; }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const typeMapping: Record<EventType, string> = {
        training: 'training',
        match: 'match',
        plateau: 'plateau',
        tournament: 'tournament'
      };

      // --- LOGIQUE DE RÉPÉTITIVITÉ ---
      const eventsToInsert = [];
      const startDate = new Date(date);
      const endDate = isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate) : startDate;
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const eventData: any = {
          title: type === 'training' ? `[${trainingTheme}] ${finalTitle}` : finalTitle,
          type: typeMapping[type],
          date: currentDate.toISOString().split('T')[0],
          time: time || '00:00',
          location: location || 'Stade Municipal',
          home_club_id: teamInfo?.id,
        };

        // Colonnes spécifiques selon le type
        if (type === 'training') {
          eventData.training_theme = trainingTheme;
        } else {
          eventData.away_club_id = selectedOpponent?.id || null;
        }

        eventsToInsert.push(eventData);
        if (!isRecurring) break;
        if (recurrenceFrequency === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
        else currentDate.setDate(currentDate.getDate() + 14);
      }

      const { error } = await supabase.from('events').insert(eventsToInsert);
      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => router.push('/events'), 1500);
    } catch (err: any) {
      alert("Erreur de sauvegarde : " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen overflow-x-hidden relative ${isPro ? 'bg-gray-50' : 'bg-black text-white'}`}>
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-white rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in max-w-xs">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <Check size={40} className="text-green-500" strokeWidth={4} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">Transmission Réussie</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Opération enregistrée.</p>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto min-h-screen relative pb-80 shadow-2xl font-sans text-left">
        <header className={`py-5 px-6 sticky top-0 z-40 border-b flex items-center gap-4 backdrop-blur-md ${isPro ? 'bg-white/95 border-gray-100' : 'bg-black/80 border-white/10'}`}>
          <button onClick={() => router.back()} className="active:scale-90 transition-transform"><ChevronLeft size={28} strokeWidth={3} /></button>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Planifier_Mission</h1>
        </header>

        <div className="p-6 space-y-8">
          <section className="space-y-4">
            <h3 className={`px-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500`}>Type d'événement</h3>
            <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] shadow-xl border border-white/5">
              {eventTypes.map((t) => (
                <div key={t.id} className={`min-w-full snap-center ${t.color} p-10 text-white relative overflow-hidden h-48 flex flex-col justify-center`}>
                  <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-20">{React.cloneElement(t.icon as React.ReactElement<any>, { size: 120 })}</div>
                  <div className="relative z-10">
                    <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter">{t.label}</h2>
                    <p className="text-[12px] font-bold uppercase tracking-[0.25em] mt-2 opacity-80">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <div className={`${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'} rounded-[2.5rem] p-7 shadow-sm border space-y-5`}>
              {type === 'match' ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block ml-2">vs (Équipe adverse)</label>
                  <div className="relative">
                    <input placeholder="RECHERCHER OU SAISIR..." value={selectedOpponent ? selectedOpponent.name : clubSearch} onChange={(e) => { setClubSearch(e.target.value); setIsClubListOpen(true); if (selectedOpponent) setSelectedOpponent(null); }} className={`w-full ${isPro ? 'bg-gray-50 text-gray-900' : 'bg-black/40 text-white'} rounded-2xl p-5 text-lg font-black outline-none border-2 border-transparent focus:border-brand-orange/20 uppercase ${selectedOpponent ? 'text-neon-green' : ''}`} />
                    {isClubMenuOpen && clubSearch.trim() && (
                      <div className={`absolute z-50 w-full mt-2 border rounded-xl overflow-hidden shadow-2xl ${isPro ? 'bg-white' : 'bg-[#0A0A0A]'}`}>
                        {filteredClubs.map(club => (
                          <button key={club.id} type="button" onClick={() => { setSelectedOpponent(club); setClubSearch(''); setIsClubListOpen(false); }} className="w-full p-4 text-left border-b border-white/5 hover:bg-white/5"><p className="text-xs font-black uppercase italic">{club.name}</p></button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block ml-2">Intitulé de la séance</label>
                  <input type="text" placeholder="Ex: Bloc bas, Finition..." value={title} onChange={(e) => setTitle(e.target.value)} className={`w-full ${isPro ? 'bg-gray-50 text-gray-900' : 'bg-black/40 text-white'} rounded-2xl p-5 text-lg font-black outline-none border-2 border-transparent focus:border-brand-orange/20`} />
                </div>
              )}

              {type === 'training' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block ml-2">Objectif Technique</label>
                  <div className="flex flex-wrap gap-2">
                    {trainingThemes.map(themeItem => (
                      <button key={themeItem.id} type="button" onClick={() => setTrainingTheme(themeItem.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all border ${trainingTheme === themeItem.id ? 'bg-brand-orange border-brand-orange text-white shadow-lg' : 'bg-white/5 border-white/5 text-gray-600'}`}>{themeItem.icon}{themeItem.id}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'} rounded-[2.5rem] p-7 shadow-sm border grid grid-cols-2 gap-4`}>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 block ml-2 flex items-center gap-2"><Calendar size={14} className="text-brand-orange" /> Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full ${isPro ? 'bg-gray-50 text-gray-900' : 'bg-black/40 text-white'} rounded-2xl p-4 text-sm font-black outline-none border border-transparent focus:border-brand-orange/20`} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 block ml-2 flex items-center gap-2"><Clock size={14} className="text-brand-orange" /> Heure</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`w-full ${isPro ? 'bg-gray-50 text-gray-900' : 'bg-black/40 text-white'} rounded-2xl p-4 text-sm font-black outline-none border border-transparent focus:border-brand-orange/20`} />
                </div>
            </div>

            {type === 'training' && (
              <div className={`${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'} rounded-[2.5rem] p-7 shadow-sm border space-y-6`}>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Repeat size={14} className="text-brand-orange" /> Répétition Hebdo</label>
                    <p className="text-[8px] text-gray-500 uppercase font-bold mt-1">Planifier sur plusieurs semaines</p>
                  </div>
                  <button onClick={() => setIsRecurring(!isRecurring)} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isRecurring ? 'bg-brand-orange' : 'bg-white/10'}`}><span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-transform ${isRecurring ? 'translate-x-7' : 'translate-x-1'}`} /></button>
                </div>
                {isRecurring && (
                  <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setRecurrenceFrequency('weekly')} className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 ${recurrenceFrequency === 'weekly' ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white/5 border-white/5 text-gray-600'}`}>Hebdo</button>
                      <button type="button" onClick={() => setRecurrenceFrequency('biweekly')} className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 ${recurrenceFrequency === 'biweekly' ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white/5 border-white/5 text-gray-600'}`}>Bimensuel</button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-500 block ml-2 flex items-center gap-2"><Calendar size={14} className="text-brand-orange" /> Jusqu'à quelle date ?</label>
                      <input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} required={isRecurring} className={`w-full ${isPro ? 'bg-gray-50 text-gray-900' : 'bg-black/40 text-white'} rounded-2xl p-4 text-sm font-black outline-none border border-transparent focus:border-brand-orange/20`} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={`${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'} rounded-[2.5rem] p-7 shadow-sm border space-y-3`}>
              <label className="text-[10px] font-black uppercase text-gray-500 block ml-2 flex items-center gap-2"><MapPin size={14} className="text-brand-orange" /> Localisation</label>
              <input type="text" placeholder="Stade, Terrain..." value={location} onChange={(e) => setLocation(e.target.value)} className={`w-full ${isPro ? 'bg-gray-50 text-gray-900' : 'bg-black/40 text-white'} rounded-2xl p-5 text-sm font-black outline-none border border-transparent focus:border-brand-orange/20`} />
            </div>
          </div>
        </div>

        <div className="fixed bottom-28 left-0 right-0 z-40 px-6 py-4">
          <button onClick={handleSave} className="w-full bg-neon-cyan text-black font-black py-6 rounded-[2.5rem] shadow-[0_0_20px_#00F0FF] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase italic tracking-tighter text-xl">
            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={24} strokeWidth={3} />}
            Valider la Mission
          </button>
        </div>
      </main>
    </div>
  );
}
