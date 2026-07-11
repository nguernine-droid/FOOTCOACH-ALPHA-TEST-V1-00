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

// --- MOTEUR DE COHÉRENCE COULEURS ---
const MISSION_THEME: Record<string, { border: string; glow: string; text: string; primary: string; bgSoft: string }> = {
  'training': { border: 'border-sky-500', glow: 'shadow-lg shadow-sky-900/20', text: 'text-sky-400', primary: 'bg-sky-500', bgSoft: 'bg-sky-950/20' },
  'amical': { border: 'border-neon-green', glow: 'shadow-lg shadow-emerald-900/20', text: 'text-neon-green', primary: 'bg-neon-green', bgSoft: 'bg-neon-green/5' },
  'officiel': { border: 'border-red-600', glow: 'shadow-lg shadow-red-900/20', text: 'text-red-600', primary: 'bg-red-600', bgSoft: 'bg-red-950/20' },
  'plateau': { border: 'border-blue-500', glow: 'shadow-lg shadow-blue-900/20', text: 'text-blue-500', primary: 'bg-blue-500', bgSoft: 'bg-blue-950/20' },
  'tournament': { border: 'border-yellow-500', glow: 'shadow-lg shadow-amber-900/10', text: 'text-yellow-500', primary: 'bg-yellow-500', bgSoft: 'bg-yellow-950/10' }
};

function NewEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { theme, teamInfo } = useTeam();
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

  // Logique de couleur dynamique (Amical/Officiel)
  const currentKey = type === 'match' ? (isOfficial ? 'officiel' : 'amical') : type;
  const m = MISSION_THEME[currentKey] || MISSION_THEME['training'];

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
    if (!opponentSearch?.trim()) return [];
    return allClubs.filter(c => c.name.toLowerCase().includes(opponentSearch.toLowerCase())).slice(0, 10);
  }, [allClubs, opponentSearch]);

  const eventTypes = [
    { id: 'training', label: 'Entraînement', desc: 'Séance technique', icon: <Play size={24} />, color: 'bg-sky-500' },
    { id: 'match', label: 'Match', desc: 'Rencontre de combat', icon: <Trophy size={24} />, color: 'bg-red-600' },
    { id: 'plateau', label: 'Plateau', desc: '3 Matchs max', icon: <Zap size={24} />, color: 'bg-purple-700' },
    { id: 'tournament', label: 'Tournoi', desc: 'Compétition complète', icon: <Shield size={24} />, color: 'bg-yellow-500' },
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const finalOpponent = selectedOpponent ? selectedOpponent.name : opponentSearch;
      const eventData = {
          title: type === 'match' ? `vs ${finalOpponent || 'ADVERSAIRE'}` : (type === 'training' ? `Séance ${trainingTheme}` : type.toUpperCase()),
          type, date: startDate, time: startTime,
          city: city.toUpperCase(), stadium_name: stadiumName.toUpperCase(),
          location: `${stadiumName} ${city}`.trim(),
          home_club_id: teamInfo?.id,
          away_club_id: type === 'match' ? selectedOpponent?.id : null,
          description: instructions.toUpperCase(),
          training_theme: type === 'training' ? trainingTheme : null,
          tournament_config: { is_official: isOfficial, opponents: type === 'plateau' ? plateauOpponents : null },
          created_by: user.id // EMPREINTE DIGITALE DU CRÉATEUR
      };
      if (editId) await supabase.from('events').update(eventData).eq('id', editId);
      else await supabase.from('events').insert([eventData]);
      setShowSuccess(true);
      setTimeout(() => router.push('/events'), 1500);
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const styles = {
    card: `bg-[#1D2027] border-2 ${m.border} ${m.glow} rounded-[2.5rem] p-6 space-y-6 transition-all duration-500`,
    input: `w-full bg-white/5 rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-white/20 transition-all text-white uppercase`,
    label: `text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${m.text}`
  };

  return (
    <div className={`min-h-screen max-w-md mx-auto pb-44 ${m.bgSoft} transition-colors duration-700 font-sans`}>
      <main className="p-6 space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center gap-4"><button onClick={() => router.back()} className="text-white bg-white/10 p-2 rounded-xl active:scale-90 transition-transform"><ChevronLeft size={24} /></button><h1 className="text-xl font-black uppercase italic tracking-tighter text-white">{editId ? 'Modifier_Planning' : 'Nouveau_Planning'}</h1></div>

        {/* TYPE SELECTOR (CAROUSEL DYNAMIQUE) */}
        <div ref={scrollRef} onScroll={handleScroll} className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[3rem] border-4 ${m.border} h-48 shadow-2xl transition-all duration-500`}>
          {eventTypes.map((t) => (
            <div key={t.id} className={`min-w-full snap-center ${t.id === 'match' ? m.primary : t.color} p-8 flex flex-col justify-center text-left relative overflow-hidden transition-colors duration-500`}>
              <h2 className={`text-5xl font-black uppercase italic leading-none ${t.id === 'match' && !isOfficial ? 'text-black' : 'text-white'}`}>{t.label}</h2>

              {t.id === 'match' && (
                /* BATTLE SWITCH XXL */
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setIsOfficial(!isOfficial);
                    if (navigator.vibrate) navigator.vibrate(15);
                  }}
                  className={`mt-6 w-56 h-12 rounded-full bg-black/40 border-2 transition-all duration-500 p-1 flex relative items-center z-[100] shadow-2xl ${isOfficial ? 'border-white/40' : 'border-black/20'}`}
                >
                   <div className={`flex-1 text-[11px] font-black z-10 transition-all duration-500 ${isOfficial ? 'text-white/20' : 'text-black italic'}`}>AMICAL</div>
                   <div className={`flex-1 text-[11px] font-black z-10 transition-all duration-500 ${!isOfficial ? 'text-white/20' : 'text-white italic'}`}>OFFICIEL</div>
                   <div className={`absolute top-1 bottom-1 w-[48%] bg-white rounded-full shadow-2xl transition-all duration-500 transform ${isOfficial ? 'left-[50%]' : 'left-[1%]'}`} />
                </button>
              )}
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-3 opacity-60 ${t.id === 'match' && !isOfficial ? 'text-black' : 'text-white'}`}>{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <section className={styles.card}>
            {type === 'match' && (
              <div className="relative">
                <label className={styles.label}>Équipe Adverse</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input placeholder="NOM DU CLUB..." value={selectedOpponent ? selectedOpponent.name : opponentSearch} onChange={(e) => { setOpponentSearch(e.target.value.toUpperCase()); setIsOpponentMenuOpen(true); if (selectedOpponent) setSelectedOpponent(null); }} className={`${styles.input} pl-12 ${selectedOpponent ? 'border-white/40' : ''}`} />
                </div>
                {isOpponentMenuOpen && opponentSearch.trim() && (
                  <div className="absolute z-[200] w-full mt-2 bg-[#1D2027] border-2 border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    {filteredClubs.map(club => (<button key={club.id} type="button" onClick={() => { setSelectedOpponent(club); setOpponentSearch(''); setIsOpponentMenuOpen(false); }} className="w-full p-5 text-left border-b border-white/5 hover:bg-white/5 transition-colors text-xs font-black uppercase text-white">{club.name}</button>))}
                  </div>
                )}
              </div>
            )}

            {type === 'training' && (
              <div className="flex flex-wrap gap-2">
                {['Technique','Tactique','Physique','Match','Spécifique'].map(th => (
                  <button key={th} type="button" onClick={() => setTrainingTheme(th)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${trainingTheme === th ? 'bg-sky-500 border-sky-500 text-black' : 'bg-white/5 border-white/10 text-gray-500'}`}>{th}</button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={styles.label}><Calendar size={14}/> Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.input} /></div>
                   <div><label className={styles.label}><Clock size={14}/> Heure</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} /></div>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                   <input placeholder="VILLE" value={city} onChange={e => setCity(e.target.value.toUpperCase())} className={styles.input} />
                   <div className="flex gap-4 items-center">
                      <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex-shrink-0 transition-all duration-500 ${stadiumName ? m.border : 'border-white/10'}`}>
                         <img src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="Stade" />
                      </div>
                      <input placeholder="NOM DU STADE (GPS)" value={stadiumName} onChange={e => setStadiumName(e.target.value.toUpperCase())} className={`${styles.input} h-16`} />
                   </div>
                </div>
             </div>
          </section>

          <section className={styles.card}>
             <label className={styles.label}>Consignes & Détails</label>
             <textarea placeholder="EX: RDV 13H00. MAILLOTS BLEUS..." value={instructions} onChange={e => setInstructions(e.target.value)} className={`${styles.input} min-h-[100px] resize-none text-sm`} />
          </section>
        </div>

        <button
          onClick={handleSave}
          className={`fixed bottom-28 left-6 right-6 font-black py-7 rounded-[3.5rem] active:scale-95 transition-all z-[90] uppercase italic text-2xl shadow-2xl
            ${theme === 'classic' ? 'bg-orange-600 text-white' : 'bg-neon-cyan text-black shadow-neon-cyan/40'}`}
        >
          VALIDER
        </button>
      </main>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#15171C] flex items-center justify-center text-neon-cyan font-black uppercase tracking-widest italic">NEXUS_LINK_START...</div>}>
      <NewEventContent />
    </Suspense>
  );
}
