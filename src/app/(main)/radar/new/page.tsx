'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, Calendar, Clock, Shield, Navigation,
  Home as HomeIcon, Trophy, Layout, Send, Loader2, Layers, MapPin, Target, Plus, Minus, ChevronDown, Check
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type AnnouncementType = 'Match Amical' | 'Tournoi' | 'Plateau';

// --- COULEURS TACTIQUES (LE DESIGN VALIDÉ) ---
const THEME: Record<AnnouncementType, {
  primary: string;
  glow: string;
  text: string;
  border: string;
  badge: string;
}> = {
  'Match Amical': { primary: 'bg-[#39FF14]', glow: 'shadow-[0_0_20px_#39FF1444]', text: 'text-[#39FF14]', border: 'border-[#39FF14]', badge: 'bg-[#39FF14]/20' },
  'Plateau': { primary: 'bg-blue-500', glow: 'shadow-[0_0_20px_#3b82f644]', text: 'text-blue-500', border: 'border-blue-500', badge: 'bg-blue-500/20' },
  'Tournoi': { primary: 'bg-red-600', glow: 'shadow-[0_0_20px_#dc262644]', text: 'text-red-600', border: 'border-red-600', badge: 'bg-red-600/20' }
};

function NewSignalContent() {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const [isLoading, setIsLoading] = useState(false);

  // --- ÉTATS DU FORMULAIRE ---
  const [type, setType] = useState<AnnouncementType>('Match Amical');
  const [mainCategory, setCategory] = useState(teamInfo?.category || '');
  const [desiredLevel, setDesiredLevel] = useState('Espoir');
  const [availability, setAvailability] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [city, setCity] = useState('');
  const [stadium, setStadium] = useState('');
  const [distanceMax, setDistanceMax] = useState(30);
  const [comment, setComment] = useState('');
  const [travelPreference, setTravelPreference] = useState<'home' | 'away' | 'both'>('home');
  const [quotas, setQuotas] = useState<Record<string, number>>({});

  const m = THEME[type];

  // --- LISTES CATÉGORIES (DISTRICT COMPLIANT) ---
  const categoriesAmical = [
    { label: 'U12/U13', value: 'U13' }, { label: 'U14/U15', value: 'U15' },
    { label: 'U16/U17', value: 'U17' }, { label: 'SÉNIORS', value: 'SÉNIORS' },
    { label: 'VÉTÉRANS', value: 'VÉTÉRANS' }
  ];
  const categoriesPlateau = [
    { label: 'U6/U7', value: 'U7' }, { label: 'U8/U9', value: 'U9' },
    { label: 'U10/U11', value: 'U11' }, { label: 'U12/U13', value: 'U13' }
  ];
  const categoriesTournoi = Array.from({ length: 12 }, (_, i) => ({ label: `U${i + 6}`, value: `U${i + 6}` }));

  const currentCategories = type === 'Plateau' ? categoriesPlateau : type === 'Tournoi' ? categoriesTournoi : categoriesAmical;

  useEffect(() => {
    if (teamInfo) {
      if (!mainCategory) setCategory(teamInfo.category || '');
      if (travelPreference === 'home') {
        setCity(teamInfo.clubCity || '');
        setStadium(teamInfo.clubStadium || '');
      }
    }
  }, [teamInfo, travelPreference]);

  const handleTravelChange = (pref: 'home' | 'away' | 'both') => {
    setTravelPreference(pref);
    if (pref === 'home') {
      setCity(teamInfo?.clubCity || '');
      setStadium(teamInfo?.clubStadium || '');
    } else if (pref === 'away') {
      setCity('');
      setStadium('');
    }
  };

  const updateQuota = (cat: string, delta: number) => {
    setQuotas(prev => ({ ...prev, [cat]: Math.max(0, (prev[cat] || 0) + delta) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('match_requests').insert([{
        coach_id: user?.id, type, category: mainCategory,
        desired_level: desiredLevel, availability_window: availability,
        date, time: startTime, city: city.toUpperCase(), stadium: stadium.toUpperCase(),
        travel_preference: travelPreference, radius_km: travelPreference === 'away' ? distanceMax : null,
        quotas: type !== 'Match Amical' ? quotas : null,
        comment: comment.toUpperCase(), status: 'OPEN'
      }]);
      if (error) throw error;
      alert("✅ SIGNAL ENVOYÉ !");
      router.push('/radar');
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const styles = {
    card: `bg-[#0A0A15] border-2 ${m.border} ${m.glow} rounded-[2.5rem] p-6 space-y-6 transition-all duration-500 shadow-2xl`,
    input: `w-full bg-white/5 rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-white/20 transition-all text-white uppercase`,
    label: `text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${m.text}`
  };

  return (
    <div className="min-h-screen max-w-md mx-auto pb-40 bg-[#050510] font-sans overflow-x-hidden">
      <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 py-6 px-6 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white active:scale-90"><ChevronLeft size={28} strokeWidth={3} /></button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">PUBLIER_ANNONCE</h1>
      </header>

      <form onSubmit={handleSubmit} className="p-5 space-y-10 text-left animate-in fade-in duration-700">

        {/* 1. JE PROPOSE (TYPE) */}
        <section className={styles.card}>
           <div className="space-y-4">
              <label className={styles.label}><Trophy size={14}/> JE PROPOSE</label>
              <div className="flex gap-2 p-1 bg-black/40 rounded-[1.5rem] border border-white/5">
                 {(['Match Amical', 'Plateau', 'Tournoi'] as AnnouncementType[]).map(t => (
                   <button key={t} type="button" onClick={() => { setType(t); setIsCategoryOpen(false); }} className={`flex-1 py-4 rounded-xl text-[8px] font-black uppercase transition-all ${type === t ? `${THEME[t].primary} text-black shadow-xl scale-105` : 'text-white/20 hover:text-white/40'}`}>{t}</button>
                 ))}
              </div>
           </div>
        </section>

        {/* 2. CATÉGORIE & QUOTAS */}
        <section className={styles.card}>
           <label className={styles.label}><Layers size={14}/> CATÉGORIE</label>

           {type === 'Tournoi' ? (
             <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                   {currentCategories.map(cat => (
                     <button key={cat.value} type="button" onClick={() => updateQuota(cat.value, (quotas[cat.value] ? -quotas[cat.value] : 1))} className={`px-4 py-3 rounded-2xl text-[10px] font-black transition-all ${quotas[cat.value] > 0 ? `${m.primary} text-black shadow-lg scale-110` : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>{cat.label}</button>
                   ))}
                </div>
                {Object.keys(quotas).filter(k => quotas[k] > 0).map(k => (
                  <div key={k} className={`flex items-center justify-between p-4 bg-black/40 rounded-2xl border ${m.border}/20 animate-in slide-in-from-bottom-2`}>
                     <span className={`text-sm font-black ${m.text}`}>{k}</span>
                     <div className="flex items-center gap-5">
                        <button type="button" onClick={() => updateQuota(k, -1)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 active:bg-red-500/20"><Minus size={16}/></button>
                        <span className="text-xl font-black w-6 text-center text-white">{quotas[k]}</span>
                        <button type="button" onClick={() => updateQuota(k, 1)} className={`w-10 h-10 rounded-xl ${m.primary} flex items-center justify-center text-black shadow-lg`}><Plus size={16}/></button>
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="space-y-6">
                <div className="relative">
                   <button type="button" onClick={() => setIsCategoryOpen(!isCategoryOpen)} className="w-full bg-white/5 rounded-2xl p-5 text-sm font-black flex items-center justify-between border-2 border-white/5">
                      <span className="uppercase text-white">{mainCategory || 'SÉLECTIONNER...'}</span>
                      <ChevronDown size={20} className={`${m.text} transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                   </button>
                   {isCategoryOpen && (
                     <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-[#111120] rounded-[2rem] border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                        {currentCategories.map((cat, idx) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => { setCategory(cat.value); setIsCategoryOpen(false); }}
                            className={`w-full p-5 text-left text-xs font-black uppercase flex items-center justify-between transition-colors
                              ${idx !== currentCategories.length - 1 ? 'border-b border-white/5' : ''}
                              ${mainCategory === cat.value ? `bg-white/10 ${m.text}` : 'text-white hover:bg-white/5'}
                            `}
                          >
                            <span>{cat.label}</span>
                            {mainCategory === cat.value && <Check size={14} className={m.text} />}
                          </button>
                        ))}
                     </div>
                   )}
                </div>
                {type === 'Plateau' && mainCategory && (
                   <div className={`flex items-center justify-between p-4 bg-black/40 rounded-2xl border ${m.border}/20`}>
                      <p className="text-[10px] font-black uppercase text-white/40">Nombre d'équipes</p>
                      <div className="flex items-center gap-5">
                        <button type="button" onClick={() => updateQuota(mainCategory, -1)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40"><Minus size={16}/></button>
                        <span className="text-xl font-black w-6 text-center text-white">{quotas[mainCategory] || 1}</span>
                        <button type="button" onClick={() => updateQuota(mainCategory, 1)} className={`w-10 h-10 rounded-xl ${m.primary} flex items-center justify-center text-black shadow-lg`}><Plus size={16}/></button>
                      </div>
                   </div>
                )}
             </div>
           )}
        </section>

        {/* 3. LIEU & GPS */}
        <section className={styles.card}>
           <label className={styles.label}><Navigation size={14}/> LIEU</label>
           <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
              <ToggleButton active={travelPreference === 'home'} onClick={() => handleTravelChange('home')} label="Je reçois" icon={<HomeIcon size={16} />} m={m} />
              <ToggleButton active={travelPreference === 'away'} onClick={() => handleTravelChange('away')} label="Déplacement" icon={<Navigation size={16} />} m={m} />
              <ToggleButton active={travelPreference === 'both'} onClick={() => handleTravelChange('both')} label="Les deux" icon={<Shield size={16} />} m={m} />
           </div>
           {travelPreference === 'away' ? (
             <div className="pt-4 space-y-4">
                <div className="flex justify-between items-end">
                   <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rayon de projection</label>
                   <span className={`text-2xl font-black ${m.text} italic`}>{distanceMax} KM</span>
                </div>
                <input type="range" min="5" max="100" step="5" value={distanceMax} onChange={e => setDistanceMax(parseInt(e.target.value))} className={`w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-current ${m.text}`} />
             </div>
           ) : (
             <div className="space-y-4 pt-2">
                <input placeholder="VILLE (EX: SÈTE)" value={city} onChange={e => setCity(e.target.value)} className={styles.input} />
                <input placeholder="NOM DU STADE" value={stadium} onChange={e => setStadium(e.target.value)} className={styles.input} />
             </div>
           )}
        </section>

        {/* 4. DATE ET HEURE */}
        <section className={styles.card}>
           <label className={styles.label}><Clock size={14}/> DATE ET HEURE</label>
           <div className="grid grid-cols-2 gap-4">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} />
           </div>
           <input placeholder="FENÊTRE (EX: MERCREDI PROCHAIN)" value={availability} onChange={e => setAvailability(e.target.value)} className={styles.input} />
        </section>

        {/* 5. BRIEFING */}
        <section className="space-y-4">
          <label className={styles.label}>INFORMATIONS COMPLÉMENTAIRES</label>
          <textarea placeholder="EX: FOOT À 11, NIVEAU EXCELLENCE, PRÉVOIR PIQUE-NIQUE..." value={comment} onChange={e => setComment(e.target.value)} className={`w-full h-40 bg-[#0A0A15] border-2 ${m.border}/20 rounded-[2.5rem] p-8 text-sm font-medium text-white outline-none focus:${m.border} transition-all shadow-inner`} />
        </section>

        <button type="submit" disabled={isLoading} className={`w-full ${m.primary} text-black font-black py-7 rounded-[3rem] active:scale-95 transition-all flex items-center justify-center gap-5 uppercase italic text-2xl shadow-2xl ${m.glow}`}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Send size={30} strokeWidth={4} />}
          PUBLIER L'ANNONCE
        </button>
      </form>
    </div>
  );
}

export default function NewSignalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050510] flex items-center justify-center text-neon-cyan font-black uppercase italic tracking-widest">NEXUS_LINK_SYNC...</div>}>
      <NewSignalContent />
    </Suspense>
  );
}

function ToggleButton({ active, onClick, label, icon, m }: any) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${active ? `${m.primary} text-black shadow-lg scale-105` : 'text-white/20 hover:text-white/40'}`}>
      {icon}
      <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
