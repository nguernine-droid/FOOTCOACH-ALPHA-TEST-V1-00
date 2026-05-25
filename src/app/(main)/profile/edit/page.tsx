'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronLeft, User, Shield, Trophy, CheckCircle2, MapPin, Zap,
  Loader2, Search, Plus, Save, Camera, Flame, Navigation, Layers, Target, ChevronDown
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';

interface Club { id: string; name: string; city: string; stadium: string; }

function EditProfileContent() {
  const router = useRouter();
  const { teamInfo, refreshData } = useTeam();
  const [isLoading, setIsLoading] = useState(false);

  // --- ÉTATS IDENTITÉ ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');

  // --- ÉTATS TACTIQUES ---
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [coachStatus, setCoachStatus] = useState<'inactif' | 'actif' | 'toujours_pret'>('inactif');
  const [matchDist, setMatchDist] = useState(30);
  const [plateauDist, setPlateauDist] = useState(20);
  const [tournamentReach, setTournamentReach] = useState<'departemental' | 'regional' | 'national' | 'distance'>('departemental');
  const [tournamentDistMax, setTournamentDistMax] = useState(50);

  // --- CLUB LOGIC ---
  const [allClubs, setClubs] = useState<Club[]>([]);
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isClubMenuOpen, setIsClubListOpen] = useState(false);

  // Initialisation
  useEffect(() => {
    if (teamInfo) {
      setFirstName(teamInfo.userFirstName || '');
      setLastName(teamInfo.userLastName || '');
      setNickname(teamInfo.coachName !== 'COACH' ? teamInfo.coachName : '');
      setBio(teamInfo.bio || '');
      setPhone(teamInfo.phone || '');
      setCategory(teamInfo.category || '');
      setLevel(teamInfo.level || '');
      setCoachStatus(teamInfo.coachStatus || 'inactif');
      setMatchDist(teamInfo.matchDistMax || 30);
      setPlateauDist(teamInfo.plateauDistMax || 20);
      setTournamentReach(teamInfo.tournamentReach || 'departemental');
      setTournamentDistMax(teamInfo.tournamentDistMax || 50);
    }
  }, [teamInfo]);

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('id, name, city, stadium').order('name');
      if (data) setClubs(data as Club[]);
    };
    fetchClubs();
  }, []);

  const filteredClubs = useMemo(() => {
    if (!clubSearch.trim()) return [];
    return allClubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).slice(0, 5);
  }, [allClubs, clubSearch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      let clubId = selectedClub?.id || teamInfo?.id;

      const { error } = await supabase.from('profiles').upsert([{
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname,
        bio: bio.toUpperCase(),
        phone: phone,
        coach_category: category,
        coach_level: level,
        club_id: clubId,
        coach_status: coachStatus,
        match_dist_max: matchDist,
        plateau_dist_max: plateauDist,
        tournament_reach: tournamentReach,
        tournament_dist_max: tournamentDistMax
      }]);

      if (error) throw error;
      await refreshData();
      router.push('/profile');
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const styles = {
    card: 'bg-white border-gray-200 rounded-[2.5rem] p-6 shadow-sm border space-y-6',
    input: 'w-full bg-gray-50 border-gray-200 rounded-xl p-4 text-xs font-black outline-none border-2 focus:border-orange-500 text-gray-900 uppercase transition-all',
    label: 'text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400'
  };

  return (
    <div className="min-h-screen pb-40 bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-100 py-6 px-6 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-900 active:scale-90"><ChevronLeft size={28} strokeWidth={3} /></button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">CONFIG_PROFIL</h1>
      </header>

      <main className="p-5 max-w-md mx-auto space-y-8 text-left">
        <form onSubmit={handleSave} className="space-y-8">

          {/* 1. STATUT DE TERRAIN */}
          <section className={styles.card}>
             <label className={styles.label}><Flame size={14} className="text-orange-600"/> Statut Actuel</label>
             <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                <button type="button" onClick={() => setCoachStatus('inactif')} className={`py-3 rounded-xl text-[8px] font-black transition-all ${coachStatus === 'inactif' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400'}`}>INACTIF</button>
                <button type="button" onClick={() => setCoachStatus('actif')} className={`py-3 rounded-xl text-[8px] font-black transition-all ${coachStatus === 'actif' ? 'bg-[#39FF14] text-black shadow-md' : 'text-gray-400'}`}>ACTIF</button>
                <button type="button" onClick={() => setCoachStatus('toujours_pret')} className={`py-3 rounded-xl text-[8px] font-black transition-all ${coachStatus === 'toujours_pret' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400'}`}>PRÊT 🔥</button>
             </div>
          </section>

          {/* 2. IDENTITÉ & SLOGAN */}
          <section className={styles.card}>
             <label className={styles.label}><User size={14} className="text-orange-600"/> Identité Master</label>
             <div className="grid grid-cols-2 gap-3">
                <input placeholder="PRÉNOM" value={firstName} onChange={e => setFirstName(e.target.value)} className={styles.input} />
                <input placeholder="NOM" value={lastName} onChange={e => setLastName(e.target.value)} className={styles.input} />
             </div>
             <input placeholder="SURNOM (AFFICHÉ SUR CARTE)" value={nickname} onChange={e => setNickname(e.target.value)} className={styles.input} />
             <div className="pt-2">
                <label className={styles.label}>Phrase d'accroche (Slogan)</label>
                <input placeholder="EX: DROIT AU BUT..." value={bio} onChange={e => setBio(e.target.value)} className={styles.input} />
             </div>
          </section>

          {/* 3. RAYONS D'ACTION */}
          <section className={styles.card}>
             <label className={styles.label}><Navigation size={14} className="text-orange-600"/> Périmètres de Mission</label>

             <div className="space-y-6">
                <div>
                   <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Match Amical</span> <span className="text-orange-600">{matchDist} KM</span></div>
                   <input type="range" min="5" max="100" step="5" value={matchDist} onChange={e => setMatchDist(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                </div>
                <div>
                   <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Plateau</span> <span className="text-blue-600">{plateauDist} KM</span></div>
                   <input type="range" min="5" max="100" step="5" value={plateauDist} onChange={e => setPlateauDist(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-gray-400 block mb-3">Projection Tournois</label>
                   <div className="grid grid-cols-2 gap-2">
                      {['departemental', 'regional', 'national', 'distance'].map(r => (
                        <button key={r} type="button" onClick={() => setTournamentReach(r as any)} className={`py-3 rounded-xl text-[8px] font-black border-2 transition-all ${tournamentReach === r ? 'bg-yellow-500 border-yellow-500 text-black shadow-md' : 'bg-gray-100 border-transparent text-gray-500'}`}>{r.toUpperCase()}</button>
                      ))}
                   </div>
                   {tournamentReach === 'distance' && (
                     <div className="mt-4 animate-in fade-in">
                        <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Distance Max</span> <span className="text-yellow-600">{tournamentDistMax} KM</span></div>
                        <input type="range" min="50" max="1000" step="50" value={tournamentDistMax} onChange={e => setTournamentDistMax(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                     </div>
                   )}
                </div>
             </div>
          </section>

          {/* 4. CLUB & CONFIDENTIALITÉ */}
          <section className={styles.card}>
             <label className={styles.label}><Shield size={14} className="text-orange-600"/> Unité & Sécurité</label>
             <div className="relative">
                <input
                  placeholder="NOM DU CLUB..."
                  value={selectedClub ? selectedClub.name : clubSearch}
                  onChange={e => { setClubSearch(e.target.value); setIsClubListOpen(true); if (selectedClub) setSelectedClub(null); }}
                  className={styles.input}
                />
                {isClubMenuOpen && clubSearch.trim() && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
                    {filteredClubs.map(c => (
                      <button key={c.id} type="button" onClick={() => { setSelectedClub(c); setClubSearch(''); setIsClubListOpen(false); }} className="w-full p-4 text-left border-b border-gray-50 text-xs font-black uppercase hover:bg-gray-50">{c.name}</button>
                    ))}
                  </div>
                )}
             </div>
             <div className="grid grid-cols-2 gap-3">
                <input placeholder="CATÉGORIE" value={category} onChange={e => setCategory(e.target.value.toUpperCase())} className={styles.input} />
                <input placeholder="NIVEAU" value={level} onChange={e => setLevel(e.target.value.toUpperCase())} className={styles.input} />
             </div>
             <div className="pt-4 border-t border-gray-100">
                <label className={styles.label}>Téléphone (🔒 Privé)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={styles.input} placeholder="06..." />
                <p className="text-[7px] font-bold text-gray-400 mt-2 uppercase tracking-widest text-center italic">Ce numéro n'est jamais partagé avec les autres coachs</p>
             </div>
          </section>

          <button type="submit" disabled={isLoading} className="w-full bg-orange-600 text-white font-black py-7 rounded-[3rem] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase italic text-2xl shadow-2xl shadow-orange-200">
            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            VALIDER LES MODIFICATIONS
          </button>
        </form>
      </main>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-orange-600 font-black">Sync_Nexus_Edit...</div>}>
      <EditProfileContent />
    </Suspense>
  );
}
