'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Filter, Wifi } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { RadarSonar } from '@/components/RadarSonar';
import { MatchRequestCard } from './MatchRequestCard';
import { NegotiationChat } from '@/components/NegotiationChat';
import { supabase } from '@/lib/supabase/client';

export interface MatchRequest {
  id: string;
  coachId: string;
  coachClub: string;
  coachName: string;
  coachLogo?: string;
  type: string;
  category: string;
  status: 'OPEN' | 'PENDING' | 'MATCHED' | 'EXPIRED';
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
  x?: number;
  y?: number;
}

/**
 * Calcule la distance entre deux points GPS (en KM)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * RADAR_PAGE (v30.1 - DISTANCE SORTING)
 * Affiche le Sonar Nexus et les Annonces sur la même page.
 * Système de filtrage intégré.
 */
export default function RadarPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedChatRequest, setSelectedChatRequest] = useState<MatchRequest | null>(null);

  // FILTERS
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('TOUS');
  const [filterDistance, setFilterDistance] = useState(50);

  const categories = ['TOUS', 'U6/U7', 'U8/U9', 'U10/U11', 'U12/U13', 'U14/U15', 'U16/U17', 'U18', 'SÉNIORS', 'VÉTÉRANS'];

  const fetchRadarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('match_requests')
        .select(`*, profiles:coach_id (first_name, last_name, clubs:club_id (name, logo_url, latitude, longitude, city, stadium))`)
        .neq('status', 'EXPIRED')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      const uniqueData = (data || []).filter((v, i, a) =>
        a.findIndex(t => t.id === v.id) === i
      );

      const formatted: MatchRequest[] = uniqueData.map((item: any) => {
        const itemLat = item.profiles?.clubs?.latitude;
        const itemLng = item.profiles?.clubs?.longitude;
        let distanceKm;

        if (itemLat && itemLng && teamInfo?.latitude && teamInfo?.longitude) {
          distanceKm = calculateDistance(teamInfo.latitude, teamInfo.longitude, itemLat, itemLng);
        }

        return {
          id: item.id,
          coachId: item.coach_id,
          coachClub: item.profiles?.clubs?.name || 'Club Inconnu',
          coachName: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : 'Coach Inconnu',
          coachLogo: item.profiles?.clubs?.logo_url,
          stadium: item.profiles?.clubs?.stadium,
          type: item.type,
          category: item.category,
          status: item.status,
          date: item.date,
          time: item.time,
          location: item.location,
          comment: item.comment,
          latitude: itemLat,
          longitude: itemLng,
          distanceKm: distanceKm,
          x: 20 + (Math.random() * 60),
          y: 20 + (Math.random() * 60),
        };
      });

      setRequests(formatted);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [teamInfo]);

  useEffect(() => { fetchRadarData(); }, [fetchRadarData]);

  // FILTRAGE ET TRI PAR DISTANCE
  const filteredRequests = useMemo(() => {
    return requests
      .filter(req => {
        const matchCat = filterCategory === 'TOUS' || req.category === filterCategory;
        const matchDist = !req.distanceKm || req.distanceKm <= filterDistance;
        return matchCat && matchDist;
      })
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999)); // Tri du plus proche au plus loin
  }, [requests, filterCategory, filterDistance]);

  const sonarSignals = useMemo(() => {
    return filteredRequests.filter(req => req.coachId !== currentUserId);
  }, [filteredRequests, currentUserId]);

  const styles = isPro ? {
    accent: 'text-orange-600',
    btnPrimary: 'bg-orange-600 text-white shadow-lg',
    card: 'bg-white border-gray-200 shadow-xl'
  } : {
    accent: 'text-neon-cyan',
    btnPrimary: 'bg-neon-cyan text-black shadow-lg',
    card: 'bg-[#050505] border-white/5 shadow-2xl'
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("⚠️ Confirmer la suppression de cette annonce ?")) return;
    try {
      const { error } = await supabase.from('match_requests').delete().eq('id', id);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== id));
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err: any) { alert(err.message); }
  };

  const handleEditRequest = (id: string) => {
    router.push(`/radar/new?id=${id}`);
  };

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleAcceptMatch = async (requestId: string) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const { data: request, error: fetchError } = await supabase
        .from('match_requests')
        .select('*, profiles:coach_id(club_id)')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) throw new Error("Impossible de récupérer la demande.");

      // CRÉATION DE L'ÉVÉNEMENT AVEC SÉCURITÉ UPSERT
      const { error: eventError } = await supabase.from('events').upsert([{
        home_club_id: request.profiles.club_id,
        away_club_id: teamInfo.id,
        date: request.date,
        time: request.time,
        title: `MATCH vs ${teamInfo.clubName}`,
        type: request.type,
        location: request.location,
        stadium_name: request.stadium
      }], { onConflict: 'date,time,home_club_id' });

      if (eventError) throw eventError;

      // MISE À JOUR DE LA DEMANDE
      await supabase.from('match_requests').update({ status: 'MATCHED', respondent_id: currentUserId }).eq('id', requestId);

      await fetchRadarData();
      alert("✅ MATCH CONCLU ET AJOUTÉ À L'AGENDA !");
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <main className={`min-h-screen pb-40 max-w-2xl mx-auto p-4 space-y-10 ${isPro ? 'bg-gray-50' : 'bg-black'}`}>

      {/* HEADER ACTION */}
      <div className="flex justify-between items-center px-2">
        <h1 className={`text-3xl font-black uppercase italic tracking-tighter ${isPro ? 'text-gray-900' : 'text-white'}`}>
          Radar_Tactique
        </h1>
        <div className="flex gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-2xl border ${showFilters ? styles.btnPrimary : (isPro ? 'bg-white' : 'bg-white/5')} transition-all active:scale-90`}>
             <Filter size={20} />
          </button>
          <button onClick={() => router.push('/radar/new')} className={`p-4 rounded-2xl transition-all active:scale-90 ${styles.btnPrimary}`}>
            <Plus size={24} strokeWidth={4} />
          </button>
        </div>
      </div>

      {/* 1. LE SONAR NEXUS (TOUJOURS VISIBLE) */}
      <section className={`rounded-[3rem] border-2 p-0 relative overflow-hidden transition-all duration-700 ${styles.card}`}>
         {isLoading ? (
           <div className="h-[400px] flex items-center justify-center">
             <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
           </div>
         ) : (
           <RadarSonar
             signals={sonarSignals}
             onSignalClick={() => {}}
             isScanning={isScanning}
             theme={theme as any}
           />
         )}
      </section>

      {/* 2. FILTRES DYNAMIQUES */}
      {showFilters && (
        <section className={`p-8 rounded-[2.5rem] border ${isPro ? 'bg-white border-gray-100' : 'bg-white/5 border-white/10'} animate-in slide-in-from-top-4 duration-500 space-y-8 shadow-inner`}>
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Filtrer par catégorie</label>
              <div className="flex flex-wrap gap-2">
                 {categories.map(cat => (
                   <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black border transition-all ${filterCategory === cat ? styles.btnPrimary : 'bg-gray-50 border-gray-100 text-gray-400'}`}>{cat}</button>
                 ))}
              </div>
           </div>
           <div className="space-y-4 text-left">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Rayon de détection</label>
                 <span className={`text-xs font-black italic ${styles.accent}`}>{filterDistance} KM</span>
              </div>
              <input type="range" min="5" max="200" step="5" value={filterDistance} onChange={(e) => setFilterDistance(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" />
           </div>
        </section>
      )}

      {/* 3. LISTE DES ANNONCES (SOUS LE RADAR) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 border-b border-gray-200 pb-2">
           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
              <Wifi size={14} className={styles.accent} /> Flux de Missions
           </h3>
           <span className="text-[9px] font-bold text-gray-400 uppercase italic">{filteredRequests.length} Résultats</span>
        </div>

        <div className="grid grid-cols-1 gap-6">
           {filteredRequests.map(req => (
             <MatchRequestCard
               key={req.id}
               request={req}
               isPro={isPro}
               currentCoachId={currentUserId}
               onInterested={()=>{}}
               onAccept={()=>{}}
               onRefuse={()=>{}}
               onChat={(r) => setSelectedChatRequest(r)}
               onDelete={handleDeleteRequest}
               onEdit={handleEditRequest}
             />
           ))}

           {filteredRequests.length === 0 && !isLoading && (
             <div className="py-20 text-center opacity-30 italic uppercase text-[10px] space-y-4">
                <p>Aucun signal détecté dans ce périmètre</p>
                <button onClick={() => setFilterCategory('TOUS')} className="text-orange-600 underline">Réinitialiser les filtres</button>
             </div>
           )}
        </div>
      </div>

      {selectedChatRequest && (
        <NegotiationChat
          isOpen={!!selectedChatRequest}
          onClose={() => setSelectedChatRequest(null)}
          matchRequestId={selectedChatRequest.id}
          currentUserId={currentUserId}
          otherCoachName={selectedChatRequest.coachName}
          theme={theme as any}
        />
      )}
    </main>
  );
}
