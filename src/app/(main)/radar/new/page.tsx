'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import {
  ChevronLeft, Calendar, Clock, Shield, Navigation,
  Home as HomeIcon, Trophy, Layout, Send, Loader2, Layers, MapPin, Target, Plus, Minus, ChevronDown, Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type AnnouncementType = 'Match Amical' | 'Tournoi' | 'Plateau';

// --- COULEURS TACTIQUES OFFICIELLES ---
const MISSION_THEME: Record<AnnouncementType, {
  primary: string;
  glow: string;
  text: string;
  badge: string;
}> = {
  'Match Amical': { primary: 'bg-[#39FF14]', glow: 'shadow-[0_0_15px_#39FF1466]', text: 'text-[#39FF14]', badge: 'bg-[#39FF14]/10' },
  'Plateau': { primary: 'bg-blue-500', glow: 'shadow-[0_0_15px_#3b82f666]', text: 'text-blue-500', badge: 'bg-blue-500/10' },
  'Tournoi': { primary: 'bg-red-600', glow: 'shadow-[0_0_15px_#dc262666]', text: 'text-red-600', badge: 'bg-red-600/10' }
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
  const [endTime, setEndTime] = useState('');
  const [city, setCity] = useState('');
  const [stadium, setStadium] = useState('');
  const [distanceMax, setDistanceMax] = useState(30);
  const [comment, setComment] = useState('');
  const [travelPreference, setTravelPreference] = useState<'home' | 'away' | 'both'>('home');
  const [quotas, setQuotas] = useState<Record<string, number>>({});

  const m = MISSION_THEME[type];

  // --- LISTES DES CATÉGORIES (DISTRICT COMPLIANT) ---
  const categoriesAmical = [
    { label: 'U12/U13', value: 'U13' }, { label: 'U14/U15', value: 'U15' },
    { label: 'U16/U17', value: 'U17' }, { label: 'SÉNIORS', value: 'SÉNIORS' },
    { label: 'VÉTÉRANS', value: 'VÉTÉRANS' }
  ];

  const categoriesPlateau = [
    { label: 'U6/U7', value: 'U7' }, { label: 'U8/U9', value: 'U9' },
    { label: 'U10/U11', value: 'U11' }, { label: 'U12/U13', value: 'U13' }
  ];

  const categoriesTournoi = [
    { label: 'U6', value: 'U6' }, { label: 'U7', value: 'U7' }, { label: 'U8', value: 'U8' },
    { label: 'U9', value: 'U9' }, { label: 'U10', value: 'U10' }, { label: 'U11', value: 'U11' },
    { label: 'U12', value: 'U12' }, { label: 'U13', value: 'U13' }, { label: 'U14', value: 'U14' },
    { label: 'U15', value: 'U15' }, { label: 'U16', value: 'U16' }, { label: 'U17', value: 'U17' }
  ];

  const currentCategories = type === 'Plateau' ? categoriesPlateau : type === 'Tournoi' ? categoriesTournoi : categoriesAmical;

  // Sync Profil Coach
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
      alert("✅ ANNONCE PUBLIÉE !");
      router.push('/radar');
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const styles = {
    card: 'bg-white border-gray-100 rounded-[2rem] p-6 shadow-sm border space-y-6',
    input: 'w-full bg-gray-100 rounded-xl p-4 text-xs font-black outline-none border-2 border-transparent focus:border-orange-500 focus:bg-white transition-all text-gray-900 uppercase'
  };

  return (
    <main className="min-h-screen max-w-md mx-auto pb-40 bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-100 py-6 px-6 sticky top-0 z-40 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-900"><ChevronLeft size={28} strokeWidth={3} /></button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Lancer_Signal</h1>
      </header>

      <form onSubmit={handleSubmit} className="p-5 space-y-8 text-left">

        {/* 1. JE PROPOSE (TYPE) */}
        <section className={styles.card}>
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400">Je propose</label>
              <div className="flex gap-2">
                 {(['Match Amical', 'Plateau', 'Tournoi'] as AnnouncementType[]).map(t => (
                   <button key={t} type="button" onClick={() => { setType(t); setIsCategoryOpen(false); }} className={`flex-1 py-3 rounded-xl text-[8px] font-black border-2 transition-all ${type === t ? `${MISSION_THEME[t].primary} border-transparent text-white shadow-lg` : 'bg-gray-100 text-gray-500 border-transparent'}`}>{t}</button>
                 ))}
              </div>
           </div>
        </section>

        {/* 2. CATÉGORIE & QUOTAS */}
        <section className={styles.card}>
           <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400"><Layers size={14} className={m.text}/> Catégorie</label>

           {type === 'Tournoi' ? (
             <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                   {currentCategories.map(cat => (
                     <button key={cat.value} type="button" onClick={() => updateQuota(cat.value, (quotas[cat.value] ? -quotas[cat.value] : 1))} className={`px-3 py-2 rounded-xl text-[9px] font-black transition-all ${quotas[cat.value] > 0 ? `${m.primary} text-white shadow-md` : 'bg-gray-100 text-gray-500'}`}>{cat.label}</button>
                   ))}
                </div>
                {Object.keys(quotas).filter(k => quotas[k] > 0).map(k => (
                  <div key={k} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-left-2">
                     <span className="text-[10px] font-black text-orange-600">{k}</span>
                     <div className="flex items-center gap-4">
                        <button type="button" onClick={() => updateQuota(k, -1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center"><Minus size={12}/></button>
                        <span className="text-sm font-black w-4 text-center">{quotas[k]}</span>
                        <button type="button" onClick={() => updateQuota(k, 1)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-orange-600 shadow-sm"><Plus size={12}/></button>
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="relative">
                <button type="button" onClick={() => setIsCategoryOpen(!isCategoryOpen)} className="w-full bg-gray-100 rounded-xl p-4 text-xs font-black flex items-center justify-between">
                   <span>{mainCategory || 'Sélectionner...'}</span>
                   <ChevronDown size={16} />
                </button>
                {isCategoryOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                     {currentCategories.map(cat => (
                       <button key={cat.value} type="button" onClick={() => { setCategory(cat.value); setIsCategoryOpen(false); }} className="w-full p-4 text-left text-xs font-black uppercase border-b border-gray-50 hover:bg-gray-50">{cat.label}</button>
                     ))}
                  </div>
                )}
             </div>
           )}
        </section>

        {/* 3. LIEU & GPS */}
        <section className={styles.card}>
           <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400"><Navigation size={14} className={m.text}/> Lieu</label>
           <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
              <ToggleButton active={travelPreference === 'home'} onClick={() => handleTravelChange('home')} label="Je reçois" icon={<HomeIcon size={16} />} />
              <ToggleButton active={travelPreference === 'away'} onClick={() => handleTravelChange('away')} label="Déplacement" icon={<Navigation size={16} />} />
              <ToggleButton active={travelPreference === 'both'} onClick={() => handleTravelChange('both')} label="Les deux" icon={<Shield size={16} />} />
           </div>
           {travelPreference === 'away' ? (
             <div className="pt-2 animate-in fade-in">
                <div className="flex justify-between items-end mb-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase">Distance Max</label>
                   <span className="text-sm font-black text-orange-600">{distanceMax} KM</span>
                </div>
                <input type="range" min="5" max="100" step="5" value={distanceMax} onChange={e => setDistanceMax(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-orange-600" />
             </div>
           ) : (
             <div className="space-y-4 pt-2">
                <input placeholder="VILLE..." value={city} onChange={e => setCity(e.target.value)} className={styles.input} />
                <input placeholder="STADE..." value={stadium} onChange={e => setStadium(e.target.value)} className={styles.input} />
             </div>
           )}
        </section>

        {/* 4. DATE ET HEURE */}
        <section className={styles.card}>
           <label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400"><Clock size={14} className={m.text}/> Date et Heure</label>
           <div className="grid grid-cols-2 gap-4">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} />
           </div>
        </section>

        <button type="submit" disabled={isLoading} className={`w-full ${m.primary} ${m.glow} text-white font-black py-6 rounded-[3rem] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase italic text-xl`}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Send size={24} strokeWidth={3} />}
          Publier l'Annonce
        </button>
      </form>
    </main>
  );
}

export default function NewSignalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-neon-cyan font-black uppercase">Sync_Signal...</div>}>
      <NewSignalContent />
    </Suspense>
  );
}

function ToggleButton({ active, onClick, label, icon }: any) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all border-2 ${active ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'border-transparent text-gray-400'}`}>
      {icon}
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
