'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Calendar, Clock, Shield, Navigation,
  Trophy, Layers, Send, Loader2, Plus, Check, Zap, AlertTriangle, Edit3
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type AnnouncementType = 'Match Amical' | 'Tournoi' | 'Plateau';

const THEME: Record<AnnouncementType, { primary: string; glow: string; text: string; border: string }> = {
  'Match Amical': { primary: 'bg-[#16a34a]', glow: 'shadow-[0_0_20px_#16a34a66]', text: 'text-[#16a34a]', border: 'border-[#16a34a]' },
  'Plateau': { primary: 'bg-blue-600', glow: 'shadow-[0_0_20px_#2563eb66]', text: 'text-blue-500', border: 'border-blue-600' },
  'Tournoi': { primary: 'bg-red-600', glow: 'shadow-[0_0_20px_#dc262666]', text: 'text-red-600', border: 'border-red-600' }
};

function NewSignalContent() {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const [isLoading, setIsLoading] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // --- ÉTATS FORMULAIRE ---
  const [type, setType] = useState<AnnouncementType>('Match Amical');
  const [mainCategory, setCategory] = useState(teamInfo?.category || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [city, setCity] = useState(teamInfo?.clubCity || '');
  const [stadium, setStadium] = useState(teamInfo?.clubStadium || '');
  const [comment, setComment] = useState('');
  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // --- LOGIQUE ÉDITION (SOLUTION CAPITAINE) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id');
    if (matchId) {
      setEditingMatchId(matchId);
      supabase.from('match_requests').select('*').eq('id', matchId).single()
        .then(({ data }) => {
          if (data) {
            setType(data.type as AnnouncementType);
            setCategory(data.category);
            setDate(data.date);
            setStartTime(data.time);
            setCity(data.city || '');
            setStadium(data.stadium || '');
            setComment(data.comment || '');
            if (data.quotas) setQuotas(data.quotas);
          }
        });
    }
  }, []);

  const isPlateauAllowed = useMemo(() => {
    if (!mainCategory) return true;
    const age = parseInt(mainCategory.replace(/\D/g, ''));
    return isNaN(age) || age <= 13;
  }, [mainCategory]);

  useEffect(() => {
    if (!isPlateauAllowed && type === 'Plateau') setType('Match Amical');
  }, [isPlateauAllowed, type]);

  const m = THEME[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const matchData = {
        coach_id: user.id,
        type,
        category: mainCategory,
        date,
        time: startTime,
        city: city.toUpperCase(),
        stadium: stadium.toUpperCase(),
        quotas: type !== 'Match Amical' ? quotas : null,
        comment: comment.toUpperCase()
      };

      let error;
      if (editingMatchId) {
        // MODE ÉDITION → UPDATE
        ({ error } = await supabase.from('match_requests')
          .update(matchData)
          .eq('id', editingMatchId));
      } else {
        // MODE CRÉATION → INSERT
        ({ error } = await supabase.from('match_requests')
          .insert([{ ...matchData, status: 'OPEN' }]));
      }

      if (error) {
        if (error.code === 'P0001') throw new Error(error.message); // Capturer l'exception du trigger SQL
        throw error;
      }

      alert(editingMatchId ? "✅ MATCH MIS À JOUR !" : "✅ ANNONCE PUBLIÉE !");
      router.push('/radar');
    } catch (err: any) {
      alert(err.message);
      setIsLoading(false);
    }
  };

  const styles = {
    card: `bg-[#0A0A15] border-2 ${m.border} ${m.glow} rounded-[2.5rem] p-6 space-y-6 transition-all duration-500 shadow-2xl`,
    input: `w-full bg-white/5 rounded-2xl p-5 text-sm font-black outline-none border-2 border-transparent focus:border-white/20 transition-all text-white uppercase`,
    label: `text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${m.text}`
  };

  return (
    <div className="min-h-screen max-w-md mx-auto pb-40 bg-[#050510] font-sans overflow-x-hidden">
      <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 py-6 px-6 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white active:scale-90"><ChevronLeft size={28} strokeWidth={3} /></button>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
          {editingMatchId ? 'MODIFIER_SIGNAL' : 'PUBLIER_ANNONCE'}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="p-5 space-y-10 text-left animate-in fade-in duration-700">
        <section className={styles.card}>
           <div className="space-y-4">
              <label className={styles.label}><Trophy size={14}/> TYPE DE MISSION</label>
              <div className="flex gap-2 p-1 bg-black/40 rounded-[1.5rem] border border-white/5">
                 {(['Match Amical', 'Plateau', 'Tournoi'] as AnnouncementType[]).map(t => (
                   <button
                     key={t} type="button"
                     disabled={t === 'Plateau' && !isPlateauAllowed}
                     onClick={() => setType(t)}
                     className={`flex-1 py-4 rounded-xl text-[8px] font-black uppercase transition-all ${type === t ? `${THEME[t].primary} text-white shadow-xl scale-105` : 'text-white/20 hover:text-white/40'} ${t === 'Plateau' && !isPlateauAllowed ? 'opacity-10 grayscale cursor-not-allowed' : ''}`}
                   >
                     {t}
                   </button>
                 ))}
              </div>
           </div>
        </section>

        <section className={styles.card}>
           <label className={styles.label}><Layers size={14}/> CATÉGORIE</label>
           <input value={mainCategory} onChange={e => setCategory(e.target.value.toUpperCase())} className={styles.input} placeholder="EX: U13, SÉNIORS..." />
        </section>

        <section className={styles.card}>
           <label className={styles.label}><Navigation size={14}/> LOGISTIQUE</label>
           <input placeholder="VILLE" value={city} onChange={e => setCity(e.target.value.toUpperCase())} className={styles.input} />
           <input placeholder="STADE" value={stadium} onChange={e => setStadium(e.target.value.toUpperCase())} className={styles.input} />
           <div className="grid grid-cols-2 gap-4">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} />
           </div>
        </section>

        <section className={styles.card}>
          <label className={styles.label}>CONSIGNES</label>
          <textarea placeholder="EX: NIVEAU D1, RECHERCHE CLUB SÉRIEUX..." value={comment} onChange={e => setComment(e.target.value)} className={`w-full h-32 bg-white/5 rounded-[2.5rem] p-6 text-sm font-medium text-white outline-none border-2 border-transparent focus:border-white/20 transition-all`} />
        </section>

        <button type="submit" disabled={isLoading} className={`w-full ${m.primary} text-white font-black py-7 rounded-[3rem] active:scale-95 transition-all flex items-center justify-center gap-5 uppercase italic text-2xl shadow-2xl ${m.glow}`}>
          {isLoading ? <Loader2 className="animate-spin" /> : editingMatchId ? <Edit3 size={30} strokeWidth={4} /> : <Send size={30} strokeWidth={4} />}
          {editingMatchId ? 'METTRE À JOUR' : 'PUBLIER L\'ANNONCE'}
        </button>
      </form>
    </div>
  );
}

export default function NewSignalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050510] flex items-center justify-center text-neon-cyan font-black uppercase italic tracking-widest">SYNC_FOOTCOACH...</div>}>
      <NewSignalContent />
    </Suspense>
  );
}
