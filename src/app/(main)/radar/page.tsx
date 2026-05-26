'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wifi, Activity, Plus, Loader2, List, Radar as RadarIcon, Filter, MapPin, Search } from 'lucide-react';
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
  x?: number;
  y?: number;
}

export default function RadarPage() {
  const router = useRouter();
  const { theme, teamInfo } = useTeam();
  const isPro = theme === 'classic';

  const [viewMode, setViewMode] = useState<'sonar' | 'list'>('sonar');
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedChatRequest, setSelectedChatRequest] = useState<MatchRequest | null>(null);

  // FILTERS
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('TOUS');
  const [filterDistance, setFilterDistance] = useState(50); // km

  const categories = ['TOUS', 'U6/U7', 'U8/U9', 'U10/U11', 'U12/U13', 'U14/U15', 'U16/U17', 'U18', 'SÉNIORS', 'VÉTÉRANS'];

  const fetchRadarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('match_requests')
        .select(`*, profiles:coach_id (first_name, last_name, clubs:club_id (name, logo_url))`)
        .neq('status', 'EXPIRED')
        .order('date', { ascending: true }) // Tri par date d'événement (ordre chronologique)
        .order('time', { ascending: true }); // Puis par heure

      if (error) throw error;

      // SÉCURITÉ ANTI-DOUBLONS VISUELS (V1.0.299)
      const uniqueData = (data || []).filter((v, i, a) =>
        a.findIndex(t => t.id === v.id) === i
      );

      const formatted: MatchRequest[] = uniqueData.map((item: any) => ({
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
        x: 50 + (Math.cos(item.id.charCodeAt(0)) * (15 + (item.id.charCodeAt(1) % 30))),
        y: 50 + (Math.sin(item.id.charCodeAt(2)) * (15 + (item.id.charCodeAt(3) % 30))),
      }));

      setRequests(formatted);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchRadarData(); }, [fetchRadarData]);

  // FILTRAGE
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchCat = filterCategory === 'TOUS' || req.category === filterCategory;
      return matchCat; // La distance est simulée pour l'Alpha
    });
  }, [requests, filterCategory]);

  // BUG FIX: On retire l'utilisateur du radar sonar pour ne pas apparaître 2 fois
  const sonarSignals = useMemo(() => {
    return filteredRequests.filter(req => req.coachId !== currentUserId);
  }, [filteredRequests, currentUserId]);

  const styles = isPro ? { accent: 'text-orange-600', btnPrimary: 'bg-orange-600 text-white shadow-lg', tabActive: 'bg-orange-600 text-white', tabInactive: 'bg-gray-100 text-gray-500' } : { accent: 'text-neon-cyan', btnPrimary: 'bg-neon-cyan text-black shadow-lg', tabActive: 'bg-neon-cyan text-black', tabInactive: 'bg-white/5 text-gray-500' };

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

  return (
    <main className={`min-h-screen pb-32 max-w-md mx-auto p-4 space-y-6 ${isPro ? 'bg-gray-50' : 'bg-black'}`}>
      <div className="flex justify-between items-center gap-4">
        <div className={`flex-1 p-1 rounded-2xl flex border ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/5'}`}>
          <button onClick={() => setViewMode('sonar')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${viewMode === 'sonar' ? styles.tabActive : styles.tabInactive}`}>
            <RadarIcon size={16} /> <span className="text-[10px] font-black uppercase italic">Radar</span>
          </button>
          <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? styles.tabActive : styles.tabInactive}`}>
            <List size={16} /> <span className="text-[10px] font-black uppercase italic">Annonces</span>
          </button>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-2xl border ${showFilters ? styles.btnPrimary : (isPro ? 'bg-white' : 'bg-white/5')} transition-all`}>
           <Filter size={20} />
        </button>
        <button onClick={() => router.push('/radar/new')} className={`p-4 rounded-2xl transition-all active:scale-90 ${styles.btnPrimary}`}>
          <Plus size={24} strokeWidth={4} />
        </button>
      </div>

      {showFilters && (
        <section className={`p-6 rounded-3xl border ${isPro ? 'bg-white' : 'bg-white/5'} animate-in fade-in zoom-in duration-300 space-y-6`}>
           <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Filtrer par catégorie</h3>
              <div className="flex flex-wrap gap-2">
                 {categories.map(cat => (
                   <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black border transition-all ${filterCategory === cat ? styles.btnPrimary : 'border-white/10 text-gray-500'}`}>{cat}</button>
                 ))}
              </div>
           </div>
           <div className="space-y-3 text-left">
              <div className="flex justify-between items-center">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Distance Maximale</h3>
                 <span className={`text-[10px] font-bold ${styles.accent}`}>{filterDistance} KM</span>
              </div>
              <input type="range" min="5" max="200" step="5" value={filterDistance} onChange={(e) => setFilterDistance(parseInt(e.target.value))} className="w-full accent-orange-600" />
           </div>
        </section>
      )}

      {viewMode === 'sonar' ? (
        <section className={`rounded-[2.5rem] border-2 p-8 relative overflow-hidden transition-all duration-700 ${isPro ? 'bg-white border-gray-200 shadow-xl' : 'bg-[#050505] border-white/5 shadow-2xl'}`}>
           {isLoading ? <Loader2 size={40} className={`animate-spin m-auto ${styles.accent}`} /> : <RadarSonar signals={sonarSignals} onSignalClick={() => setViewMode('list')} isScanning={isScanning} theme={theme} />}
        </section>
      ) : (
        <div className="space-y-6">
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
           {filteredRequests.length === 0 && <div className="py-20 text-center opacity-30 italic uppercase text-[10px]">Aucun signal détecté</div>}
        </div>
      )}

      {selectedChatRequest && <NegotiationChat isOpen={!!selectedChatRequest} onClose={() => setSelectedChatRequest(null)} matchRequestId={selectedChatRequest.id} currentUserId={currentUserId} otherCoachName={selectedChatRequest.coachName} theme={theme as any} />}
    </main>
  );
}
