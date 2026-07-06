'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Calendar, Clock, Shield, Navigation,
  Trophy, Layers, Send, Loader2, Plus, Check, Zap, AlertTriangle, Edit3
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { ClubSearchInput } from '@/components/ClubSearchInput';

type AnnouncementType = 'Match Amical' | 'Tournoi' | 'Plateau';

const THEME: Record<AnnouncementType, { primary: string; glow: string; text: string; border: string }> = {
  'Match Amical': { primary: 'bg-[#16a34a]', glow: 'shadow-[0_0_20px_#16a34a66]', text: 'text-[#16a34a]', border: 'border-[#16a34a]' },
  'Plateau': { primary: 'bg-blue-600', glow: 'shadow-[0_0_20px_#2563eb66]', text: 'text-blue-500', border: 'border-blue-600' },
  'Tournoi': { primary: 'bg-red-600', glow: 'shadow-[0_0_20px_#dc262666]', text: 'text-red-600', border: 'border-red-600' }
};

function NewSignalContent() {
  const router = useRouter();
  const { teamInfo } = useTeam();
  const isClubVerified = !!(teamInfo?.clubCity?.trim() && teamInfo?.clubStadium?.trim());
  const [isLoading, setIsLoading] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // --- ÉTATS FORMULAIRE ---
  const [type, setType] = useState<AnnouncementType>('Match Amical');
  const [mainCategory, setCategory] = useState(teamInfo?.category || '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [isFlexible, setIsFlexible] = useState(false);
  const [flexibleWindow, setFlexibleWindow] = useState('');
  const [city, setCity] = useState(teamInfo?.clubCity || '');
  const [stadium, setStadium] = useState(teamInfo?.clubStadium || '');
  const [comment, setComment] = useState('');
  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Sécurité 2 : détection de lieu différent du club d'origine
  const [showVenueWarning, setShowVenueWarning] = useState(false);
  const [venueClubId, setVenueClubId] = useState<string | null>(null);

  // Détecte si la ville saisie diverge du club du coach
  useEffect(() => {
    if (!teamInfo?.clubCity || !city) { setShowVenueWarning(false); return; }
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const isDifferent = normalize(city) !== normalize(teamInfo.clubCity);
    setShowVenueWarning(isDifferent);
    if (!isDifferent) setVenueClubId(null);
  }, [city, teamInfo?.clubCity]);

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

  // Géocode une ville via Nominatim (OpenStreetMap) — sans clé API
  const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&countrycodes=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch { /* silencieux */ }
    return null;
  };

  // Détecte le club parent probable avant création
  const findParentClub = async (name: string): Promise<string | null> => {
    try {
      const { data } = await supabase.rpc('find_parent_club', { p_name: name });
      if (data && (data as any[]).length > 0) return (data as any[])[0].id;
    } catch { /* silencieux */ }
    return null;
  };

  // Upsert club : réutilise si existe, crée sinon, ajoute les coords si manquantes
  const ensureClub = async (userId: string, clubName: string, clubCity: string): Promise<string | null> => {
    const nameKey = clubName.trim().toUpperCase();

    // 1. Le coach a-t-il déjà un club_id ?
    const { data: profile } = await supabase
      .from('profiles').select('club_id, clubs:club_id(id, latitude, longitude)').eq('id', userId).single();

    if (profile?.club_id) {
      const club = (profile as any).clubs;
      // Club existe mais sans coordonnées → on les ajoute
      if (!club?.latitude && clubCity) {
        const coords = await geocodeCity(clubCity);
        if (coords) {
          await supabase.from('clubs').update({ latitude: coords.lat, longitude: coords.lon })
            .eq('id', profile.club_id);
        }
      }
      return profile.club_id;
    }

    // 2. Club avec ce nom existe-t-il déjà (nom normalisé ou alias) ?
    const normalized = nameKey.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    let existing: { id: string; latitude: number | null; longitude: number | null } | null = null;

    // 2a. Recherche par name_normalized
    const { data: byNorm } = await supabase
      .from('clubs').select('id, latitude, longitude')
      .eq('name_normalized', normalized).maybeSingle();
    if (byNorm) {
      existing = byNorm;
    } else {
      // 2b. Recherche dans les alias
      const { data: byAlias } = await supabase
        .from('club_aliases')
        .select('club_id, clubs:club_id(id, latitude, longitude)')
        .eq('alias_normalized', normalized)
        .maybeSingle();
      if (byAlias) {
        existing = (byAlias as any).clubs;
      } else {
        // 2c. Fallback ilike
        const { data: byLike } = await supabase
          .from('clubs').select('id, latitude, longitude').ilike('name', nameKey).maybeSingle();
        existing = byLike;
      }
    }

    if (existing) {
      // Lier ce club au profil
      await supabase.from('profiles').update({ club_id: existing.id }).eq('id', userId);
      // Ajouter coords si manquantes
      if (!existing.latitude && clubCity) {
        const coords = await geocodeCity(clubCity);
        if (coords) await supabase.from('clubs').update({ latitude: coords.lat, longitude: coords.lon }).eq('id', existing.id);
      }
      return existing.id;
    }

    // 3. Créer le club — upsert anti-doublon sur name_normalized
    const coords    = clubCity ? await geocodeCity(clubCity) : null;
    const parentId  = await findParentClub(nameKey);

    const { data: newClub, error } = await supabase
      .from('clubs')
      .upsert([{
        name:           nameKey,
        city:           clubCity ? clubCity.toUpperCase() : null,
        latitude:       coords?.lat ?? null,
        longitude:      coords?.lon ?? null,
        created_by:     userId,
        parent_club_id: parentId,
      }], { onConflict: 'name_normalized', ignoreDuplicates: false })
      .select('id')
      .single();

    if (error || !newClub) return null;

    // Lier au profil
    await supabase.from('profiles').update({ club_id: newClub.id }).eq('id', userId);
    return newClub.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    // Règle : ville + stade obligatoires pour publier
    if (!city.trim())    { alert("⚠️ La ville est obligatoire pour publier une annonce."); return; }
    if (!stadium.trim()) { alert("⚠️ Le stade est obligatoire pour publier une annonce."); return; }
    if (!isFlexible && !date) { alert("⚠️ Choisissez une date ou activez le mode Flexible."); return; }
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      // Assure que le coach a un club référencé avec coordonnées
      const clubName = teamInfo?.clubName || stadium || city;
      if (clubName && clubName !== 'MON CLUB') {
        const clubId = await ensureClub(user.id, clubName, city);
        console.log(`✓ Coach linked to club: ${clubId}`);
      }

      const matchData = {
        coach_id:          user.id,
        type,
        category:          mainCategory,
        date:              isFlexible ? null : date,
        time:              isFlexible ? null : startTime,
        availability_window: isFlexible ? (flexibleWindow || 'Flexible') : null,
        city:      city.toUpperCase(),
        stadium:   stadium.toUpperCase(),
        location:  `${stadium} ${city}`.trim().toUpperCase(),
        quotas:    type !== 'Match Amical' ? quotas : null,
        comment:   comment.toUpperCase(),
        // Si lieu différent du club d'origine, on stocke le club du lieu
        ...(venueClubId ? { venue_club_id: venueClubId } : {}),
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
           {/* Toggle date fixe / flexible */}
           <div className="flex items-center justify-between py-2">
             <span className={`text-[11px] font-black uppercase tracking-widest ${m.text}`}>
               Disponibilité
             </span>
             <button
               type="button"
               onClick={() => { setIsFlexible(!isFlexible); setDate(''); setStartTime(''); }}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase transition-all
                 ${isFlexible ? `${m.border} ${m.text} bg-white/5` : 'border-white/10 text-gray-500'}`}
             >
               {isFlexible ? '📅 Flexible' : '📅 Date fixe'}
             </button>
           </div>

           {isFlexible ? (
             <div className="space-y-3">
               <p className="text-[9px] font-bold text-gray-500 uppercase">Choisissez votre fenêtre de disponibilité</p>
               <div className="grid grid-cols-2 gap-2">
                 {['Weekend', 'Semaine', 'Vacances scolaires', 'Flexible'].map(w => (
                   <button
                     key={w} type="button"
                     onClick={() => setFlexibleWindow(w)}
                     className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all
                       ${flexibleWindow === w ? `${m.border} ${m.text} bg-white/5` : 'border-white/10 text-gray-500'}`}
                   >
                     {w}
                   </button>
                 ))}
               </div>
               <input
                 placeholder="OU PRÉCISEZ (EX: MAI-JUIN 2026)"
                 value={flexibleWindow}
                 onChange={e => setFlexibleWindow(e.target.value.toUpperCase())}
                 className={styles.input}
               />
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-4">
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
               <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={styles.input} />
             </div>
           )}

           {/* Sécurité 2 — lieu différent du club d'origine */}
           {showVenueWarning && (
             <div className="rounded-2xl border-2 border-orange-500/40 bg-orange-500/10 p-4 space-y-3 animate-in fade-in duration-300">
               <div className="flex items-start gap-3">
                 <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest">
                     Lieu différent de votre club
                   </p>
                   <p className="text-[9px] font-bold text-orange-300/70 mt-0.5">
                     Votre club : <span className="text-white">{teamInfo?.clubCity}</span> — Lieu saisi : <span className="text-white">{city}</span>
                   </p>
                   <p className="text-[9px] font-bold text-orange-300/70 mt-1">
                     S'agit-il d'un autre club ? Liez-le pour que la distance soit juste.
                   </p>
                 </div>
               </div>
               <ClubSearchInput
                 value=""
                 isPro={false}
                 placeholder={`Rechercher un club à ${city}...`}
                 onSelect={(club) => {
                   setVenueClubId(club.id);
                   if (club.city)    setCity(club.city.toUpperCase());
                   if (club.stadium) setStadium(club.stadium.toUpperCase());
                   setShowVenueWarning(false);
                 }}
                 onCreate={(name) => {
                   setVenueClubId(null);
                   setShowVenueWarning(false);
                 }}
               />
             </div>
           )}
        </section>

        <section className={styles.card}>
          <label className={styles.label}>CONSIGNES</label>
          <textarea placeholder="EX: NIVEAU D1, RECHERCHE CLUB SÉRIEUX..." value={comment} onChange={e => setComment(e.target.value)} className={`w-full h-32 bg-white/5 rounded-[2.5rem] p-6 text-sm font-medium text-white outline-none border-2 border-transparent focus:border-white/20 transition-all`} />
        </section>

        {/* Bannière profil incomplet */}
        {!isClubVerified && (
          <div className="rounded-2xl border-2 border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="text-[11px] font-black uppercase text-orange-400 tracking-widest">
                Profil club incomplet
              </p>
              <p className="text-[10px] font-bold text-orange-300/70 mt-1">
                Ajoutez la <span className="text-white">ville</span> et le <span className="text-white">stade</span> dans votre profil pour publier une annonce.
              </p>
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="mt-2 px-3 py-1.5 bg-orange-500 text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all"
              >
                Compléter mon profil →
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isClubVerified}
          className={`w-full font-black py-7 rounded-[3rem] transition-all flex items-center justify-center gap-5 uppercase italic text-2xl shadow-2xl
            ${isClubVerified ? `${m.primary} text-white active:scale-95 ${m.glow}` : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
        >
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
