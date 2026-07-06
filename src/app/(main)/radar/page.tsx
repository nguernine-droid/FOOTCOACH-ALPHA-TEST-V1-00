'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Filter, Wifi, Radio, User, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { RadarSonar } from '@/components/RadarSonar';
import { MatchRequestCard } from './MatchRequestCard';
import { NegotiationChat } from '@/components/NegotiationChat';
import { RefuseModal } from '@/components/RefuseModal';
import { supabase } from '@/lib/supabase/client';

export interface MatchRequest {
  id: string;
  coachId: string;
  isSos?: boolean;
  sosReason?: string | null;
  coachClub: string;
  coachName: string;
  coachLogo?: string;
  coachGrade?: string;
  coachLevel?: string;
  matchCount?: number;
  type: string;
  category: string;
  desiredLevel?: string;
  availabilityWindow?: string | null;
  status: 'OPEN' | 'POSTMATCHED' | 'PENDING' | 'MATCHED' | 'EXPIRED' | 'CANCELLED';
  distance?: string;
  date: string;
  time: string;
  location: string;
  comment?: string;
  respondentId?: string;
  respondentName?: string;
  respondentLogo?: string;
  stadium?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  viewsCount?: number;
  responsesCount?: number;
  x?: number;
  y?: number;
}

/**
 * RADAR_PAGE (v31.0 - DUAL FEED & ACTION FIX)
 * Sépare le Sonar (Adversaires) et la Gestion (Mes annonces).
 * Réparation du bouton "Proposer Match".
 */
