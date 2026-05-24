'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Play, Trophy, Zap, Calendar, Clock, MapPin, Save, Shield, Check, Repeat, Target, Brain, Flame, Layout, Search, CheckCircle2, Plus, Loader2, ListOrdered, Settings2
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type EventType = 'training' | 'match' | 'plateau' | 'tournament';

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
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  // Plateau / Tournament States
  const [opponents, setOpponents] = useState(['', '', '']); // 3 matchs par défaut pour plateau
  const [tournamentPhases, setTournamentPhases] = useState({ poule: true, qf: false, sf: false, final: true });

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique', icon: <Play size={24} />, color: 'bg-sky-400' },
    { id: 'match', label: 'Match Amical', desc: 'Rencontre unique', icon: <Trophy size={24} />, color: 'bg-match-red' },
    { id: 'plateau', label: 'Plateau', desc: 'Multi-matchs (3)', icon: <Zap size={24} />, color: 'bg-purple-600' },
    { id: 'tournament', label: 'Tournoi', desc: 'Compétition complète', icon: <Shield size={24} />, color: 'bg-[#FFD700]' },
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
    if (!date) { alert("Veuillez choisir une date."); return; }
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      // 1. Création de l'événement parent
      const { data: event, error: eErr } = await supabase
        .from('events')
        .insert([{
          title: title || (type === 'plateau' ? 'Plateau' : 'Tournoi'),
          type: type,
          date,
          time: time || '00:00',
          location: location || 'À définir',
          home_club_id: teamInfo?.id,
          tournament_config: type === 'tournament' ? tournamentPhases : null
        }])
        .select()
        .single();

      if (eErr) throw eErr;

      // 2. Si Plateau : Création des 3 sous-matchs
      if (type === 'plateau') {
        const subMatchs = opponents.map((name, i) => ({
          parent_event_id: event.id,
          opponent_name: name || `Adversaire ${i+1}`,
          status: 'scheduled',
          order_index: i
        }));
        await supabase.from('sub_events').insert(subMatchs);
      }

      setShowSuccess(true);
      setTimeout(() => router.push('/events'), 1500);
    } catch (err: any) {
      alert(err.message);
    } finally { setIsLoading(false); }
  };

  return (
    <div className={`min-h-screen ${isPro ? 'bg-gray-50' : 'bg-black text-white'}`}>
      <main className="max-w-md mx-auto pb-40">
        <header className="py-5 px-6 sticky top-0 z-40 border-b flex items-center gap-4 bg-black/80 backdrop-blur-md border-white/10">
          <button onClick={() => router.back()}><ChevronLeft size={28} /></button>
          <h1 className="text-xl font-black uppercase italic">Nouveau_Déploiement</h1>
        </header>

        <div className="p-6 space-y-8">
          {/* SÉLECTEUR DE TYPE */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2.5rem] border border-white/10 h-40">
            {eventTypes.map((t) => (
              <div key={t.id} className={`min-w-full snap-center ${t.color} p-8 flex flex-col justify-center`}>
                <h2 className="text-3xl font-black uppercase italic italic leading-none">{t.label}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-6 text-left">
            {/* CHAMPS COMMUNS */}
            <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl">
               <input placeholder="NOM DE LA MISSION" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent border-none outline-none text-lg font-black uppercase text-white placeholder:text-white/20" />
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-xs font-black outline-none border border-white/5" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase">Heure</label><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-white/5 p-3 rounded-xl text-xs font-black outline-none border border-white/5" /></div>
               </div>
               <input placeholder="LIEU / STADE" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-white/5 p-4 rounded-xl text-xs font-black outline-none border border-white/5 uppercase" />
            </section>

            {/* SPÉCIFIQUE PLATEAU (3 ÉQUIPES) */}
            {type === 'plateau' && (
              <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><ListOrdered size={14} className="text-purple-500" /> Les 3 Matchs du Plateau</h3>
                <div className="space-y-3">
                   {opponents.map((opp, i) => (
                     <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <span className="text-xs font-black text-purple-500">#{i+1}</span>
                        <input placeholder="ÉQUIPE ADVERSE" value={opp} onChange={(e) => {
                          const newOpp = [...opponents];
                          newOpp[i] = e.target.value.toUpperCase();
                          setOpponents(newOpp);
                        }} className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-white uppercase" />
                     </div>
                   ))}
                </div>
              </section>
            )}

            {/* SPÉCIFIQUE TOURNOI (STRUCTURE) */}
            {type === 'tournament' && (
               <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Settings2 size={14} className="text-yellow-500" /> Configuration du Tournoi</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <PhaseToggle label="Phase Poules" active={tournamentPhases.poule} onClick={() => setTournamentPhases({...tournamentPhases, poule: !tournamentPhases.poule})} />
                    <PhaseToggle label="1/4 Finale" active={tournamentPhases.qf} onClick={() => setTournamentPhases({...tournamentPhases, qf: !tournamentPhases.qf})} />
                    <PhaseToggle label="1/2 Finale" active={tournamentPhases.sf} onClick={() => setTournamentPhases({...tournamentPhases, sf: !tournamentPhases.sf})} />
                    <PhaseToggle label="Finale" active={tournamentPhases.final} onClick={() => setTournamentPhases({...tournamentPhases, final: !tournamentPhases.final})} />
                  </div>
               </section>
            )}
          </div>
        </div>

        <div className="fixed bottom-28 left-0 right-0 z-40 px-6 py-4">
          <button onClick={handleSave} className="w-full bg-neon-cyan text-black font-black py-6 rounded-[2.5rem] shadow-[0_0_20px_#00F0FF] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase italic text-xl">
            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} strokeWidth={3} />}
            Validation Mission
          </button>
        </div>
      </main>
    </div>
  );
}

function PhaseToggle({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl border-2 text-[9px] font-black uppercase transition-all ${active ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-white/5 text-gray-600'}`}>{label}</button>
  );
}
