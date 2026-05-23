'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronLeft,
  User,
  Shield,
  Trophy,
  CheckCircle2,
  MapPin,
  Zap,
  Briefcase,
  Loader2,
  Search,
  Plus,
  Save,
  Camera
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';

interface Club {
  id: string;
  name: string;
  category: string;
}

/**
 * EDIT_PROFILE_PAGE (v1.0 - ALPHA TEST V1)
 * Page complète de modification du profil Coach.
 */
export default function EditProfilePage() {
  const router = useRouter();
  const { teamInfo, theme, refreshData } = useTeam();
  const isPro = theme === 'classic';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<'classic' | 'nexus'>('classic');

  // Club Logic
  const [allClubs, setClubs] = useState<Club[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isClubMenuOpen, setIsClubListOpen] = useState(false);

  // Initialisation des données
  useEffect(() => {
    if (teamInfo) {
      setFirstName(teamInfo.userFirstName || '');
      setLastName(teamInfo.userLastName || '');
      setNickname(teamInfo.coachName !== 'COACH' ? teamInfo.coachName : '');
      setBio(teamInfo.bio || '');
      setPhone(teamInfo.phone || '');
      setCategory(teamInfo.category || '');
      setLevel(teamInfo.level || '');
      setSelectedTheme(theme);
    }
  }, [teamInfo, theme]);

  // Chargement des clubs
  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('id, name, category').order('name');
      if (data) {
        setClubs(data);
        // Sélection auto du club actuel
        if (teamInfo?.id) {
          const current = data.find(c => c.id === teamInfo.id);
          if (current) setSelectedClub(current);
        }
      }
    };
    fetchClubs();
  }, [teamInfo?.id]);

  const filteredClubs = useMemo(() => {
    if (!clubSearch.trim()) return [];
    return allClubs.filter(c =>
      c.name.toLowerCase().includes(clubSearch.toLowerCase())
    ).slice(0, 5);
  }, [allClubs, clubSearch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clubName = selectedClub ? selectedClub.name : clubSearch.trim();

    if (!firstName || !lastName || !clubName) {
      setErrorMessage("Champs obligatoires : Prénom, Nom et Club.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      let clubId = selectedClub?.id;

      // Création auto du club si nouveau nom
      if (!clubId && clubName) {
        const { data: newClub, error: cErr } = await supabase
          .from('clubs')
          .insert([{ name: clubName, category: 'Mixte' }])
          .select()
          .single();
        if (cErr) throw new Error("Erreur création club.");
        clubId = newClub.id;
      }

      // Mise à jour Profil (Utilisation de UPSERT pour garantir la création)
      const { error: pErr } = await supabase.from('profiles').upsert([{
        id: user.id,
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
        console.error("Supabase Update Error:", pErr);
        throw new Error(`Erreur Supabase: ${pErr.message}`);
      }

      localStorage.setItem('app_theme', selectedTheme);
      await refreshData();

      // On force le rechargement pour vider les vieux caches React
      window.location.href = '/profile';
    } catch (err: any) {
      setErrorMessage(err.message);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = isPro ? {
    bg: 'bg-gray-50',
    header: 'bg-white border-gray-100',
    card: 'bg-white border-gray-200 shadow-sm',
    text: 'text-gray-900',
    textSub: 'text-gray-500',
    accent: 'text-orange-600',
    input: 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500',
    btn: 'bg-orange-600 text-white'
  } : {
    bg: 'bg-black',
    header: 'bg-black/80 border-white/10',
    card: 'bg-white/5 border-white/10',
    text: 'text-white',
    textSub: 'text-gray-500',
    accent: 'text-neon-cyan',
    input: 'bg-white/5 border-white/10 text-white focus:border-neon-cyan',
    btn: 'bg-neon-cyan text-black'
  };

  return (
    <div className={`min-h-screen pb-32 ${styles.bg} transition-colors duration-500`}>
      <header className={`sticky top-0 z-50 p-4 border-b backdrop-blur-md flex items-center gap-4 ${styles.header}`}>
        <button onClick={() => router.back()} className={`${styles.text} active:scale-90 transition-transform`}>
          <ChevronLeft size={24} strokeWidth={3} />
        </button>
        <h1 className={`text-xl font-black uppercase italic tracking-tighter ${styles.text}`}>Édition_Profil</h1>
      </header>

      <main className="p-6 max-w-md mx-auto space-y-10">
        <form onSubmit={handleSave} className="space-y-8">

          {/* PHOTO SECTION (Aperçu) */}
          <div className="flex flex-col items-center gap-4">
             <div className={`w-24 h-24 rounded-[2rem] border-2 overflow-hidden flex items-center justify-center ${styles.card} shadow-xl relative`}>
                {teamInfo?.coachPhoto ? (
                  <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className={styles.textSub} />
                )}
             </div>
             <p className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Identité Visuelle</p>
          </div>

          {/* IDENTITÉ */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-2">
              <User size={14} className={styles.accent} />
              <h2 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Informations Personnelles</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Prénom</label>
                <input required value={firstName} onChange={e => setFirstName(e.target.value)} className={`w-full rounded-xl p-4 text-xs font-bold outline-none border transition-all ${styles.input}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Nom</label>
                <input required value={lastName} onChange={e => setLastName(e.target.value.toUpperCase())} className={`w-full rounded-xl p-4 text-xs font-bold outline-none border transition-all ${styles.input}`} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Surnom / Pseudo</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)} className={`w-full rounded-xl p-4 text-xs font-bold outline-none border transition-all ${styles.input}`} />
            </div>
          </section>

          {/* PRÉSENTATION */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-2">
              <Briefcase size={14} className={styles.accent} />
              <h2 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Ma Philosophie</h2>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Présente-toi en quelques mots..." className={`w-full min-h-[120px] rounded-2xl p-4 text-xs font-medium outline-none border transition-all ${styles.input}`} />
          </section>

          {/* CONTACT */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-2">
              <Plus size={14} className={styles.accent} />
              <h2 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Contact</h2>
            </div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ton numéro (pour les autres coachs)" className={`w-full rounded-xl p-4 text-xs font-bold outline-none border transition-all ${styles.input}`} />
          </section>

          {/* CLUB & MISSION */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-2">
              <Trophy size={14} className={styles.accent} />
              <h2 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Mon Unité Tactique</h2>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Club</label>
              <div className="relative">
                <div className="relative">
                  <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${styles.textSub}`} />
                  <input
                    placeholder="Rechercher ou saisir un club..."
                    value={selectedClub ? selectedClub.name : clubSearch}
                    onChange={(e) => {
                      setClubSearch(e.target.value);
                      setIsClubListOpen(true);
                      if (selectedClub) setSelectedClub(null);
                    }}
                    className={`w-full rounded-xl p-4 pl-12 text-xs font-bold outline-none border transition-all ${styles.input} ${selectedClub ? 'border-green-500 text-green-500' : ''}`}
                  />
                  {selectedClub && <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                </div>
                {isClubMenuOpen && (clubSearch.trim()) && (
                  <div className={`absolute z-50 w-full mt-2 border rounded-xl overflow-hidden shadow-2xl ${isPro ? 'bg-white' : 'bg-[#0A0A0A]'}`}>
                    {filteredClubs.map(club => (
                      <button key={club.id} type="button" onClick={() => { setSelectedClub(club); setClubSearch(''); setIsClubListOpen(false); }} className={`w-full p-4 text-left border-b last:border-0 ${isPro ? 'hover:bg-gray-50 border-gray-100' : 'hover:bg-white/5 border-white/5'}`}>
                        <p className={`text-xs font-black uppercase italic ${styles.text}`}>{club.name}</p>
                      </button>
                    ))}
                    {!allClubs.some(c => c.name.toLowerCase() === clubSearch.toLowerCase()) && (
                      <button type="button" onClick={() => setIsClubListOpen(false)} className={`w-full p-4 text-left flex items-center gap-2 ${styles.accent}`}>
                        <Plus size={14} />
                        <p className="text-xs font-black uppercase italic">Utiliser "{clubSearch}"</p>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Catégorie (Ex: U13)</label>
                <input value={category} onChange={e => setCategory(e.target.value)} placeholder="U13, Séniors..." className={`w-full rounded-xl p-4 text-xs font-bold outline-none border transition-all ${styles.input}`} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-500 ml-2">Niveau (Ex: D1)</label>
                <input value={level} onChange={e => setLevel(e.target.value)} placeholder="D1, R1, Elite..." className={`w-full rounded-xl p-4 text-xs font-bold outline-none border transition-all ${styles.input}`} />
              </div>
            </div>
          </section>

          {/* THÈME */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2 border-b border-white/5 pb-2">
              <Zap size={14} className={styles.accent} />
              <h2 className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Interface Préférée</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setSelectedTheme('classic')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedTheme === 'classic' ? 'bg-orange-50 border-orange-500' : 'border-white/5 opacity-40'}`}>
                <Briefcase size={20} className="text-orange-600" />
                <span className={`text-[9px] font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>MODE PRO</span>
              </button>
              <button type="button" onClick={() => setSelectedTheme('nexus')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedTheme === 'nexus' ? 'bg-cyan-500/10 border-neon-cyan' : 'border-white/5 opacity-40'}`}>
                <Zap size={20} className="text-neon-cyan" />
                <span className={`text-[9px] font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>MODE NEXUS</span>
              </button>
            </div>
          </section>

          {errorMessage && <p className="text-center text-[10px] font-black text-red-500 uppercase">{errorMessage}</p>}

          {/* SAVE BUTTON */}
          <button type="submit" disabled={isLoading} className={`w-full py-6 rounded-3xl font-black uppercase italic text-lg transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${styles.btn}`}>
            {isLoading ? <Loader2 className="animate-spin" /> : "Sauvegarder les modifications"}
            {!isLoading && <Save size={24} />}
          </button>
        </form>
      </main>
    </div>
  );
}