export default function RadarPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  // Club vérifié = ville + stade renseignés
  const isClubVerified = !!(teamInfo?.clubCity?.trim() && teamInfo?.clubStadium?.trim());

  const [activeTab, setActiveTab] = useState<'radar' | 'my_signals' | 'history'>('radar');
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [myArchivedRequests, setMyArchivedRequests] = useState<MatchRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedChatRequest, setSelectedChatRequest] = useState<MatchRequest | null>(null);
  const [refuseTarget, setRefuseTarget] = useState<MatchRequest | null>(null);

  // FILTERS
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState(teamInfo?.category || 'TOUS');
  const [filterDistance, setFilterDistance] = useState(teamInfo?.matchDistMax || 50);
  const [filterLevel, setFilterLevel] = useState(teamInfo?.level || 'TOUS');

  const levels = ['TOUS', 'D1', 'D2', 'D3', 'D4', 'D5', 'Espoir', 'Loisir'];

  const categories = ['TOUS', 'U6/U7', 'U8/U9', 'U10/U11', 'U12/U13', 'U14/U15', 'U16/U17', 'U18', 'SÉNIORS', 'VÉTÉRANS'];

  // Haversine : distance en km entre deux points GPS
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const fetchRadarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      setCurrentUserId(user.id);

      // 🎯 REQUÊTE DIRECTE : Récupérer annonces OPEN + propositions en cours (POSTMATCHED/PENDING)
      const { data, error } = await supabase
        .from('match_requests')
        .select('*, profiles:coach_id (first_name, last_name, nickname, avatar_url, clubs:club_id (name, logo_url, latitude, longitude, city, stadium))')
        .in('status', ['OPEN', 'POSTMATCHED', 'PENDING'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔴 RADAR FETCH ERROR:', error);
        throw error;
      }

      console.log('✓ Data from view:', data?.length || 0);

      // Anti-doublons visuels
      const uniqueData = (data || []).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      const myLat = teamInfo?.latitude;
      const myLon = teamInfo?.longitude;

      const formatted: MatchRequest[] = uniqueData.map((item: any) => {
        // Données nested depuis le JOIN
        const profile = item.profiles;
        const club = profile?.clubs;
        const coachName = profile?.nickname || profile?.first_name || 'COACH ANONYME';

        // Calcul distance si coordonnées disponibles
        let distanceKm: number | undefined = undefined;
        if (myLat && myLon && club?.latitude && club?.longitude) {
          distanceKm = haversine(myLat, myLon, club.latitude, club.longitude);
        }

        return {
          id: item.id,
          coachId: item.coach_id,
          coachClub: club?.name || 'Club Inconnu',
          coachName: coachName.trim(),
          coachLogo: club?.logo_url,
          coachGrade: item.coach_grade || null,
          coachLevel: item.coach_level || null,
          stadium: club?.stadium,
          type: item.type,
          category: item.category,
          desiredLevel: item.desired_level || null,
          status: item.status,
          date: item.date,
          time: item.time,
          location: item.location,
          comment: item.comment,
          latitude: club?.latitude,
          longitude: club?.longitude,
          distanceKm,
          viewsCount:         item.views_count || 0,
          responsesCount:     item.responses_count || 0,
          respondentId:       item.respondent_id,
          availabilityWindow: item.availability_window || null,
          isSos:              item.is_sos || false,
          sosReason:          item.sos_reason || null,
          x: 20 + (Math.random() * 60),
          y: 20 + (Math.random() * 60),
        };
      });

      setRequests(formatted);

      // Fetch séparé pour MES annonces (toutes, y compris MATCHED)
      if (user) {
        const { data: myData } = await supabase
          .from('match_requests')
          .select(`*, profiles:coach_id (first_name, last_name, nickname, avatar_url, clubs:club_id (name, logo_url, latitude, longitude, city, stadium))`)
          .eq('coach_id', user.id)
          .is('deleted_at', null)
          .order('date', { ascending: false });

        const myFormatted: MatchRequest[] = (myData || []).map((item: any) => ({
          id: item.id, coachId: item.coach_id,
          coachClub: item.profiles?.clubs?.name || 'Club Inconnu',
          coachName: item.profiles?.nickname || item.profiles?.first_name || 'MOI',
          coachLogo: item.profiles?.clubs?.logo_url,
          stadium: item.profiles?.clubs?.stadium,
          type: item.type, category: item.category, status: item.status,
          viewsCount: item.views_count || 0,
          responsesCount: item.responses_count || 0,
          date: item.date, time: item.time, location: item.location,
          comment: item.comment, respondentId: item.respondent_id,
          x: 50, y: 50,
        }));
        setMyArchivedRequests(myFormatted);
      }

    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchRadarData(); }, [fetchRadarData]);

  // --- LOGIQUE DE SÉPARATION ---

  // 1. LES ADVERSAIRES (POUR LE SONAR ET LE FLUX RADAR)
  const enemyRequests = useMemo(() => {
    // SÉCURITÉ PURETÉ ID (ANTI-ÉCHO)
    if (!currentUserId) return [];

    return requests
      .filter(req =>
        req.coachId !== currentUserId && // EXCLUSION STRICTE DE MES ANNONCES
        ['OPEN', 'POSTMATCHED', 'PENDING'].includes(req.status) &&
        (filterCategory === 'TOUS' || req.category === filterCategory) &&
        (filterLevel === 'TOUS' || req.desiredLevel === filterLevel || req.coachLevel === filterLevel) &&
        (req.distanceKm === undefined || req.distanceKm <= filterDistance)
      )
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // FILTRE ANTI-DOUBLON FINAL
      .sort((a, b) => {
        // SOS toujours en premier
        if (a.isSos && !b.isSos) return -1;
        if (!a.isSos && b.isSos) return 1;
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [requests, currentUserId, filterCategory, filterDistance]);

  // 2. MES ANNONCES actives (OPEN, POSTMATCHED, PENDING)
  const myRequests = useMemo(() =>
    myArchivedRequests.filter(r => ['OPEN','POSTMATCHED','PENDING'].includes(r.status)),
  [myArchivedRequests]);

  // 2.5 LES DÉFIS QUE J'AI RELEVÉS (En tant que répondant)
  const challengesJoined = useMemo(() => {
    return requests.filter(req => req.respondentId === currentUserId && req.status !== 'MATCHED');
  }, [requests, currentUserId]);

  // 3. HISTORIQUE matchs validés (MATCHED)
  const myHistory = useMemo(() =>
    myArchivedRequests.filter(r => r.status === 'MATCHED'),
  [myArchivedRequests]);

  // Badge : nb de mes annonces avec une réponse en attente
  const pendingCount = useMemo(() => {
    return myRequests.filter(r => r.status === 'POSTMATCHED').length;
  }, [myRequests]);

  // --- ACTIONS ---

  const handleProposeMatch = async (requestId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // 1. Passage en POSTMATCHED (Défi lancé)
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({
          status: 'POSTMATCHED',
          respondent_id: currentUserId
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 2. ENVOI DU SIGNAL RADIO INITIAL (Ouverture du salon)
      await supabase.from('messages').insert([{
        match_request_id: requestId,
        sender_id: currentUserId,
        text: "Bonjour Coach, je suis partant pour ce match ! On en discute ?"
      }]);

      // 3. Notifier Coach A via push
      const target = requests.find(r => r.id === requestId);
      if (target) {
        const myName = teamInfo?.coachName || 'Un coach';
        supabase.functions.invoke('notify-coach', {
          body: {
            profile_id: target.coachId,
            title: isPro ? '⚡ Nouvelle proposition !' : '⚡ Défi lancé !',
            body:  `${myName} veut relever votre défi !`,
            url: '/radar',
          },
        });

        // 4. Ouvrir le chat automatiquement
        setSelectedChatRequest(target);
      }

      await fetchRadarData();
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    } catch (err: any) {
      alert("Erreur de transmission : " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // 1. Récupérer les infos complètes de la demande
      const { data: mr, error: mrErr } = await supabase
        .from('match_requests')
        .select('*, profiles:coach_id(first_name, last_name, nickname, club_id, clubs:club_id(id, name))')
        .eq('id', requestId)
        .single();
      if (mrErr || !mr) throw new Error('Annonce introuvable');

      // 2. Récupérer le club du répondant (Coach B)
      const { data: respondentProfile } = await supabase
        .from('profiles')
        .select('club_id, clubs:club_id(id, name)')
        .eq('id', mr.respondent_id)
        .single();

      const homeClubId  = mr.profiles?.clubs?.id   || null;
      const awayClubId  = (respondentProfile as any)?.clubs?.id || null;
      const homeClubName = mr.profiles?.clubs?.name  || 'Club A';
      const awayClubName = (respondentProfile as any)?.clubs?.name || 'Club B';

      const eventTitle = `${homeClubName} vs ${awayClubName}`;

      // 3. Passer en PENDING (TRAITEMENT) — l'événement sera créé après double validation
      const { error: updErr } = await supabase
        .from('match_requests')
        .update({
          status:           'PENDING',
          coach_a_confirmed: false,
          coach_b_confirmed: false,
        })
        .eq('id', requestId);
      if (updErr) throw updErr;

      // Stocker les infos clubs pour la fiche (utilisées dans NegotiationChat)
      await supabase.from('match_requests').update({
        // On stocke temporairement dans tournament_config pour la fiche
        tournament_config: {
          is_official:    false,
          from_radar:     true,
          home_club_id:   homeClubId,
          away_club_id:   awayClubId,
          home_club_name: homeClubName,
          away_club_name: awayClubName,
        }
      }).eq('id', requestId);

      if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
      await fetchRadarData();

      // 4. Ouvrir le chat avec la fiche de match
      const target = myArchivedRequests.find(r => r.id === requestId)
                  || requests.find(r => r.id === requestId);
      if (target) setSelectedChatRequest({ ...target, status: 'PENDING' });

    } catch (err: any) {
      alert('Erreur : ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const MOTIF_LABELS: Record<string, string> = {
    distance: 'Trop loin',
    date:     'Date impossible',
    niveau:   'Niveau différent',
  };

  const handleRefuse = async (motifId: string) => {
    if (!refuseTarget) return;
    try {
      // 1. Annonce repasse en OPEN + respondent_id effacé
      await supabase
        .from('match_requests')
        .update({ status: 'OPEN', respondent_id: null })
        .eq('id', refuseTarget.id);

      // 2. Message système dans le chat pour prévenir Coach B
      const motifLabel = MOTIF_LABELS[motifId] || motifId;
      const myName = teamInfo?.coachName || 'Le coach';
      await supabase.from('messages').insert([{
        match_request_id: refuseTarget.id,
        sender_id:        currentUserId,
        text:             `❌ ${myName} a décliné votre proposition — Motif : ${motifLabel}.`,
      }]);

      setRefuseTarget(null);
      await fetchRadarData();
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err: any) {
      alert('Erreur : ' + err.message);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("⚠️ Confirmer la suppression ?")) return;
    try {
      await supabase.from('match_requests').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const styles = isPro ? { accent: 'text-orange-600', btn: 'bg-orange-600 text-white', card: 'bg-white border-gray-100 shadow-xl' }
                       : { accent: 'text-neon-cyan', btn: 'bg-neon-cyan text-black', card: 'bg-[#050505] border-white/5 shadow-2xl' };

  return (
    <main className={`min-h-screen pb-40 max-w-2xl mx-auto p-4 space-y-8 ${isPro ? 'bg-gray-50' : 'bg-black'}`}>

      {/* BANNIÈRE CLUB INCOMPLET */}
      {!isClubVerified && (
        <div className={`rounded-2xl border-2 border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3`}>
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-[11px] font-black uppercase text-orange-400 tracking-widest">
              Profil club incomplet
            </p>
            <p className="text-[10px] font-bold text-orange-300/70 mt-1">
              Ajoutez la <span className="text-white">ville</span> et le <span className="text-white">stade</span> de votre club dans votre profil pour déposer ou répondre à une annonce.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="mt-2 px-3 py-1.5 bg-orange-500 text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all"
            >
              Compléter mon profil →
            </button>
          </div>
        </div>
      )}

      {/* 1. SWITCH DE VUE TACTIQUE (TRIPTYQUE) */}
      <div className="flex justify-between items-center px-2">
         <div className={`p-1 rounded-2xl flex border ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/5'} w-fit`}>
            <button onClick={() => setActiveTab('radar')} className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'radar' ? styles.btn : 'text-gray-500'}`}>
              <Radio size={16} /> <span className="text-[10px] font-black uppercase italic">Sonar</span>
            </button>
            <button onClick={() => setActiveTab('my_signals')} className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all relative ${activeTab === 'my_signals' ? styles.btn : 'text-gray-500'}`}>
              <Wifi size={16} />
              <span className="text-[10px] font-black uppercase italic">Signaux</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all relative ${activeTab === 'history' ? styles.btn : 'text-gray-500'}`}>
              <History size={16} />
              <span className="text-[10px] font-black uppercase italic">Historique</span>
              {myHistory.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-[9px] font-black rounded-full flex items-center justify-center ${isPro ? 'bg-green-500' : 'bg-[#39FF14] text-black'}`}>
                  {myHistory.length}
                </span>
              )}
            </button>
         </div>
         <button
           onClick={() => isClubVerified ? router.push('/radar/new') : null}
           disabled={!isClubVerified}
           title={!isClubVerified ? 'Complétez votre profil club pour déposer une annonce' : undefined}
           className={`p-4 rounded-2xl shadow-xl transition-all ${isClubVerified ? `active:scale-90 ${styles.btn}` : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}`}
         >
            <Plus size={24} strokeWidth={4} />
         </button>
      </div>

      {/* 2. SECTION FILTRES INTÉGRÉE (ENTRE HEADER ET RADAR) */}
      <section className={`p-6 rounded-[2.5rem] border-2 space-y-5 animate-in slide-in-from-top-4 duration-500 shadow-lg ${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'}`}>
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2"><Filter size={14} className={styles.accent} /> Réglages Tactiques</h3>
           <span className="text-[9px] font-bold text-gray-300 uppercase italic">Basé sur votre profil</span>
        </div>

        {/* Catégories (Scroll horizontal) */}
        <div className="space-y-2">
           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Catégorie cible</p>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)} className={`px-4 py-2 rounded-xl text-[9px] font-black border-2 transition-all shrink-0 ${filterCategory === c ? styles.btn : 'bg-gray-50 border-gray-50 text-gray-400'}`}>{c}</button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-6 items-end">
           {/* Distance (Slider) */}
           <div className="space-y-3">
              <div className="flex justify-between items-center">
                 <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Rayon</p>
                 <span className={`text-xs font-black italic ${styles.accent}`}>{filterDistance} KM</span>
              </div>
              <input type="range" min={5} max={150} step={5} value={filterDistance} onChange={e => setFilterDistance(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600" />
           </div>

           {/* Niveau (Dropdown simplifié) */}
           <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Niveau de jeu</p>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-[10px] font-black uppercase outline-none transition-all ${isPro ? 'bg-gray-50 border-gray-50 text-gray-900 focus:border-orange-500' : 'bg-black border-white/10 text-white'}`}>
                 {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
           </div>
        </div>
      </section>

      {activeTab === 'radar' ? (
        <>
          {/* LE SONAR (ADVERSAIRES UNIQUEMENT) */}
          <section className={`rounded-[3rem] border-2 p-0 relative overflow-hidden ${styles.card}`}>
            {isLoading ? <div className="h-[400px] flex items-center justify-center"><Loader2 className={`animate-spin ${styles.accent}`} /></div>
                       : <RadarSonar signals={enemyRequests} onSignalClick={() => {}} isScanning={isScanning} theme={theme as any} />}
          </section>

          {/* FLUX DES MISSIONS ADVERSES */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2 border-b border-gray-200 pb-2">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Radar de Missions</h3>
               <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg border ${showFilters ? styles.btn : 'border-gray-200'}`}><Filter size={16}/></button>
            </div>

            {showFilters && (
              <div className={`p-6 rounded-3xl border animate-in slide-in-from-top-2 duration-300 space-y-5 ${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'}`}>
                {/* Filtre catégorie */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Catégorie</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button key={c} onClick={() => setFilterCategory(c)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all ${filterCategory === c ? styles.btn : isPro ? 'border-gray-100 text-gray-400' : 'border-white/10 text-gray-500'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Filtre niveau */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Niveau</p>
                  <div className="flex flex-wrap gap-2">
                    {levels.map(l => (
                      <button key={l} onClick={() => setFilterLevel(l)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all ${filterLevel === l ? styles.btn : isPro ? 'border-gray-100 text-gray-400' : 'border-white/10 text-gray-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Filtre distance */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">
                    Distance max — <span className={`${isPro ? 'text-orange-600' : 'text-neon-cyan'}`}>{filterDistance} km</span>
                  </p>
                  <input
                    type="range" min={5} max={200} step={5}
                    value={filterDistance}
                    onChange={e => setFilterDistance(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[8px] font-black text-gray-400 mt-1">
                    <span>5 km</span><span>50 km</span><span>100 km</span><span>200 km</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
               {enemyRequests.map(req => (
                 <MatchRequestCard
                    key={req.id} request={req} isPro={isPro} currentCoachId={currentUserId}
                    onInterested={isClubVerified ? handleProposeMatch : () => {}}
                    canInteract={isClubVerified}
                    onAccept={handleAccept} onRefuse={(r) => setRefuseTarget(requests.find(x => x.id === r) || null)}
                    onChat={(r) => setSelectedChatRequest(r)}
                 />
               ))}
               {enemyRequests.length === 0 && !isLoading && <p className="text-center py-20 text-[10px] font-black text-gray-300 uppercase italic">Aucun adversaire détecté</p>}
            </div>
          </div>
        </>
      ) : activeTab === 'my_signals' ? (
        /* ONGLET MES SIGNAUX (SÉPARÉ EN 2 SECTIONS) */
        <div className="space-y-10 animate-in fade-in duration-500">

          {/* SECTION A : ÉMISSIONS */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-600 px-2 flex items-center gap-2">
              <Wifi size={14}/> Mes Signaux émis
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {myRequests.map(req => (
                <MatchRequestCard
                  key={req.id} request={req} isPro={isPro} currentCoachId={currentUserId}
                  onInterested={()=>{}} onAccept={handleAccept}
                  onRefuse={(r) => setRefuseTarget(myRequests.find(x => x.id === r) || null)}
                  onChat={(r) => setSelectedChatRequest(r)}
                  onDelete={handleDeleteRequest}
                  onEdit={(id) => router.push(`/radar/new?id=${id}`)}
                />
              ))}
              {myRequests.length === 0 && (
                <div className="py-10 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                  <p className="text-[9px] font-black text-gray-300 uppercase">Aucun signal émis</p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION B : RÉPONSES (DÉFIS RELEVÉS) */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-neon-cyan px-2 flex items-center gap-2">
              <Radio size={14}/> Réponses aux signaux
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {challengesJoined.map(req => (
                <MatchRequestCard
                  key={req.id} request={req} isPro={isPro} currentCoachId={currentUserId}
                  onInterested={()=>{}} onAccept={handleAccept}
                  onRefuse={(r) => setRefuseTarget(challengesJoined.find(x => x.id === r) || null)}
                  onChat={(r) => setSelectedChatRequest(r)}
                />
              ))}
              {challengesJoined.length === 0 && (
                <div className="py-10 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                  <p className="text-[9px] font-black text-gray-300 uppercase">Aucun défi relevé</p>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* ONGLET PALMARÈS — HISTORIQUE MATCHS VALIDÉS */
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-green-600 px-2 flex items-center gap-2">
            <History size={14}/> Matchs validés
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {myHistory.map(req => (
              <div key={req.id} className={`rounded-2xl border-2 p-5 space-y-3 ${isPro ? 'bg-white border-green-100' : 'bg-white/5 border-[#39FF14]/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase italic ${isPro ? 'text-gray-900' : 'text-white'}`}>{req.type}</p>
                    <p className={`text-[10px] font-bold uppercase ${isPro ? 'text-gray-400' : 'text-gray-500'}`}>{req.category}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${isPro ? 'bg-green-50 text-green-600' : 'bg-[#39FF14]/10 text-[#39FF14]'}`}>
                    ✅ Validé
                  </span>
                </div>
                <div className={`text-[10px] font-bold uppercase flex items-center gap-3 ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span>📅 {new Date(req.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>⏰ {req.time?.slice(0,5)}</span>
                  <span>📍 {req.location}</span>
                </div>
                <button
                  onClick={() => setSelectedChatRequest(req)}
                  className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${isPro ? 'text-orange-500' : 'text-neon-cyan'}`}
                >
                  💬 Voir la conversation
                </button>
              </div>
            ))}
            {myHistory.length === 0 && (
              <div className={`py-20 text-center rounded-[3rem] border-2 border-dashed ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                <p className="text-[10px] font-black text-gray-300 uppercase">Aucun match validé pour l'instant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedChatRequest && (
        <NegotiationChat
          isOpen={!!selectedChatRequest}
          onClose={() => setSelectedChatRequest(null)}
          matchRequestId={selectedChatRequest.id}
          currentUserId={currentUserId}
          otherCoachName={selectedChatRequest.coachName}
          otherCoachLogo={selectedChatRequest.coachLogo}
          myLogo={teamInfo?.clubLogo}
          theme={theme as any}
          onBothConfirmed={() => {
            setSelectedChatRequest(null);
            fetchRadarData();
          }}
        />
      )}

      <RefuseModal
        isOpen={!!refuseTarget}
        coachName={refuseTarget?.respondentName || 'ce coach'}
        isPro={isPro}
        onConfirm={handleRefuse}
        onCancel={() => setRefuseTarget(null)}
      />
    </main>
  );
}
