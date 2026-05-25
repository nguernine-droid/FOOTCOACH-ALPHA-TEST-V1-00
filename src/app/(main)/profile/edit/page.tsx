'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronLeft, User, Shield, Trophy, MapPin,
  Loader2, Search, Save, Flame, Navigation, Layers, Phone, Target, Globe
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';

interface Club { id: string; name: string; city: string; stadium: string; }

function EditProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') || 'user';

  const { teamInfo, refreshData } = useTeam();
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // --- ÉTATS ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [coachStatus, setCoachStatus] = useState<'inactif' | 'actif' | 'toujours_pret'>('inactif');
  const [matchDist, setMatchDist] = useState(30);
  const [plateauDist, setPlateauDist] = useState(20);
  const [tournamentReach, setTournamentReach] = useState('departemental');
  const [tournamentDistMax, setTournamentDistMax] = useState(50);
  const [city, setCity] = useState('');
  const [stadium, setStadium] = useState('');
  const [refCatsText, setRefCatsText] = useState('');
  const [clubName, setClubName] = useState('');

  // Initialisation
  useEffect(() => {
    if (teamInfo) {
      setFirstName(teamInfo.userFirstName || '');
      setLastName(teamInfo.userLastName || '');
      setNickname(teamInfo.coachName !== 'COACH' ? teamInfo.coachName : '');
      setBio(teamInfo.bio || '');
      setPhone(teamInfo.phone || '');
      setLicenseNumber(teamInfo.licenseNumber || '');
      setCategory(teamInfo.category || '');
      setLevel(teamInfo.level || '');
      setCoachStatus(teamInfo.coachStatus || 'inactif');
      setMatchDist(teamInfo.matchDistMax || 30);
      setPlateauDist(teamInfo.plateauDistMax || 20);
      setTournamentReach(teamInfo.tournamentReach || 'departemental');
      setTournamentDistMax(teamInfo.tournamentDistMax || 50);
      setCity(teamInfo.clubCity || '');
      setStadium(teamInfo.clubStadium || '');
      setClubName(teamInfo.clubName || '');
      setRefCatsText(teamInfo.refCategories?.join(', ') || '');
    }
  }, [teamInfo]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('coach-avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('coach-avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshData();
      alert("✅ Photo mise à jour !");
    } catch (error: any) {
      alert("Erreur upload photo: " + error.message);
    } finally { setIsAvatarUploading(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!teamInfo?.id) { alert("Club non identifié."); return; }

    setIsLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamInfo.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('club-logos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('club-logos').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', teamInfo.id);
      if (updateError) throw updateError;

      await refreshData();
      alert("✅ Blason du club mis à jour !");
    } catch (error: any) {
      alert("Erreur upload blason: " + error.message);
    } finally { setIsLogoUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      // Conversion des catégories de référence (texte -> array)
      const refCategories = refCatsText.split(',').map(s => s.trim()).filter(s => s !== '');

      const { error } = await supabase.from('profiles').upsert([{
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname,
        bio: bio.toUpperCase(),
        phone: phone,
        license_number: licenseNumber,
        coach_category: category,
        coach_level: level,
        coach_status: coachStatus,
        match_dist_max: matchDist,
        plateau_dist_max: plateauDist,
        tournament_reach: tournamentReach,
        tournament_dist_max: tournamentDistMax,
        ref_categories: refCategories
      }]);

      // Si on est dans la section logistique, on peut aussi mettre à jour le club si besoin
      if (activeSection === 'logistics' && teamInfo?.id) {
         await supabase.from('clubs').update({
           city: city.toUpperCase(),
           stadium: stadium.toUpperCase()
         }).eq('id', teamInfo.id);
      }

      if (error) throw error;
      await refreshData();
      router.back();
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const styles = {
    card: 'bg-white border-gray-200 rounded-[2.5rem] p-8 shadow-sm border space-y-8',
    input: 'w-full bg-gray-50 border-gray-200 rounded-xl p-4 text-sm font-black outline-none border-2 focus:border-orange-500 text-gray-900 uppercase transition-all',
    label: 'text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400'
  };

  return (
    <div className="min-h-screen pb-40 bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-100 py-6 px-6 sticky top-0 z-50 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-900 active:scale-90"><ChevronLeft size={28} strokeWidth={3} /></button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">
          {activeSection === 'user' ? 'Éditer_Utilisateur' :
           activeSection === 'club' ? 'Éditer_Mon_Club' :
           activeSection === 'logistics' ? 'Éditer_Logistique' : 'Éditer_Rayons'}
        </h1>
      </header>

      <main className="p-5 max-w-md mx-auto">
        <form onSubmit={handleSave} className="space-y-8">

          <section className={styles.card}>

            {/* SECTION 1 : UTILISATEUR */}
            {activeSection === 'user' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-3xl border-4 border-orange-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-md relative">
                         {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-200" />}
                         {isAvatarUploading && (
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 size={24} className="animate-spin text-white" />
                           </div>
                         )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload-edit"
                        disabled={isAvatarUploading}
                      />
                      <label
                        htmlFor="avatar-upload-edit"
                        className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-xl active:scale-90 bg-orange-600 text-white ${isAvatarUploading ? 'opacity-50 pointer-events-none' : 'hover:scale-110'}`}
                      >
                        <Camera size={18} strokeWidth={3} />
                      </label>
                    </div>
                    <p className="text-[9px] font-black uppercase text-gray-400 mt-4 tracking-[0.2em]">Ma Photo de Profil</p>
                 </div>
                 <div className="space-y-4 pt-4 border-t border-gray-50">
                    <label className={styles.label}><User size={14} className="text-orange-600"/> Identité Coach</label>
                    <div className="grid grid-cols-2 gap-3">
                       <input placeholder="PRÉNOM" value={firstName} onChange={e => setFirstName(e.target.value)} className={styles.input} />
                       <input placeholder="NOM" value={lastName} onChange={e => setLastName(e.target.value)} className={styles.input} />
                    </div>
                    <input placeholder="SURNOM (AFFICHÉ SUR CARTE)" value={nickname} onChange={e => setNickname(e.target.value)} className={styles.input} />
                    <input placeholder="NUMÉRO DE LICENCE (OPTIONNEL)" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className={styles.input} />
                    <input placeholder="TÉLÉPHONE (PRIVÉ)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={styles.input} />
                 </div>
                 <div className="space-y-4 pt-4 border-t border-gray-50">
                    <label className={styles.label}><Flame size={14} className="text-orange-600"/> Statut Actuel</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                       {['inactif', 'actif', 'toujours_pret'].map(s => (
                         <button key={s} type="button" onClick={() => setCoachStatus(s as any)} className={`py-3 rounded-xl text-[8px] font-black transition-all ${coachStatus === s ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400'}`}>
                           {s === 'toujours_pret' ? 'PRÊT 🔥' : s.toUpperCase()}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {/* SECTION 2 : MON CLUB */}
            {activeSection === 'club' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-3xl border-4 border-orange-100 p-3 bg-white flex items-center justify-center shadow-md relative overflow-hidden">
                         {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} className="w-full h-full object-contain" /> : <Shield size={40} className="text-gray-100" />}
                         {isLogoUploading && (
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 size={24} className="animate-spin text-white" />
                           </div>
                         )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload-edit"
                        disabled={isLogoUploading}
                      />
                      <label
                        htmlFor="logo-upload-edit"
                        className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-xl active:scale-90 bg-orange-600 text-white ${isLogoUploading ? 'opacity-50 pointer-events-none' : 'hover:scale-110'}`}
                      >
                        <Camera size={18} strokeWidth={3} />
                      </label>
                    </div>
                    <p className="text-[9px] font-black uppercase text-gray-400 mt-4 tracking-[0.2em]">Blason de l'Unité</p>
                    <p className="text-sm font-black uppercase italic text-gray-900 mt-2">{clubName}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                       <label className={styles.label}>Ma Catégorie</label>
                       <input placeholder="EX: U13" value={category} onChange={e => setCategory(e.target.value.toUpperCase())} className={styles.input} />
                    </div>
                    <div className="space-y-2">
                       <label className={styles.label}>Niveau</label>
                       <input placeholder="EX: D1" value={level} onChange={e => setLevel(e.target.value.toUpperCase())} className={styles.input} />
                    </div>
                 </div>
                 <div className="space-y-2 pt-4 border-t border-gray-50">
                    <label className={styles.label}><Layers size={14} className="text-orange-600"/> Catégories de Référence</label>
                    <input placeholder="EX: U11, U12, U13..." value={refCatsText} onChange={e => setRefCatsText(e.target.value.toUpperCase())} className={styles.input} />
                    <p className="text-[7px] text-gray-400 font-bold uppercase">Séparez les catégories par une virgule</p>
                 </div>
              </div>
            )}

            {/* SECTION 3 : LOGISTIQUE */}
            {activeSection === 'logistics' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                 <label className={styles.label}><MapPin size={14} className="text-orange-600"/> Logistique QG (Auto-Pilot)</label>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className={styles.label}>Ma Ville</label>
                       <input placeholder="NOM DE LA VILLE" value={city} onChange={e => setCity(e.target.value.toUpperCase())} className={styles.input} />
                    </div>
                    <div className="space-y-2">
                       <label className={styles.label}>Mon Stade</label>
                       <input placeholder="NOM DU STADE" value={stadium} onChange={e => setStadium(e.target.value.toUpperCase())} className={styles.input} />
                    </div>
                 </div>
                 <p className="text-[8px] text-gray-400 font-bold uppercase italic text-center pt-4">Ces informations rempliront automatiquement vos annonces "Je reçois"</p>
              </div>
            )}

            {/* SECTION 4 : RAYONS */}
            {activeSection === 'ranges' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                 <label className={styles.label}><Navigation size={14} className="text-orange-600"/> Périmètres de Mission</label>

                 <div className="space-y-8">
                    <div>
                       <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Match Amical</span> <span className="text-orange-600">{matchDist} KM</span></div>
                       <input type="range" min="5" max="100" step="5" value={matchDist} onChange={e => setMatchDist(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                    </div>

                    <div>
                       <div className="flex justify-between text-[10px] font-black mb-2 uppercase"><span>Plateau</span> <span className="text-blue-600">{plateauDist} KM</span></div>
                       <input type="range" min="5" max="100" step="5" value={plateauDist} onChange={e => setPlateauDist(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-50">
                       <label className={styles.label}><Globe size={14} className="text-yellow-600"/> Portée Tournois</label>
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
              </div>
            )}

          </section>

          <button type="submit" disabled={isLoading} className="w-full bg-orange-600 text-white font-black py-7 rounded-[3rem] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase italic text-2xl shadow-2xl shadow-orange-200">
            {isLoading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            VALIDER LA SECTION
          </button>
        </form>
      </main>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-orange-600 font-black">Chargement_Éditeur...</div>}>
      <EditProfileContent />
    </Suspense>
  );
}
