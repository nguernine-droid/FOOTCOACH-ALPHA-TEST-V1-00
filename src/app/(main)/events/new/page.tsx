'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Play, Trophy, Zap, Calendar, Clock, MapPin, Save, Shield, Check, Search, CheckCircle2, Plus, Loader2, ListOrdered, Settings2, Timer, Info, AlertTriangle, Target, Brain, Flame, Layout, Repeat, Activity
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type EventType = 'training' | 'match' | 'plateau' | 'tournament';

interface Club {
  id: string;
  name: string;
}

/**
 * NEW_EVENT_PAGE (v13.2 - MISSION SWITCH & UI FIX)
 * Ajout du sélecteur "Battle Switch" pour Amical/Officiel.
 */
export default function NewEventPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();

  const [type, setType] = useState<EventType>('training');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- CHAMPS COMMUNS ---
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [instructions, setInstructions] = useState('');

  // --- SPÉCIFIQUE ENTRAÎNEMENT ---
  const [trainingTheme, setTrainingTheme] = useState('Technique');
  const [duration, setDuration] = useState(90);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // --- SPÉCIFIQUE MATCH (SWITCH AMICAL/OFFICIEL) ---
  const [isOfficial, setIsOfficial] = useState(false);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [opponentSearch, setOpponentSearch] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState<Club | null>(null);
  const [isOpponentMenuOpen, setIsOpponentMenuOpen] = useState(false);

  // --- SPÉCIFIQUE PLATEAU ---
  const [plateauOpponents, setPlateauOpponents] = useState(['', '', '']);
  const [plateauSearchIndex, setPlateauSearchIndex] = useState<number | null>(null);
  const [tournamentTitle, setTournamentTitle] = useState('');

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
    return allClubs.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  }, [allClubs, opponentSearch, plateauOpponents, plateauSearchIndex]);

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique', icon: <Play size={24} />, color: 'bg-sky-500' },
    { id: 'match', label: 'Match', desc: 'Rencontre unique', icon: <Trophy size={24} />, color: 'bg-red-600' },
    { id: 'plateau', label: 'Plateau', desc: '3 Matchs max', icon: <Zap size={24} />, color: 'bg-purple-700' },
    { id: 'tournament', label: 'Tournoi', desc: 'Compétition complète', icon: <Shield size={24} />, color: 'bg-amber-500' },
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
      setIsOpponentMenuOpen(false);
      setPlateauSearchIndex(null);
    }
  };

  const handleSave = async () => {
    if (!startDate || !startTime) { alert("Date et heure obligatoires."); return; }

    const finalOpponent = selectedOpponent ? selectedOpponent.name : opponentSearch;
    if (type === 'match' && !finalOpponent) { alert("Veuillez indiquer l'adversaire."); return; }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const eventsToInsert = [];
      const start = new Date(startDate);
      const endRecurrence = isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate) : start;
      let current = new Date(start);

      while (current <= endRecurrence) {
        let finalTitle = "";
        if (type === 'match') finalTitle = `vs ${finalOpponent}`;
        else if (type === 'training') finalTitle = `Séance ${trainingTheme}`;
        else if (type === 'plateau') finalTitle = `PLATEAU`;
        else finalTitle = tournamentTitle || "TOURNOI";

        eventsToInsert.push({
          title: finalTitle.toUpperCase(),
          type: type,
          date: current.toISOString().split('T')[0],
          time: startTime,
          location: location.toUpperCase() || 'À DÉFINIR',
          home_club_id: teamInfo?.id,
          away_club_id: type === 'match' ? selectedOpponent?.id : null,
          description: instructions.toUpperCase(),
          training_theme: type === 'training' ? trainingTheme : null,
          tournament_config: {
            is_official: type === 'match' ? isOfficial : false,
            opponents: type === 'plateau' ? plateauOpponents : null
          }
        });

        if (!isRecurring) break;
        current.setDate(current.getDate() + 7);
      }

      await supabase.from('events').insert(eventsToInsert);
      setShowSuccess(true);
      setTimeout(() => router.push('/events'), 1500);
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const styles = {
    card: `bg-[#0A0A0A] border-2 border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-xl transition-all`,
    input: `w-full bg-white/10 p-4 rounded-2xl text-sm font-black text-white outline-none border-2 border-white/5 focus:border-neon-cyan uppercase placeholder:text-white/20 shadow-inner transition-all`,
    label: `text-[10px] font-black text-neon-cyan uppercase px-2 tracking-[0.2em] block mb-1`
  };

  const selectOpponentInPlateau = (clubName: string) => {
    if (plateauSearchIndex === null) return;
    const newOpps = [...plateauOpponents];
    newOpps[plateauSearchIndex] = clubName.toUpperCase();
    setPlateauOpponents(newOpps);
    setPlateauSearchIndex(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <main className="max-w-md mx-auto pb-44 p-6 space-y-8">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-4">
           <button onClick={() => router.back()} className="text-white bg-white/10 p-2 rounded-xl active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
           <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Nouveau_Planning</h1>
        </div>

        {/* TYPE SELECTOR */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[3rem] border border-white/10 h-40 shadow-2xl">
          {eventTypes.map((t) => (
            <div key={t.id} className={`min-w-full snap-center ${t.color} p-8 flex flex-col justify-center text-left relative overflow-hidden`}>
              <h2 className="text-3xl font-black uppercase italic leading-none">{t.label}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* 1. CONFIGURATION SPÉCIFIQUE */}
          <section className={styles.card}>
            {type === 'match' && (
              <div className="space-y-8">
                {/* BATTLE SWITCH (Style Image) */}
                <div className="flex flex-col items-center gap-4">
                   <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">Nature de la Mission</label>
                   <div
                     onClick={() => setIsOfficial(!isOfficial)}
                     className={`relative w-full h-20 rounded-full border-4 transition-all duration-500 cursor-pointer flex items-center p-1 ${isOfficial ? 'bg-orange-600/20 border-orange-500' : 'bg-green-600/20 border-[#39FF14]'}`}
                   >
                      {/* Labels fixes */}
                      <div className="flex-1 text-center z-10 transition-opacity duration-500 font-black text-[10px] uppercase italic tracking-widest opacity-100">AMICAL</div>
                      <div className="flex-1 text-center z-10 transition-opacity duration-500 font-black text-[10px] uppercase italic tracking-widest opacity-100">OFFICIEL</div>

                      {/* Curseur glissant */}
                      <div
                        className={`absolute w-[48%] h-[85%] bg-white rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center ${isOfficial ? 'translate-x-[102%] shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'translate-x-0 shadow-[0_0_20px_rgba(57,255,20,0.6)]'}`}
                      >
                         <Trophy size={20} className={isOfficial ? 'text-orange-500' : 'text-[#39FF14]'} />
                      </div>
                   </div>
                </div>

                <div className="relative">
                  <label className={styles.label}>Équipe Adverse</label>
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      placeholder="RECHERCHER OU SAISIR..."
                      value={selectedOpponent ? selectedOpponent.name : opponentSearch}
                      onChange={(e) => {
                        setOpponentSearch(e.target.value.toUpperCase());
                        setIsOpponentMenuOpen(true);
                        if (selectedOpponent) setSelectedOpponent(null);
                      }}
                      className={`${styles.input} pl-12 ${selectedOpponent ? 'border-neon-green text-neon-green' : ''}`}
                    />
                  </div>
                  {isOpponentMenuOpen && opponentSearch.trim() && (
                    <div className="absolute z-[100] w-full mt-2 bg-[#111] border-2 border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                      {filteredClubs.map(club => (
                        <button key={club.id} type="button" onClick={() => { setSelectedOpponent(club); setOpponentSearch(''); setIsOpponentMenuOpen(false); }} className="w-full p-5 text-left border-b border-white/5 hover:bg-white/5 transition-colors">
                          <p className="text-xs font-black text-white uppercase italic">{club.name}</p>
                        </button>
                      ))}
                      <button type="button" onClick={() => setIsOpponentMenuOpen(false)} className="w-full p-4 text-center bg-white/5 text-[10px] font-black text-neon-cyan uppercase">Utiliser "{opponentSearch}"</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === 'tournament' && (
              <div>
                <label className={styles.label}>Nom du Tournoi</label>
                <input placeholder="EX: TOURNOI DE PÂQUES" value={tournamentTitle} onChange={e => setTournamentTitle(e.target.value)} className={styles.input} />
              </div>
            )}

            {type === 'training' && (
              <div className="space-y-4">
                <label className={styles.label}>Objectif Technique</label>
                <div className="flex flex-wrap gap-2">
                  {trainingThemes.map(th => (
                    <button key={th.id} type="button" onClick={() => setTrainingTheme(th.id)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${trainingTheme === th.id ? 'bg-neon-cyan border-neon-cyan text-black shadow-lg shadow-neon-cyan/40' : 'bg-white/5 border-white/10 text-gray-500'}`}>{th.id}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. LOGISTIQUE TEMPORELLE (FIX OVERLAP) */}
          <section className={styles.card}>
             <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                   <label className={styles.label}>📅 Date de début</label>
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.input} />
                </div>
                <div className="flex-1">
                   <label className={styles.label}>⌚ Heure de début</label>
                   <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} />
                </div>
             </div>
             <div><label className={styles.label}>📍 Lieu de rdv</label><input placeholder="STADE..." value={location} onChange={e => setLocation(e.target.value)} className={styles.input} /></div>
          </section>

          {/* 3. PLATEAU (ADVERSAIRES + AUTOCOMPLETE) */}
          {type === 'plateau' && (
            <section className={styles.card}>
               <h3 className="text-xs font-black uppercase text-purple-500 flex items-center gap-2 mb-4"><ListOrdered size={16}/> Les 3 Adversaires</h3>
               <div className="space-y-4 relative">
                 {plateauOpponents.map((opp, i) => (
                   <div key={i} className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-purple-500">#{i+1}</span>
                      <input
                        placeholder="NOM DU CLUB"
                        value={opp}
                        onFocus={() => setPlateauSearchIndex(i)}
                        onChange={(e) => {
                          const n = [...plateauOpponents];
                          n[i] = e.target.value.toUpperCase();
                          setPlateauOpponents(n);
                        }}
                        className={`${styles.input} pl-10 ${plateauSearchIndex === i ? 'border-purple-500' : 'border-purple-500/10'}`}
                      />
                   </div>
                 ))}

                 {plateauSearchIndex !== null && plateauOpponents[plateauSearchIndex].trim() && (
                    <div className="absolute z-[110] w-full bg-[#111] border-2 border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl mt-[-10px]">
                       {filteredClubs.map(club => (
                         <button key={club.id} type="button" onClick={() => selectOpponentInPlateau(club.name)} className="w-full p-4 text-left border-b border-white/5 hover:bg-purple-500/10 transition-colors">
                            <p className="text-xs font-black text-white uppercase italic">{club.name}</p>
                         </button>
                       ))}
                       <button type="button" onClick={() => setPlateauSearchIndex(null)} className="w-full p-3 text-center bg-white/5 text-[9px] font-black text-gray-500 uppercase italic">Fermer la liste</button>
                    </div>
                 )}
               </div>
            </section>
          )}

          {/* 4. CONSIGNES CLAIRES */}
          <section className={styles.card}>
             <label className={styles.label}>Consignes (Matériel, RDV...)</label>
             <textarea placeholder="EX: RDV 13H00. MAILLOTS BLEUS..." value={instructions} onChange={e => setInstructions(e.target.value)} className={`${styles.input} min-h-[120px] resize-none leading-relaxed text-sm`} />
          </section>
        </div>

        <button onClick={handleSave} className="fixed bottom-28 left-6 right-6 bg-neon-cyan text-black font-black py-6 rounded-[3rem] shadow-[0_0_30px_rgba(0,240,255,0.4)] uppercase italic text-xl active:scale-95 transition-all z-[90]">
           VALIDER
        </button>
      </main>
    </div>
  );
}
