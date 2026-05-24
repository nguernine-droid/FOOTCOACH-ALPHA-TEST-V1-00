'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Play, Trophy, Zap, Calendar, Clock, MapPin, Save, Shield, Check, Search, CheckCircle2, Plus, Loader2, ListOrdered, Settings2,  Timer, Info, AlertTriangle, Target, Brain, Flame, Layout, Repeat, Activity
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type EventType = 'training' | 'match' | 'plateau' | 'tournament';

/**
 * NEW_EVENT_PAGE (v12.8 - VISIBILITY & CATEGORY FOCUS)
 * Interface ultra-contrastée pour Match, Plateau et Tournoi.
 */
export default function NewEventPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [type, setType] = useState<EventType>('training');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- CHAMPS COMMUNS ---
  const [title, setTitle] = useState('');
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

  // --- SPÉCIFIQUE MATCH AMICAL ---
  const [opponent, setOpponent] = useState('');

  // --- SPÉCIFIQUE PLATEAU ---
  const [plateauOpponents, setPlateauOpponents] = useState(['', '', '']);
  const [matchDuration, setMatchDuration] = useState(12);

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique', icon: <Play size={24} />, color: 'bg-sky-500' },
    { id: 'match', label: 'Match Amical', desc: 'Rencontre unique', icon: <Trophy size={24} />, color: 'bg-red-600' },
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
    }
  };

  const handleSave = async () => {
    if (!startDate || !startTime) { alert("Date et heure de début obligatoires."); return; }
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const eventsToInsert = [];
      const start = new Date(startDate);
      const endRecurrence = isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate) : start;
      let current = new Date(start);

      while (current <= endRecurrence) {
        const config = {
          opponents: type === 'plateau' ? plateauOpponents : null,
          duration: type === 'plateau' ? matchDuration : (type === 'training' ? duration : null),
          end_date: type === 'tournament' ? endDate : current.toISOString().split('T')[0],
          end_time: endTime,
          training_theme: type === 'training' ? trainingTheme : null
        };

        eventsToInsert.push({
          title: title || (type === 'match' ? `vs ${opponent}` : (type === 'training' ? `Séance ${trainingTheme}` : type.toUpperCase())),
          type: type,
          date: current.toISOString().split('T')[0],
          time: startTime,
          location: location || 'À définir',
          home_club_id: teamInfo?.id,
          tournament_config: config,
          description: instructions,
          training_theme: type === 'training' ? trainingTheme : null
        });

        if (!isRecurring) break;
        current.setDate(current.getDate() + 7);
      }

      const { error } = await supabase.from('events').insert(eventsToInsert);
      if (error) throw error;
      setShowSuccess(true);
      setTimeout(() => router.push('/events'), 1500);
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  // --- STYLES ULTRA-CONTRASTÉS (DEBUG NOIR SUR BLANC) ---
  const styles = {
    card: `bg-[#0A0A0A] border-2 border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all`,
    input: `w-full bg-white/10 p-5 rounded-2xl text-base font-black text-white outline-none border-2 border-white/5 focus:border-neon-cyan uppercase placeholder:text-white/30 shadow-inner`,
    label: `text-[11px] font-black text-neon-cyan uppercase px-2 tracking-[0.2em] block mb-2`,
    iconBox: `w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-neon-cyan`
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      <main className="max-w-md mx-auto pb-44">
        {/* HEADER */}
        <header className="py-6 px-6 sticky top-0 z-40 border-b-2 bg-black/95 backdrop-blur-xl border-white/10 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4">
             <button onClick={() => router.back()} className="active:scale-90 transition-all text-white bg-white/10 p-2 rounded-xl"><ChevronLeft size={24} strokeWidth={3} /></button>
             <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Nouveau_Planning</h1>
          </div>
          <div className="px-3 py-1 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-[10px] font-black italic">UNITÉ_ALPHA</div>
        </header>

        <div className="p-6 space-y-10">
          {/* SELECTEUR DE MISSION (CARROUSEL) */}
          <section className="space-y-4">
            <h3 className={styles.label}>Sélection du type de mission</h3>
            <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[3rem] border-4 border-white/5 h-44 shadow-2xl">
              {eventTypes.map((t) => (
                <div key={t.id} className={`min-w-full snap-center ${t.color} p-10 flex flex-col justify-center text-left relative overflow-hidden`}>
                  <div className="absolute right-[-30px] top-1/2 -translate-y-1/2 opacity-20 rotate-12">{React.cloneElement(t.icon as React.ReactElement<any>, { size: 140 })}</div>
                  <h2 className="text-4xl font-black uppercase italic leading-none text-white drop-shadow-md relative z-10">{t.label}</h2>
                  <p className="text-[12px] font-bold uppercase tracking-[0.2em] mt-3 opacity-90 text-white relative z-10">{t.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-8 text-left animate-in slide-in-from-bottom-4 duration-500">

            {/* BLOC 1 : IDENTITÉ (Contraste Maximum) */}
            <section className={styles.card}>
               <div className="flex items-center gap-3">
                  <div className={styles.iconBox}><Info size={20} /></div>
                  <div className="flex-1">
                     <label className={styles.label}>Intitulé de la mission</label>
                     <input placeholder="EX: MATCH RETOUR, STAGE HIVER..." value={title} onChange={e => setTitle(e.target.value)} className={styles.input} />
                  </div>
               </div>

               {type === 'match' && (
                 <div className="pt-6 border-t-2 border-white/5 animate-in fade-in">
                    <label className={`${styles.label} text-red-500`}>Équipe Adverse (OBLIGATOIRE)</label>
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                      <input placeholder="RECHERCHER LE CLUB..." value={opponent} onChange={e => setOpponent(e.target.value.toUpperCase())} className={`${styles.input} pl-12 border-red-500/20 focus:border-red-500`} />
                    </div>
                 </div>
               )}

               {type === 'training' && (
                 <div className="pt-6 border-t-2 border-white/5 space-y-4 animate-in fade-in">
                    <label className={styles.label}>Objectif Technique</label>
                    <div className="flex flex-wrap gap-2">
                       {trainingThemes.map(th => (
                         <button key={th.id} type="button" onClick={() => setTrainingTheme(th.id)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${trainingTheme === th.id ? 'bg-neon-cyan border-neon-cyan text-black shadow-lg shadow-neon-cyan/40' : 'bg-white/5 border-white/10 text-gray-500'}`}>{th.id}</button>
                       ))}
                    </div>
                 </div>
               )}
            </section>

            {/* BLOC 2 : LOGISTIQUE (Gros inputs blancs) */}
            <section className={styles.card}>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={styles.label}>📅 Date début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.input} />
                  </div>
                  <div>
                    <label className={styles.label}>⌚ Heure début</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} />
                  </div>
               </div>

               {type === 'training' && (
                 <div className="flex items-center justify-between p-4 bg-white/5 border-2 border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3"><Timer className="text-neon-cyan" size={20} /><span className="text-[11px] font-black uppercase">Durée séance</span></div>
                    <div className="flex items-center gap-5">
                       <button onClick={() => setDuration(d => Math.max(30, d-15))} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-black">-</button>
                       <span className="text-lg font-black italic">{duration}m</span>
                       <button onClick={() => setDuration(d => d+15)} className="w-10 h-10 rounded-lg bg-neon-cyan flex items-center justify-center text-black font-black">+</button>
                    </div>
                 </div>
               )}

               {(type === 'plateau' || type === 'tournament') && (
                 <div className="pt-6 border-t-2 border-white/5 space-y-6">
                    {type === 'tournament' && (
                      <div><label className={styles.label}>🏁 Date de fin</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.input} /></div>
                    )}
                    <div><label className={styles.label}>🏁 Heure de fin prévue</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={styles.input} /></div>
                 </div>
               )}

               <div className="pt-4">
                 <label className={styles.label}>📍 Lieu de rendez-vous</label>
                 <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input placeholder="STADE, TERRAIN, SALLE..." value={location} onChange={e => setLocation(e.target.value.toUpperCase())} className={`${styles.input} pl-12`} />
                 </div>
               </div>
            </section>

            {/* BLOC 3 : PLATEAU (Adversaires) */}
            {type === 'plateau' && (
              <section className={styles.card}>
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-purple-500 flex items-center gap-2"><ListOrdered size={16}/> Les 3 Adversaires</h3>
                    <div className="px-3 py-1 rounded bg-purple-500/10 text-purple-500 text-[10px] font-black italic border border-purple-500/20">{matchDuration}m / match</div>
                 </div>
                 <div className="space-y-3">
                   {plateauOpponents.map((opp, i) => (
                     <div key={i} className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-purple-500">#{i+1}</span>
                        <input placeholder="NOM DU CLUB" value={opp} onChange={(e) => {
                          const n = [...plateauOpponents]; n[i] = e.target.value.toUpperCase(); setPlateauOpponents(n);
                        }} className={`${styles.input} pl-10 border-purple-500/10`} />
                     </div>
                   ))}
                 </div>
              </section>
            )}

            {/* BLOC 4 : RÉPÉTITION (Entraînement) */}
            {type === 'training' && (
               <section className={`${styles.card} border-neon-cyan/20`}>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3"><Repeat className="text-neon-cyan" size={22} /><label className="text-[12px] font-black uppercase tracking-widest">Répétition Hebdo</label></div>
                     <button onClick={() => setIsRecurring(!isRecurring)} className={`relative h-8 w-14 rounded-full transition-all border-2 ${isRecurring ? 'bg-neon-cyan border-neon-cyan' : 'bg-white/10 border-white/20'}`}><span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-all ${isRecurring ? 'translate-x-6' : ''}`} /></button>
                  </div>
                  {isRecurring && (
                    <div className="pt-6 border-t-2 border-white/5 animate-in slide-in-from-top-4">
                       <label className={styles.label}>Jusqu'à quelle date ?</label>
                       <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className={styles.input} />
                    </div>
                  )}
               </section>
            )}

            {/* BLOC 5 : CONSIGNES CLAIRES (Zone de texte large) */}
            <section className={styles.card}>
               <div className="flex items-center gap-3">
                  <div className={styles.iconBox}><Activity size={20} /></div>
                  <label className={styles.label}>Consignes (Matériel, RDV...)</label>
               </div>
               <textarea
                 placeholder="EX: RDV AU LIDO À 13H00. PRÉVOIR GOURDE ET MAILLOT BLEU."
                 value={instructions}
                 onChange={e => setInstructions(e.target.value.toUpperCase())}
                 className={`${styles.input} min-h-[160px] resize-none leading-relaxed text-sm`}
               />
            </section>
          </div>
        </div>

        {/* VALIDER BUTTON FIXÉ */}
        <div className="fixed bottom-28 left-0 right-0 z-40 px-6 py-4">
          <button onClick={handleSave} className="w-full bg-neon-cyan text-black font-black py-6 rounded-[3rem] shadow-[0_10px_40px_rgba(0,240,255,0.4)] active:scale-95 active:shadow-none transition-all flex items-center justify-center gap-4 uppercase italic tracking-tighter text-xl border-t-4 border-white/20">
            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={26} strokeWidth={3} />}
            VALIDER LA MISSION
          </button>
        </div>
      </main>
    </div>
  );
}
