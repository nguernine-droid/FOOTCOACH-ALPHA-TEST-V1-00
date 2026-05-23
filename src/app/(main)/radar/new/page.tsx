'use client';

import React, { useState, useRef } from 'react';
import {
  ChevronLeft, Calendar, Clock, Shield, Navigation,
  Home as HomeIcon, Info, Trophy, Layout, Send, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

type AnnouncementType = 'Match Amical' | 'Tournoi' | 'Plateau';

/**
 * NEW_SIGNAL_PAGE (v7.2 - ALPHA TEST V1)
 * Création réelle d'une annonce dans public.match_requests
 */
export default function NewSignalPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';
  const [isLoading, setIsLoading] = useState(false);

  const styles = isPro ? {
    mainBg: 'bg-gray-50',
    cardBg: 'bg-white border-gray-100 shadow-sm',
    text: 'text-gray-900',
    textSub: 'text-gray-400',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-600 text-white',
    inputBg: 'bg-gray-100 border-gray-100 focus:ring-blue-500/20',
    typeCard: (id: string) => {
      const map: Record<string, string> = { 'Match Amical': 'bg-blue-600', 'Tournoi': 'bg-indigo-600', 'Plateau': 'bg-green-600' };
      return map[id] || 'bg-gray-600';
    }
  } : {
    mainBg: 'bg-black',
    cardBg: 'bg-white/5 border-white/10',
    text: 'text-white',
    textSub: 'text-gray-500',
    accent: 'text-neon-cyan',
    accentBg: 'bg-neon-cyan text-black shadow-[0_0_20px_#00F0FF]',
    inputBg: 'bg-white/5 border-white/10 focus:ring-neon-cyan/20 focus:border-neon-cyan',
    typeCard: (id: string) => {
      const map: Record<string, string> = { 'Match Amical': 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan', 'Tournoi': 'bg-neon-magenta/20 border-neon-magenta/50 text-neon-magenta', 'Plateau': 'bg-[#39FF14]/20 border-[#39FF14]/50 text-[#39FF14]' };
      return map[id] || 'bg-white/5 border-white/10';
    }
  };

  const [type, setType] = useState<AnnouncementType>('Match Amical');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [travelPreference, setTravelPreference] = useState<'home' | 'away' | 'both'>('home');

  const types = [
    { id: 'Match Amical' as const, label: 'Match Amical', icon: <HomeIcon size={20} /> },
    { id: 'Tournoi' as const, label: 'Tournoi', icon: <Trophy size={20} /> },
    { id: 'Plateau' as const, label: 'Plateau', icon: <Layout size={20} /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Veuillez vous reconnecter.");

      // On force la catégorie et le club depuis le profil pour éviter les erreurs
      const { error } = await supabase
        .from('match_requests')
        .insert([{
          coach_id: user.id,
          type,
          category: teamInfo?.category || 'U13',
          date,
          time,
          location: travelPreference === 'home' ? (teamInfo?.clubName || 'Ma Base') : 'À définir (Déplacement)',
          comment,
          status: 'OPEN'
        }]);

      if (error) throw error;
      alert("✅ SIGNAL_ÉMIS : Votre annonce est maintenant visible sur tous les radars du secteur !");
      router.push('/radar');
    } catch (err: any) {
      alert("Erreur lors de l'émission : " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`min-h-screen max-w-md mx-auto shadow-2xl pb-20 font-sans ${styles.mainBg}`}>
      <header className={`${isPro ? 'bg-white border-gray-100' : 'bg-black/80 backdrop-blur-xl border-white/10'} py-4 px-6 sticky top-0 z-10 border-b flex items-center gap-4`}>
        <button onClick={() => router.back()} className={`${styles.text} active:scale-90 transition-transform`}><ChevronLeft size={24} strokeWidth={3} /></button>
        <h1 className={`text-xl font-black uppercase italic tracking-tighter ${styles.text}`}>Lancer_Signal</h1>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* TYPE SELECTOR */}
        <section className="grid grid-cols-3 gap-2">
          {types.map((t) => (
            <button key={t.id} type="button" onClick={() => setType(t.id)} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${type === t.id ? (isPro ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]') : 'border-white/5 bg-white/5 text-gray-500'}`}>
              {t.icon}
              <span className="text-[8px] font-black uppercase">{t.label}</span>
            </button>
          ))}
        </section>

        {/* LOGISTIQUE */}
        <section className="space-y-3 text-left">
          <h3 className={`px-2 text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Lieu du match</h3>
          <div className={`${styles.cardBg} rounded-2xl p-2 border flex gap-1`}>
             <ToggleButton active={travelPreference === 'home'} onClick={() => setTravelPreference('home')} label="Je reçois" icon={<HomeIcon size={16} />} isPro={isPro} styles={styles} />
             <ToggleButton active={travelPreference === 'away'} onClick={() => setTravelPreference('away')} label="Je me déplace" icon={<Navigation size={16} />} isPro={isPro} styles={styles} />
             <ToggleButton active={travelPreference === 'both'} onClick={() => setTravelPreference('both')} label="Les deux" icon={<Shield size={16} />} isPro={isPro} styles={styles} />
          </div>
        </section>

        {/* DATE & HEURE */}
        <section className={`${styles.cardBg} rounded-2xl p-6 border grid grid-cols-2 gap-4 text-left`}>
            <div className="space-y-2">
              <label className={`text-[9px] font-bold uppercase flex items-center gap-1.5 ${styles.textSub}`}><Calendar size={12}/> Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={`w-full ${styles.inputBg} rounded-xl p-3 text-xs font-black outline-none border`} />
            </div>
            <div className="space-y-2">
              <label className={`text-[9px] font-bold uppercase flex items-center gap-1.5 ${styles.textSub}`}><Clock size={12}/> Heure</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className={`w-full ${styles.inputBg} rounded-xl p-3 text-xs font-black outline-none border`} />
            </div>
        </section>

        {/* COMMENTAIRE */}
        <section className="space-y-3 text-left">
          <h3 className={`px-2 text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Infos Mission</h3>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Précisez vos besoins..." className={`w-full ${styles.cardBg} border rounded-2xl p-4 text-sm font-medium outline-none min-h-[100px] resize-none transition-all`} />
        </section>

        <button type="submit" disabled={isLoading} className={`w-full ${styles.accentBg} font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase italic text-lg`}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Send size={24} strokeWidth={3} />}
          {isPro ? "Publier l'annonce" : "Émettre le Signal"}
        </button>
      </form>
    </main>
  );
}

function ToggleButton({ active, onClick, label, icon, isPro, styles }: any) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all border-2 ${active ? (isPro ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan shadow-[0_0_10px_#00F0FF33]') : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
      {icon}
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
