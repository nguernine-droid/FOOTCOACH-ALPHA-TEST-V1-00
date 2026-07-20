'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  User,
  ShieldCheck,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { ClubSearchInput } from '@/components/ClubSearchInput';

/**
 * ONBOARDING (v8 - ASSISTANT MULTI-ÉTAPES)
 * Personnalisation assistée du compte à la première connexion :
 *   1. Identité  2. Club  3. Équipe  4. Préférences
 * La logique d'enregistrement (clubs + profiles) est identique à la v7.6.
 */

const STEPS = [
  { key: 'identity',    label: 'Identité',    icon: User },
  { key: 'club',        label: 'Club',        icon: ShieldCheck },
  { key: 'team',        label: 'Équipe',      icon: Users },
  { key: 'preferences', label: 'Préférences', icon: Sparkles },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshData } = useTeam();
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<'classic' | 'nexus'>('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const neonHex = selectedTheme === 'nexus' ? '#2DD4BF' : '#F97316';

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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
    };
    init();
  }, [router]);

  // Validation par étape : bloque le bouton "Suivant" tant que l'étape est incomplète.
  const stepValid = (i: number): boolean => {
    switch (STEPS[i].key) {
      case 'identity':    return !!(firstName && lastName);
      case 'club':        return !!(selectedClubName && clubCity.trim() && clubStadium.trim());
      case 'team':        return !!(category && level);
      case 'preferences': return acceptCGU && acceptPrivacy;
      default:            return false;
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const canContinue = stepValid(step);

  const goNext = () => {
    setErrorMessage(null);
    if (!canContinue) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setErrorMessage(null);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleFinish = async () => {
    const clubName = selectedClubName.trim();
    if (!firstName || !lastName)       { setErrorMessage("Nom et prénom obligatoires."); setStep(0); return; }
    if (!clubName)                     { setErrorMessage("Votre club est obligatoire."); setStep(1); return; }
    if (!clubCity.trim())              { setErrorMessage("La ville de votre club est obligatoire."); setStep(1); return; }
    if (!clubStadium.trim())           { setErrorMessage("Le stade de votre club est obligatoire."); setStep(1); return; }
    if (!category || !level)           { setErrorMessage("Catégorie et niveau obligatoires."); setStep(2); return; }
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

      const chosenRole = (localStorage.getItem('user_role') as 'coach' | 'player' | 'parent' | 'supporter') || 'coach';

      const { error: pErr } = await supabase.from('profiles').upsert([{
        id: user.id,
        role: chosenRole,
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

      localStorage.setItem('user_role', chosenRole);
      localStorage.setItem('nexus_active_role', chosenRole);
      localStorage.setItem('app_theme', selectedTheme);
      await refreshData();

      setIsSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally { setIsLoading(false); }
  };

  if (isSuccess) return <BionicAccessAnimation theme={selectedTheme} onComplete={() => {}} />;

  const CurrentIcon = STEPS[step].icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="w-full pb-20 px-4">
      {/* En-tête */}
      <div className="text-center mb-8 mt-8">
        <CurrentIcon style={{ color: neonHex }} size={40} className="mx-auto mb-4" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          {step === 0 && 'Ton identité'}
          {step === 1 && 'Ton club'}
          {step === 2 && 'Ton équipe'}
          {step === 3 && 'Tes préférences'}
        </h1>
        <p className="text-[9px] font-black text-neon-green uppercase tracking-[0.4em] mt-2">
          Étape {step + 1} / {STEPS.length} · Personnalisation assistée
        </p>
      </div>

      {/* Barre de progression + jalons */}
      <div className="max-w-sm mx-auto mb-10">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: neonHex }}
          />
        </div>
        <div className="flex justify-between mt-3">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const StepIcon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => { if (i < step) setStep(i); }}
                disabled={i > step}
                className="flex flex-col items-center gap-1.5 flex-1"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    borderColor: current || done ? neonHex : 'rgba(255,255,255,0.15)',
                    backgroundColor: done ? neonHex : 'transparent',
                    color: done ? '#000' : current ? neonHex : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {done ? <CheckCircle2 size={16} /> : <StepIcon size={15} />}
                </div>
                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{ color: current ? '#fff' : 'rgba(255,255,255,0.3)' }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corps de l'étape */}
      <div className="max-w-sm mx-auto space-y-8">
        {/* ÉTAPE 1 — IDENTITÉ */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Qui es-tu ? Ces infos apparaîtront sur ton profil.</p>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="NOM" value={lastName} onChange={e => setLastName(e.target.value.toUpperCase())} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green" />
              <input required placeholder="PRÉNOM" value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green" />
            </div>
            <input placeholder="SURNOM / PSEUDO (optionnel)" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green" />
            <input placeholder="TÉLÉPHONE (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green" />
            <textarea placeholder="BIO — présente-toi en quelques mots (optionnel)" value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green resize-none" />
          </div>
        )}

        {/* ÉTAPE 2 — CLUB */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Recherche ton club, ou crée-le. Ville et stade sont requis pour le Radar.</p>
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
                className={`bg-white/5 border rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green transition-all
                  ${clubCity ? 'border-neon-green/50' : 'border-red-500/40'}`}
              />
              <input
                placeholder="NOM DU STADE *"
                value={clubStadium}
                onChange={e => setClubStadium(e.target.value.toUpperCase())}
                className={`bg-white/5 border rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green transition-all
                  ${clubStadium ? 'border-neon-green/50' : 'border-red-500/40'}`}
              />
            </div>
            {(!clubCity || !clubStadium) && selectedClubName && (
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest px-1">
                ⚠️ Ville et stade requis pour accéder au Radar
              </p>
            )}
          </div>
        )}

        {/* ÉTAPE 3 — ÉQUIPE */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Quelle équipe encadres-tu ?</p>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="CATÉGORIE (U13...)" value={category} onChange={e => setCategory(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green" />
              <input required placeholder="NIVEAU (D1...)" value={level} onChange={e => setLevel(e.target.value)} className="bg-white/5 border border-white/20 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-neon-green" />
            </div>
          </div>
        )}

        {/* ÉTAPE 4 — PRÉFÉRENCES */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Choisis l'ambiance de ton interface.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTheme('classic')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${selectedTheme === 'classic' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5'}`}
                >
                  <span className="block text-sm font-black uppercase italic text-white">Classic</span>
                  <span className="block text-[9px] font-bold uppercase text-white/40 mt-1">Clair & pro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTheme('nexus')}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${selectedTheme === 'nexus' ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/10 bg-white/5'}`}
                >
                  <span className="block text-sm font-black uppercase italic text-white">Nexus</span>
                  <span className="block text-[9px] font-bold uppercase text-white/40 mt-1">Sombre & néon</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
              <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={acceptCGU} onChange={e => setAcceptCGU(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-[#15171C] border-white/20" /><span className="text-[9px] text-white/50 uppercase font-bold">Accepter CGU / Confidentialité</span></label>
              <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-[#15171C] border-white/20" /><span className="text-[9px] text-white/50 uppercase font-bold">Autoriser stockage données</span></label>
            </div>
          </div>
        )}

        {errorMessage && <p className="text-center text-[10px] font-black text-red-500 uppercase">{errorMessage}</p>}

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-5 rounded-2xl font-black uppercase italic text-sm bg-white/5 text-white/70 border border-white/10 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} /> Retour
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className={`flex-1 py-5 rounded-2xl font-black uppercase italic text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${canContinue ? (selectedTheme === 'nexus' ? 'bg-neon-cyan text-black' : 'bg-orange-600 text-white') : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
            >
              Suivant <ChevronRight size={24} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isLoading || !canContinue}
              className={`flex-1 py-5 rounded-2xl font-black uppercase italic text-lg flex items-center justify-center gap-3 transition-all shadow-2xl ${canContinue ? (selectedTheme === 'nexus' ? 'bg-neon-cyan text-black' : 'bg-orange-600 text-white') : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "ACTIVER MON COMPTE"}
              {!isLoading && <ChevronRight size={24} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BionicAccessAnimation({ theme, onComplete }: { theme: 'classic' | 'nexus', onComplete: () => void }) {
  useEffect(() => { setTimeout(onComplete, 3000); }, [onComplete]);
  return (
    <div className="fixed inset-0 z-[1000] bg-[#15171C] flex flex-col items-center justify-center p-10 text-center">
      <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${theme === 'nexus' ? 'border-neon-cyan text-neon-cyan' : 'border-neon-orange text-neon-orange'} shadow-lg`}>
        <CheckCircle2 size={64} />
      </div>
      <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mt-12">Accès_Autorisé</h2>
      <p className="text-[10px] font-mono text-neon-green uppercase tracking-[0.4em] mt-4">Sync Engine V.204...</p>
    </div>
  );
}
