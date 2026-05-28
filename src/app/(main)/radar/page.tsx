'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Filter, Wifi, Radio, User, History } from 'lucide-react';
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
 * RADAR_PAGE (v31.0 - DUAL FEED & ACTION FIX)
 * Sépare le Sonar (Adversaires) et la Gestion (Mes annonces).
 * Réparation du bouton "Proposer Match".
 */
export default function RadarPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [activeTab, setActiveTab] = useState<'radar' | 'my_signals'>('radar');
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
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
        .select(`*, profiles:coach_id (first_name, last_name, nickname, avatar_url, clubs:club_id (name, logo_url, latitude, longitude, city, stadium))`)
        .neq('status', 'EXPIRED')
        .order('date', { ascending: true });

      if (error) throw error;

      // Anti-doublons visuels
      const uniqueData = (data || []).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      const formatted: MatchRequest[] = uniqueData.map((item: any) => ({
        id: item.id,
        coachId: item.coach_id,
        coachClub: item.profiles?.clubs?.name || 'Club Inconnu',
        coachName: item.profiles?.nickname || `${item.profiles?.first_name} ${item.profiles?.last_name}` || 'Coach Inconnu',
        coachLogo: item.profiles?.clubs?.logo_url,
        stadium: item.profiles?.clubs?.stadium,
        type: item.type,
        category: item.category,
        status: item.status,
        date: item.date,
        time: item.time,
        location: item.location,
        comment: item.comment,
        latitude: item.profiles?.clubs?.latitude,
        longitude: item.profiles?.clubs?.longitude,
        respondentId: item.respondent_id,
        x: 20 + (Math.random() * 60),
        y: 20 + (Math.random() * 60),
      }));

      setRequests(formatted);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchRadarData(); }, [fetchRadarData]);

  // --- LOGIQUE DE SÉPARATION ---

  // 1. LES ADVERSAIRES (POUR LE SONAR ET LE FLUX RADAR)
  const enemyRequests = useMemo(() => {
    return requests.filter(req =>
      req.coachId !== currentUserId &&
      (filterCategory === 'TOUS' || req.category === filterCategory)
    );
  }, [requests, currentUserId, filterCategory]);

  // 2. MES ANNONCES (POUR L'ONGLET GESTION)
  const myRequests = useMemo(() => {
    return requests.filter(req => req.coachId === currentUserId);
  }, [requests, currentUserId]);

  // --- ACTIONS ---

  const handleProposeMatch = async (requestId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // 1. On passe la requête en PENDING
      const { error } = await supabase
        .from('match_requests')
        .update({
          status: 'PENDING',
          respondent_id: currentUserId
        })
        .eq('id', requestId);

      if (error) throw error;

      // 2. On ouvre le chat automatiquement
      const target = requests.find(r => r.id === requestId);
      if (target) setSelectedChatRequest(target);

      await fetchRadarData();
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("⚠️ Confirmer la suppression ?")) return;
    try {
      await supabase.from('match_requests').delete().eq('id', id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const styles = isPro ? { accent: 'text-orange-600', btn: 'bg-orange-600 text-white', card: 'bg-white border-gray-100 shadow-xl' }
                       : { accent: 'text-neon-cyan', btn: 'bg-neon-cyan text-black', card: 'bg-[#050505] border-white/5 shadow-2xl' };

  return (
    <main className={`min-h-screen pb-40 max-w-2xl mx-auto p-4 space-y-8 ${isPro ? 'bg-gray-50' : 'bg-black'}`}>

      {/* 1. SWITCH DE VUE TACTIQUE */}
      <div className="flex justify-between items-center px-2">
         <div className={`p-1 rounded-2xl flex border ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/5'} w-fit`}>
            <button onClick={() => setActiveTab('radar')} className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'radar' ? styles.btn : 'text-gray-500'}`}>
              <Radio size={16} /> <span className="text-[10px] font-black uppercase italic">Sonar</span>
            </button>
            <button onClick={() => setActiveTab('my_signals')} className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'my_signals' ? styles.btn : 'text-gray-500'}`}>
              <History size={16} /> <span className="text-[10px] font-black uppercase italic">Mes Signaux</span>
            </button>
         </div>
         <button onClick={() => router.push('/radar/new')} className={`p-4 rounded-2xl shadow-xl active:scale-90 ${styles.btn}`}>
            <Plus size={24} strokeWidth={4} />
         </button>
      </div>

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
               <div className="p-6 bg-white rounded-3xl border border-gray-100 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                     {categories.slice(0, 4).map(c => <button key={c} onClick={() => setFilterCategory(c)} className={`py-2 rounded-xl text-[8px] font-black border ${filterCategory === c ? styles.btn : 'border-gray-100 text-gray-400'}`}>{c}</button>)}
                  </div>
               </div>
            )}

            <div className="grid grid-cols-1 gap-6">
               {enemyRequests.map(req => (
                 <MatchRequestCard
                    key={req.id} request={req} isPro={isPro} currentCoachId={currentUserId}
                    onInterested={handleProposeMatch}
                    onAccept={()=>{}} onRefuse={()=>{}}
                    onChat={(r) => setSelectedChatRequest(r)}
                 />
               ))}
               {enemyRequests.length === 0 && !isLoading && <p className="text-center py-20 text-[10px] font-black text-gray-300 uppercase italic">Aucun adversaire détecté</p>}
            </div>
          </div>
        </>
      ) : (
        /* ONGLET GESTION : MES ANNONCES */
        <div className="space-y-6 animate-in fade-in duration-500">
           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-600 px-2 flex items-center gap-2"><Wifi size={14}/> Mes Signaux en cours</h3>
           <div className="grid grid-cols-1 gap-6">
              {myRequests.map(req => (
                <MatchRequestCard
                  key={req.id} request={req} isPro={isPro} currentCoachId={currentUserId}
                  onInterested={()=>{}} onAccept={()=>{}} onRefuse={()=>{}}
                  onChat={(r) => setSelectedChatRequest(r)}
                  onDelete={handleDeleteRequest}
                  onEdit={(id) => router.push(`/radar/new?id=${id}`)}
                />
              ))}
              {myRequests.length === 0 && <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200"><p className="text-[10px] font-black text-gray-300 uppercase">Aucune annonce déposée</p></div>}
           </div>
        </div>
      )}

      {selectedChatRequest && (
        <NegotiationChat
          isOpen={!!selectedChatRequest} onClose={() => setSelectedChatRequest(null)}
          matchRequestId={selectedChatRequest.id} currentUserId={currentUserId}
          otherCoachName={selectedChatRequest.coachName} theme={theme as any}
        />
      )}
    </main>
  );
}
