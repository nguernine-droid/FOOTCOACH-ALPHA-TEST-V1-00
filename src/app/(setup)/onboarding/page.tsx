'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronRight,
  CheckCircle2,
  User,
  Loader2,
} from 'lucide-react';
import { ScanlinesOverlay } from '@/components/ui/cyber/ScanlinesOverlay';
import { useTeam } from '@/lib/context/TeamContext';
import { ClubSearchInput } from '@/components/ClubSearchInput';

interface Club {
  id: string;
  name: string;
  category: string;
}

/**
 * ONBOARDING (v7.6 - AUTO-FEED ENGINE)
 * Création intelligente de clubs sans doublons.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { refreshData } = useTeam();
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'classic' | 'nexus'>('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const neonHex = selectedTheme === 'nexus' ? '#00F0FF' : '#FF6B00';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');

  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [selectedClubId, setSelectedClubId]     = useState<string | null>(null);
  const [selectedClubName, setSelectedClubName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [clubCity, setClubCity]                 = useState('');
  const [clubStadium, setClubStadium]           = useState('');

  // Profil complet = toutes les infos obligatoires renseignées
  const isProfileComplete = !!(
    firstName && lastName && selectedClubName &&
    clubCity && clubStadium && category && level &&
    acceptCGU && acceptPrivacy
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
    };
    init();
  }, [router]);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    const clubName = selectedClubName.trim();
    if (!firstName || !lastName)       { setErrorMessage("Nom et prénom obligatoires."); return; }
    if (!clubName)                     { setErrorMessage("Votre club est obligatoire."); return; }
    if (!clubCity.trim())              { setErrorMessage("La ville de votre club est obligatoire."); return; }
    if (!clubStadium.trim())           { setErrorMessage("Le stade de votre club est obligatoire."); return; }
    if (!category || !level)           { setErrorMessage("Catégorie et niveau obligatoires."); return; }
    if (!acceptCGU || !acceptPrivacy)  { setErrorMessage("Veuillez accepter les CGU."); return; }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");

      // selectedClubId est déjà rempli si le coach a sélectionné un club existant
      // sinon on crée le club (ClubSearchInput garantit l'absence de doublon)
      let clubId = selectedClubId;

      if (!clubId && clubName) {
        // upsert : si le nom existe déjà (même en majuscules/minuscules)
        // ON CONFLICT récupère l'existant sans créer de doublon
        const { data: upserted, error: cErr } = await supabase
          .from('clubs')
          .upsert(
            [{
              name:           clubName.toUpperCase(),
              city:           clubCity    ? clubCity.toUpperCase()    : null,
              stadium:        clubStadium ? clubStadium.toUpperCase() : null,
              category:       'Mixte',
              created_by:     user.id,
              parent_club_id: selectedParentId ?? null,
            }],
            { onConflict: 'name_normalized', ignoreDuplicates: false }
          )
          .select('id')
          .single();

        if (cErr) {
          // Fallback : recherche par normalisation manuelle
          const norm = clubName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
          const { data: fallback } = await supabase
            .from('clubs').select('id').eq('name_normalized', norm).maybeSingle();
          if (fallback) clubId = fallback.id;
          else throw new Error("Erreur création club.");
        } else {
          clubId = upserted.id;
        }
      }

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

      if (pErr) throw pErr;

      localStorage.setItem('user_role', 'coach');
      localStorage.setItem('app_theme', selectedTheme);
      await refreshData();

      setIsSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally { setIsLoading(false); }
  };

  if (isSuccess) return <BionicAccessAnimation theme={selectedTheme} onComplete={() => {}} />;

  return (
    <div className="w-full pb-20 px-4">
      <ScanlinesOverlay />
      <div className="text-center mb-12 mt-8">
        <User style={{ color: neonHex }} size={40} className="mx-auto mb-4" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Complète ton profil</h1>
        <p className="text-[9px] font-black text-[#39FF14] uppercase tracking-[0.4em] mt-2">Nexus_OS // Auto_Feed_Engine</p>
      </div>

      <form onSubmit={handleFinish} className="max-w-sm mx-auto space-y-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="NOM" value={lastName} onChange={e => setLastName(e.target.value.toUpperCase())} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
            <input required placeholder="PRÉNOM" value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
          </div>
          <input placeholder="SURNOM / PSEUDO" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
        </div>

        <div className="space-y-4">
          <ClubSearchInput
            value={selectedClubName}
            isPro={false}
            placeholder="TON CLUB (RECHERCHER OU CRÉER)"
            city={clubCity}
            requireVerified={true}
            onSelect={(club) => {
              setSelectedClubId(club.id);
              setSelectedClubName(club.name);
              // Sécurité 1 : ville + stade verrouillés depuis le club référencé
              if (club.city)    setClubCity(club.city);
              if (club.stadium) setClubStadium(club.stadium);
            }}
            onCreate={(name, parentId) => {
              setSelectedClubId(null);
              setSelectedClubName(name);
              setSelectedParentId(parentId);
            }}
          />
          {/* Ville + Stade — obligatoires pour valider le club */}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="VILLE DU CLUB *"
              value={clubCity}
              onChange={e => setClubCity(e.target.value.toUpperCase())}
              className={`bg-white/5 border rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14] transition-all
                ${clubCity ? 'border-[#39FF14]/50' : 'border-red-500/40'}`}
            />
            <input
              placeholder="NOM DU STADE *"
              value={clubStadium}
              onChange={e => setClubStadium(e.target.value.toUpperCase())}
              className={`bg-white/5 border rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14] transition-all
                ${clubStadium ? 'border-[#39FF14]/50' : 'border-red-500/40'}`}
            />
          </div>
          {(!clubCity || !clubStadium) && selectedClubName && (
            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest px-1">
              ⚠️ Ville et stade requis pour accéder au Radar
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="CATÉGORIE (U13...)" value={category} onChange={e => setCategory(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
            <input required placeholder="NIVEAU (D1...)" value={level} onChange={e => setLevel(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#39FF14]" />
          </div>
        </div>

        <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={acceptCGU} onChange={e => setAcceptCGU(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-black border-white/20" /><span className="text-[9px] text-white/50 uppercase font-bold">Accepter CGU / Confidentialité</span></label>
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-black border-white/20" /><span className="text-[9px] text-white/50 uppercase font-bold">Autoriser stockage données</span></label>
        </div>

        {errorMessage && <p className="text-center text-[10px] font-black text-red-500 uppercase">{errorMessage}</p>}
        <button type="submit" disabled={isLoading || !isProfileComplete} className={`w-full py-6 rounded-2xl font-black uppercase italic text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${isProfileComplete ? (selectedTheme === 'nexus' ? 'bg-neon-cyan text-black' : 'bg-orange-600 text-white') : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
          {isLoading ? <Loader2 className="animate-spin" /> : "ACTIVER MON COMPTE"}
          {!isLoading && <ChevronRight size={24} />}
        </button>
      </form>
    </div>
  );
}

function BionicAccessAnimation({ theme, onComplete }: { theme: 'classic' | 'nexus', onComplete: () => void }) {
  useEffect(() => { setTimeout(onComplete, 3000); }, [onComplete]);
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-10 text-center">
      <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${theme === 'nexus' ? 'border-neon-cyan text-neon-cyan' : 'border-neon-orange text-neon-orange'} shadow-[0_0_30px_currentColor]`}>
        <CheckCircle2 size={64} />
      </div>
      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mt-12">Accès_Autorisé</h2>
      <p className="text-[10px] font-mono text-[#39FF14] uppercase tracking-[0.4em] mt-4">Sync Engine V.204...</p>
    </div>
  );
}
