'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Shield,
  ChevronRight,
  Trophy,
  CheckCircle2,
  MapPin,
  User,
  Fingerprint,
  Lock,
  Zap,
  Briefcase,
  Loader2,
  Search,
  Plus
} from 'lucide-react';
import { ScanlinesOverlay } from '@/components/ui/cyber/ScanlinesOverlay';
import { useTeam } from '@/lib/context/TeamContext';

interface Club {
  id: string;
  name: string;
  category: string;
}

/**
 * ONBOARDING (v7.5 - ALPHA TEST V1)
 * "Complète ton profil" - Version simplifiée 100% stable.
 * Suppression du pré-remplissage automatique pour éviter les blocages.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { refreshData } = useTeam();
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'classic' | 'nexus'>('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPro = selectedTheme === 'classic';
  const neonHex = selectedTheme === 'nexus' ? '#00F0FF' : '#FF6B00';

  const [department] = useState('Hérault (34)');
  const [season] = useState('2026/2027');

  // Champs vides par défaut pour une stabilité totale
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');

  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // --- LOGIQUE CLUB ---
  const [allClubs, setClubs] = useState<Club[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isClubMenuOpen, setIsClubListOpen] = useState(false);

  const filteredClubs = useMemo(() => {
    if (!clubSearch.trim()) return [];
    return allClubs.filter(c =>
      c.name.toLowerCase().includes(clubSearch.toLowerCase())
    ).slice(0, 5);
  }, [allClubs, clubSearch]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await supabase.from('clubs').select('id, name, category').order('name');
      if (data) setClubs(data);
    };
    init();
  }, [router]);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();

    const clubName = selectedClub ? selectedClub.name : clubSearch.trim();

    if (!acceptCGU || !acceptPrivacy || !firstName || !lastName || !clubName) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires (Nom, Prénom, Club).");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      let clubId = selectedClub?.id;

      // Création auto du club si nouveau nom saisi
      if (!clubId && clubName) {
        const { data: newClub, error: cErr } = await supabase
          .from('clubs')
          .insert([{ name: clubName, category: 'Mixte' }])
          .select()
          .single();

        if (cErr) throw new Error("Erreur lors de la création du club.");
        clubId = newClub.id;
      }

      // Mise à jour Profil
      const { error: pErr } = await supabase.from('profiles').upsert([{
        id: user.id,
        role: 'coach',
        first_name: firstName,
        last_name: lastName,
        nickname: nickname,
        bio: bio,
        phone: phone,
        coach_category: category,
        coach_level: level,
        club_id: clubId,
        theme_preference: selectedTheme
      }]);

      if (pErr) {
        console.error("Supabase Upsert Error:", pErr);
        throw new Error(`Erreur Supabase: ${pErr.message}`);
      }

      localStorage.setItem('user_role', 'coach');
      localStorage.setItem('app_theme', selectedTheme);

      await refreshData();

      // On force le rechargement pour initialiser proprement le cockpit
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) return <BionicAccessAnimation theme={selectedTheme} onComplete={() => router.push('/dashboard')} />;

  return (
    <div className="w-full pb-20 px-4">
      <ScanlinesOverlay />

      <div className="text-center mb-12 mt-8">
        <div className="inline-block p-4 rounded-3xl border-2 mb-4 transition-all duration-500" style={{ borderColor: neonHex, backgroundColor: `${neonHex}1A` }}>
          <User style={{ color: neonHex }} size={40} />
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Complète ton profil</h1>
        <p className="text-[9px] font-black text-[#39FF14] uppercase tracking-[0.4em] mt-2">
          Nexus_OS // Unité_Tactique
        </p>
      </div>

      <form onSubmit={handleFinish} className="max-w-sm mx-auto space-y-8">
        {/* IDENTITÉ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <User size={14} className="text-[#39FF14]" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60">Identité Coach</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="NOM" value={lastName} onChange={e => setLastName(e.target.value.toUpperCase())} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
            <input required placeholder="PRÉNOM" value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
          </div>
          <input placeholder="SURNOM / PSEUDO" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
          <textarea placeholder="PRÉSENTATION RAPIDE..." value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-medium text-white outline-none focus:border-[#39FF14] min-h-[80px]" />
          <input placeholder="TÉLÉPHONE" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
        </div>

        {/* CLUB */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Trophy size={14} className="text-[#39FF14]" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60">Ton Club / Unité</h2>
          </div>
          <div className="relative">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                placeholder="RECHERCHER OU SAISIR..."
                value={selectedClub ? selectedClub.name : clubSearch}
                onChange={(e) => {
                  setClubSearch(e.target.value);
                  setIsClubListOpen(true);
                  if (selectedClub) setSelectedClub(null);
                }}
                className={`w-full bg-white/5 border border-white/20 rounded-xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-[#39FF14] uppercase ${selectedClub ? 'border-neon-green text-neon-green' : ''}`}
              />
              {selectedClub && <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neon-green" />}
            </div>
            {isClubMenuOpen && (clubSearch.trim()) && (
              <div className="absolute z-50 w-full mt-2 bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {filteredClubs.map(club => (
                  <button key={club.id} type="button" onClick={() => { setSelectedClub(club); setClubSearch(''); setIsClubListOpen(false); }} className="w-full p-4 text-left hover:bg-white/5 border-b border-white/5 last:border-0">
                    <p className="text-xs font-black text-white uppercase italic">{club.name}</p>
                    <p className="text-[8px] text-white/40 uppercase font-bold">{department}</p>
                  </button>
                ))}
                {!allClubs.some(c => c.name.toLowerCase() === clubSearch.toLowerCase()) && (
                  <button type="button" onClick={() => setIsClubListOpen(false)} className="w-full p-4 text-left hover:bg-white/10 text-neon-cyan">
                    <div className="flex items-center gap-2">
                      <Plus size={14} />
                      <p className="text-xs font-black uppercase italic">Créer "{clubSearch}"</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
             <input required placeholder="CATÉGORIE (Ex: U13)" value={category} onChange={e => setCategory(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
             <input required placeholder="NIVEAU (Ex: D1)" value={level} onChange={e => setLevel(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
          </div>
        </div>

        {/* THÈME */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Zap size={14} className="text-[#39FF14]" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-white/60">Style d'interface</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setSelectedTheme('classic')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedTheme === 'classic' ? 'bg-neon-orange/10 border-neon-orange' : 'border-white/5 opacity-40'}`}>
              <Briefcase size={20} className="text-neon-orange" />
              <span className="text-[9px] font-black text-white uppercase">MODE PRO</span>
            </button>
            <button type="button" onClick={() => setSelectedTheme('nexus')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedTheme === 'nexus' ? 'bg-neon-cyan/10 border-neon-cyan' : 'border-white/5 opacity-40'}`}>
              <Zap size={20} className="text-neon-cyan" />
              <span className="text-[9px] font-black text-white uppercase">MODE NEXUS</span>
            </button>
          </div>
        </div>

        {/* CONFORMITÉ */}
        <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={acceptCGU} onChange={e => setAcceptCGU(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-black border-white/20" />
            <span className="text-[9px] text-white/50 uppercase font-bold leading-tight">J'accepte les CGU.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-black border-white/20" />
            <span className="text-[9px] text-white/50 uppercase font-bold leading-tight">J'accepte la Politique de Confidentialité.</span>
          </label>
        </div>

        {errorMessage && <p className="text-center text-[10px] font-black text-red-500 uppercase">{errorMessage}</p>}

        <button type="submit" disabled={isLoading} className={`w-full py-6 rounded-2xl font-black uppercase italic text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${acceptCGU && acceptPrivacy && (selectedClub || clubSearch.trim()) ? (selectedTheme === 'nexus' ? 'bg-neon-cyan text-black' : 'bg-neon-orange text-white') : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
          {isLoading ? <Loader2 className="animate-spin" /> : "ACTIVER MON COMPTE"}
          {!isLoading && <ChevronRight size={24} />}
        </button>
      </form>
    </div>
  );
}

function BionicAccessAnimation({ theme, onComplete }: { theme: 'classic' | 'nexus', onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-10 text-center">
      <div className="relative">
        <div className={`w-32 h-32 rounded-full border-4 animate-ping absolute inset-0 ${theme === 'nexus' ? 'border-neon-cyan' : 'border-neon-orange'} opacity-20`} />
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center relative z-10 ${theme === 'nexus' ? 'border-neon-cyan' : 'border-neon-orange'} shadow-[0_0_30px_currentColor]`}>
          <CheckCircle2 size={64} className={theme === 'nexus' ? 'text-neon-cyan' : 'text-neon-orange'} />
        </div>
      </div>
      <div className="mt-12 space-y-4">
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Accès_Autorisé</h2>
        <div className="flex justify-center items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
           <p className="text-[10px] font-mono text-[#39FF14] uppercase tracking-[0.4em]">Initialisation Alpha Test...</p>
        </div>
      </div>
    </div>
  );
}
