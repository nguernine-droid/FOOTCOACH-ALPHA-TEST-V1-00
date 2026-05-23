'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, Activity, Plus, Loader2, List, Radar as RadarIcon, History } from 'lucide-react';
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

  const fetchRadarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('match_requests')
        .select(`
          *,
          profiles:coach_id (
            first_name,
            last_name,
            clubs:club_id (name)
          ),
          respondent:respondent_id (first_name, last_name)
        `)
        .neq('status', 'EXPIRED')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: MatchRequest[] = (data || []).map((item: any) => ({
        id: item.id,
        coachId: item.coach_id,
        coachClub: item.profiles?.clubs?.name || 'Club Inconnu',
        coachName: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : 'Coach Inconnu',
        type: item.type,
        category: item.category,
        status: item.status,
        date: item.date,
        time: item.time,
        location: item.location,
        comment: item.comment,
        respondentId: item.respondent_id,
        respondentName: item.respondent ? `${item.respondent.first_name} ${item.respondent.last_name}` : undefined,
        x: 20 + (Math.abs(item.id.charCodeAt(0)) % 60),
        y: 20 + (Math.abs(item.id.charCodeAt(1)) % 60),
      }));

      setRequests(formatted);
    } catch (err) {
      console.error("Erreur Radar:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRadarData();
  }, [fetchRadarData]);

  const handleInterest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({
          status: 'PENDING',
          respondent_id: currentUserId
        })
        .eq('id', requestId);

      if (error) throw error;
      fetchRadarData();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleAccept = async (request: MatchRequest) => {
    try {
      const { error: updateErr } = await supabase
        .from('match_requests')
        .update({ status: 'MATCHED' })
        .eq('id', request.id);

      if (updateErr) throw updateErr;

      const { error: eventErr } = await supabase
        .from('events')
        .insert([{
          match_request_id: request.id,
          title: `Match vs ${request.respondentName || 'Adversaire'}`,
          type: 'Match',
          date: request.date,
          time: request.time,
          location: request.location,
          home_club_id: teamInfo?.id,
          away_club_id: request.respondentId
        }]);

      if (eventErr) throw eventErr;
      fetchRadarData();
    } catch (err: any) {
      alert("Erreur validation : " + err.message);
    }
  };

  const handleRefuse = async (requestId: string) => {
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'OPEN', respondent_id: null })
      .eq('id', requestId);

    if (!error) fetchRadarData();
  };

  const styles = isPro ? {
    accent: 'text-blue-600',
    btnPrimary: 'bg-blue-600 text-white shadow-lg',
    cardBg: 'bg-white border-gray-200',
    tabActive: 'bg-blue-600 text-white',
    tabInactive: 'bg-gray-100 text-gray-500',
    textSub: 'text-gray-500'
  } : {
    accent: 'text-neon-cyan',
    btnPrimary: 'bg-neon-cyan text-black shadow-[0_0_20px_#00F0FF33]',
    cardBg: 'bg-white/5 border-white/10',
    tabActive: 'bg-neon-cyan text-black',
    tabInactive: 'bg-white/5 text-gray-500',
    textSub: 'text-gray-400'
  };

  return (
    <main className={`min-h-screen pb-32 max-w-md mx-auto p-4 space-y-6 ${isPro ? 'bg-gray-50' : 'bg-black'}`}>

      <div className="flex justify-between items-center gap-4">
        <div className={`flex-1 p-1 rounded-2xl flex border ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/5'}`}>
          <button
            onClick={() => setViewMode('sonar')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${viewMode === 'sonar' ? styles.tabActive : styles.tabInactive}`}
          >
            <RadarIcon size={16} /> <span className="text-[10px] font-black uppercase italic">Radar</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? styles.tabActive : styles.tabInactive}`}
          >
            <List size={16} /> <span className="text-[10px] font-black uppercase italic">Annonces</span>
          </button>
        </div>
        <button
          onClick={() => router.push('/radar/new')}
          className={`p-4 rounded-2xl transition-all active:scale-90 ${styles.btnPrimary}`}
        >
          <Plus size={24} strokeWidth={4} />
        </button>
      </div>

      {viewMode === 'sonar' ? (
        <section className={`rounded-[2.5rem] border-2 p-8 relative overflow-hidden transition-all duration-700 ${isPro ? 'bg-white border-gray-200 shadow-xl' : 'bg-[#050505] border-white/5 shadow-2xl'}`}>
           <div className="flex justify-between items-center mb-10 relative z-20">
              <h2 className={`text-xs font-black uppercase tracking-widest ${styles.accent}`}>Signaux Secteur</h2>
              <button onClick={() => setIsScanning(!isScanning)} className={`p-2 rounded-xl border ${isScanning ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'}`}>
                <Wifi size={16} className={isScanning ? 'animate-pulse' : ''} />
              </button>
           </div>

           {isLoading ? (
             <div className="aspect-square flex flex-col items-center justify-center space-y-4">
               <Loader2 size={40} className={`animate-spin ${styles.accent}`} />
               <p className="text-[10px] font-black uppercase opacity-40 italic">Sync Radar...</p>
             </div>
           ) : (
             <RadarSonar
               signals={requests}
               onSignalClick={() => setViewMode('list')}
               isScanning={isScanning}
               theme={theme}
             />
           )}
        </section>
      ) : (
        <div className="space-y-6">
           {requests.map(req => (
             <MatchRequestCard
               key={req.id} request={req} isPro={isPro} currentCoachId={currentUserId}
               onInterested={handleInterest} onAccept={() => handleAccept(req)} onRefuse={handleRefuse}
               onChat={(r) => setSelectedChatRequest(r)}
             />
           ))}
           {requests.length === 0 && (
              <div className="py-20 text-center opacity-30 italic uppercase text-[10px]">Aucun signal détecté</div>
           )}
        </div>
      )}

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
