'use client';

import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, Play, Trophy, Zap, Calendar, Clock, MapPin, Save, Shield, Check, Search, CheckCircle2, Plus, Loader2, ListOrdered, Settings2, Timer, Info, AlertTriangle, Target, Brain, Flame, Layout, Repeat, Activity
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type EventType = 'training' | 'match' | 'plateau' | 'tournament';
interface Club { id: string; name: string; }

function NewEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { teamInfo } = useTeam();
  const [type, setType] = useState<EventType>('training');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- ÉTATS ---
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [city, setCity] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [trainingTheme, setTrainingTheme] = useState('Technique');
  const [opponentSearch, setOpponentSearch] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState<Club | null>(null);
  const [isOpponentMenuOpen, setIsOpponentMenuOpen] = useState(false);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [plateauOpponents, setPlateauOpponents] = useState(['', '', '']);
  const [plateauSearchIndex, setPlateauSearchIndex] = useState<number | null>(null);

  useEffect(() => {
    if (editId) {
      const fetchEvent = async () => {
        const { data } = await supabase.from('events').select('*').eq('id', editId).single();
        if (data) {
          setType(data.type as EventType);
          setStartDate(data.date);
          setStartTime(data.time);
          setCity(data.city || '');
          setStadiumName(data.stadium_name || '');
          setInstructions(data.description || '');
          setIsOfficial(data.tournament_config?.is_official || false);
          if (data.type === 'training') setTrainingTheme(data.training_theme || 'Technique');
          if (data.type === 'match') setOpponentSearch(data.title.replace('vs ', '').replace('VS ', ''));
          if (data.type === 'plateau') setPlateauOpponents(data.tournament_config?.opponents || ['', '', '']);
        }
      };
      fetchEvent();
    }
  }, [editId]);

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('id, name').order('name');
      if (data) setAllClubs(data);
    };
    fetchClubs();
  }, []);

  const filteredClubs = useMemo(() => {
    const search = plateauSearchIndex !== null ? plateauOpponents[plateauSearchIndex] : opponentSearch;
    if (!search?.trim()) return [];
    return allClubs.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  }, [allClubs, opponentSearch, plateauOpponents, plateauSearchIndex]);

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique', icon: <Play size={24} />, color: 'bg-sky-500' },
    { id: 'match', label: 'Match', desc: 'Rencontre de combat', icon: <Trophy size={24} />, color: 'bg-red-600' },
    { id: 'plateau', label: 'Plateau', desc: '3 Matchs max', icon: <Zap size={24} />, color: 'bg-purple-700' },
    { id: 'tournament', label: 'Tournoi', desc: 'Compétition complète', icon: <Shield size={24} />, color: 'bg-amber-500' },
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const index = Math.round(scrollLeft / width);
    if (eventTypes[index] && eventTypes[index].id !== type) {
      setType(eventTypes[index].id as EventType);
      setIsOpponentMenuOpen(false);
    }
  };

  const handleSave = async () => {
    if (!startDate || !startTime) { alert("Date et heure obligatoires."); return; }
    setIsLoading(true);
    try {
      const finalOpponent = selectedOpponent ? selectedOpponent.name : opponentSearch;
      const eventData = {
          title: type === 'match' ? `vs ${finalOpponent || 'ADVERSAIRE'}` : (type === 'training' ? `Séance ${trainingTheme}` : type.toUpperCase()),
          type, date: startDate, time: startTime,
          city: city.toUpperCase(),
          stadium_name: stadiumName.toUpperCase(),
          location: `${stadiumName} ${city}`.trim(),
          home_club_id: teamInfo?.id,
          away_club_id: type === 'match' ? selectedOpponent?.id : null,
          description: instructions.toUpperCase(),
          training_theme: type === 'training' ? trainingTheme : null,
          tournament_config: { is_official: isOfficial, opponents: type === 'plateau' ? plateauOpponents : null }
      };

      if (editId) await supabase.from('events').update(eventData).eq('id', editId);
      else await supabase.from('events').insert([eventData]);

      setShowSuccess(true);
      setTimeout(() => router.push('/events'), 1500);
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const styles = {
    card: (color = 'white/10') => `bg-[#0A0A0A] border-2 border-${color} rounded-[2.5rem] p-6 space-y-6 shadow-xl transition-all duration-500`,
    input: `w-full bg-white/10 p-4 rounded-2xl text-sm font-black text-white outline-none border-2 border-white/5 focus:border-neon-cyan uppercase placeholder:text-white/20 shadow-inner transition-all`,
    label: `text-[10px] font-black text-neon-cyan uppercase px-2 tracking-[0.2em] block mb-1`
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <main className="max-w-md mx-auto pb-44 p-6 space-y-8">
        <div className="flex items-center gap-4 mb-4"><button onClick={() => router.back()} className="text-white bg-white/10 p-2 rounded-xl active:scale-90 transition-transform"><ChevronLeft size={24} /></button><h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Nouveau_Planning</h1></div>

        {/* TYPE SELECTOR */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[3rem] border border-white/10 h-44 shadow-2xl relative">
          {eventTypes.map((t) => (
            <div key={t.id} className={`min-w-full snap-center ${t.color} p-8 flex flex-col justify-center text-left relative overflow-hidden`}>
              <h2 className="text-3xl font-black uppercase italic leading-none mb-1">{t.label}</h2>
              {t.id === 'match' && (
                <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsOfficial(!isOfficial); }} className={`mt-3 w-48 h-10 rounded-full bg-black/40 border-2 transition-all duration-500 p-1 flex relative items-center z-[100] outline-none active:scale-95 ${isOfficial ? 'border-orange-500' : 'border-[#39FF14]'}`}>
                   <div className={`flex-1 text-[7px] font-black z-10 pointer-events-none transition-opacity ${isOfficial ? 'opacity-30' : 'text-[#39FF14]'}`}>AMICAL</div>
                   <div className={`flex-1 text-[7px] font-black z-10 pointer-events-none transition-opacity ${!isOfficial ? 'opacity-30' : 'text-orange-500'}`}>OFFICIEL</div>
                   <div className={`absolute top-1 bottom-1 w-[48%] bg-white rounded-full shadow-2xl transition-all duration-300 transform pointer-events-none ${isOfficial ? 'left-[50%]' : 'left-[1%]'}`} />
                </button>
              )}
              <p className="text-[9px] font-bold uppercase tracking-widest mt-2 opacity-70">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* 1. CONFIGURATION SPÉCIFIQUE */}
          <section className={styles.card(isOfficial && type === 'match' ? 'orange-500/40' : (type === 'match' ? 'green-500/40' : 'white/10'))}>
            {type === 'match' && (
              <div className="relative">
                <label className={styles.label}>Équipe Adverse</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input placeholder="RECHERCHER OU SAISIR..." value={selectedOpponent ? selectedOpponent.name : opponentSearch} onChange={(e) => { setOpponentSearch(e.target.value.toUpperCase()); setIsOpponentMenuOpen(true); if (selectedOpponent) setSelectedOpponent(null); }} className={`${styles.input} pl-12 ${selectedOpponent ? 'border-neon-green text-neon-green' : ''}`} />
                </div>
                {isOpponentMenuOpen && opponentSearch.trim() && (
                  <div className="absolute z-[200] w-full mt-2 bg-[#111] border-2 border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    {filteredClubs.map(club => (<button key={club.id} type="button" onClick={() => { setSelectedOpponent(club); setOpponentSearch(''); setIsOpponentMenuOpen(false); }} className="w-full p-5 text-left border-b border-white/5 hover:bg-white/5 transition-colors text-xs font-black uppercase italic text-white">{club.name}</button>))}
                    <button type="button" onClick={() => setIsOpponentMenuOpen(false)} className="w-full p-4 text-center bg-white/5 text-[10px] font-black text-neon-cyan uppercase">Utiliser "{opponentSearch}"</button>
                  </div>
                )}
              </div>
            )}

            {type === 'training' && (
              <div className="space-y-4">
                <label className={styles.label}>Objectif Technique</label>
                <div className="flex flex-wrap gap-2">
                  {['Technique','Tactique','Physique','Match','Spécifique'].map(th => (
                    <button key={th} type="button" onClick={() => setTrainingTheme(th)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${trainingTheme === th ? 'bg-neon-cyan border-neon-cyan text-black' : 'bg-white/5 border-white/10 text-gray-500'}`}>{th}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. LOGISTIQUE GPS (VILLE & STADE IMMERSIF) */}
          <section className={styles.card()}>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={styles.label}>📅 Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.input} /></div>
                   <div><label className={styles.label}>⌚ Heure</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} /></div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-5">
                   <div>
                      <label className={styles.label}>🏙️ Ville (Affichage)</label>
                      <input placeholder="SÈTE, MONTPELLIER..." value={city} onChange={e => setCity(e.target.value.toUpperCase())} className={styles.input} />
                   </div>

                   {/* CHAMP STADE AVEC VIGNETTE IMMERSIVE */}
                   <div>
                      <label className={styles.label}>🏟️ L'Arène (Nom du stade pour GPS)</label>
                      <div className="flex gap-4 items-center">
                         <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex-shrink-0 transition-all duration-500 ${stadiumName ? (isOfficial ? 'border-orange-500 shadow-[0_0_15px_#f97316]' : 'border-[#39FF14] shadow-[0_0_15px_#39FF14]') : 'border-white/10'}`}>
                            <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="Stade" />
                         </div>
                         <div className="flex-1">
                            <input
                              placeholder="STADE MUNICIPAL..."
                              value={stadiumName}
                              onChange={e => setStadiumName(e.target.value.toUpperCase())}
                              className={`${styles.input} border-none shadow-none bg-white/5 h-16`}
                            />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <section className={styles.card()}>
             <label className={styles.label}>Consignes (Matériel, RDV...)</label>
             <textarea placeholder="EX: RDV 13H00. MAILLOTS BLEUS..." value={instructions} onChange={e => setInstructions(e.target.value)} className={`${styles.input} min-h-[100px] resize-none text-sm`} />
          </section>
        </div>

        <button onClick={handleSave} className="fixed bottom-28 left-6 right-6 bg-neon-cyan text-black font-black py-6 rounded-[3rem] shadow-[0_0_30px_rgba(0,240,255,0.4)] uppercase italic text-xl active:scale-95 transition-all z-[90]">VALIDER</button>
      </main>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-neon-cyan font-black uppercase tracking-widest">NEXUS_LINK_LOADING...</div>}>
      <NewEventContent />
    </Suspense>
  );
}
