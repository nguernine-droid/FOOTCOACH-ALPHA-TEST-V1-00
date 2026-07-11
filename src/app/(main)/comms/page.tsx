'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Search, ChevronRight, Bell, Trophy, Calendar, Megaphone, Plus, Users, Loader2, User as UserIcon, X, MapPin, Clock, Landmark, Activity, Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { NegotiationChat } from '@/components/NegotiationChat';

type TabType = 'announcements' | 'network';

export default function MessagesPage() {
  const router = useRouter();
  const { theme, isLoading: isContextLoading } = useTeam();
  const isPro = theme === 'classic';

  const [activeTab, setActiveTab] = useState<TabType>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [networkContacts, setNetworkContacts] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  const fetchCommsData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsDataLoading(false); return; }
      setCurrentUserId(user.id);

      // 1. Fetch Annonces Radar (Dynamiques)
      const { data: ads } = await supabase.from('match_requests').select(`*, profiles:coach_id (nickname, first_name, clubs:club_id(name, logo_url, stadium))`).order('created_at', { ascending: false });

      // 2. Fetch Messages Système (Agenda, etc.)
      const localMessages = JSON.parse(localStorage.getItem('team_messages') || '[]');

      const dbAnnouncements = (ads || []).map(ad => ({
        id: ad.id,
        type: 'match-request',
        title: `${ad.type} : ${ad.profiles?.clubs?.name || 'Nexus'}`,
        lastMessage: `Match le ${new Date(ad.date).toLocaleDateString()} à ${ad.time}`,
        date: new Date(ad.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        fullData: { ...ad, stadium: ad.profiles?.clubs?.stadium },
        isSystem: false
      }));

      setAnnouncements([...dbAnnouncements, ...localMessages]);

      // 3. Fetch Contacts — fusion MATCHED + connexions directes
      const { data: matchedData } = await supabase
        .from('match_requests')
        .select(`
          id, coach_id, respondent_id, type, date, category,
          profiles!match_requests_coach_id_fkey (
            id, first_name, last_name, nickname, avatar_url,
            clubs:club_id (name, city, logo_url)
          ),
          respondent:profiles!match_requests_respondent_id_fkey (
            id, first_name, last_name, nickname, avatar_url,
            clubs:club_id (name, city, logo_url)
          )
        `)
        .eq('status', 'MATCHED')
        .or(`coach_id.eq.${user.id},respondent_id.eq.${user.id}`)
        .order('date', { ascending: false });

      // Map unifiée : clé = otherId
      const contactMap = new Map<string, any>();

      // Source A : matchs MATCHED
      if (matchedData) {
        matchedData.forEach((m: any) => {
          const isOwner = m.coach_id === user.id;
          const other   = isOwner ? m.respondent : m.profiles;
          const otherId = other?.id;
          if (!otherId) return;
          const existing = contactMap.get(otherId);
          contactMap.set(otherId, {
            id:           m.id,
            otherCoachId: otherId,
            name:         other?.nickname || `${other?.first_name || ''} ${other?.last_name || ''}`.trim() || 'Coach Inconnu',
            club:         (other as any)?.clubs?.name || 'Club inconnu',
            city:         (other as any)?.clubs?.city || '',
            clubLogo:     (other as any)?.clubs?.logo_url || null,
            avatar:       other?.avatar_url,
            matchType:    m.type,
            category:     m.category,
            lastDate:     m.date,
            matchCount:   existing ? existing.matchCount + 1 : 1,
            source:       'radar',
            connectionType: 'connection',
          });
        });
      }

      // Source B : connexions directes (échange de cartes / suivi)
      const { data: connections } = await supabase
        .from('coach_connections')
        .select(`
          id, type, source, created_at,
          coach_a:coach_a_id(id, nickname, first_name, last_name, avatar_url, coach_status, clubs:club_id(name, city, logo_url)),
          coach_b:coach_b_id(id, nickname, first_name, last_name, avatar_url, coach_status, clubs:club_id(name, city, logo_url))
        `)
        .or(`coach_a_id.eq.${user.id},coach_b_id.eq.${user.id}`);

      if (connections) {
        connections.forEach((c: any) => {
          const isA   = c.coach_a?.id === user.id;
          const other = isA ? c.coach_b : c.coach_a;
          const otherId = other?.id;
          if (!otherId || contactMap.has(otherId)) return; // priorité aux matchs
          contactMap.set(otherId, {
            id:             c.id,
            otherCoachId:   otherId,
            name:           other?.nickname || `${other?.first_name || ''} ${other?.last_name || ''}`.trim() || 'Coach Inconnu',
            club:           other?.clubs?.name || 'Club inconnu',
            city:           other?.clubs?.city || '',
            clubLogo:       other?.clubs?.logo_url || null,
            avatar:         other?.avatar_url,
            coachStatus:    other?.coach_status,
            lastDate:       c.created_at?.split('T')[0],
            matchCount:     0,
            source:         c.source,
            connectionType: c.type,
          });
        });
      }

      setNetworkContacts(Array.from(contactMap.values()));
    } catch (err) { console.error(err); } finally { setIsDataLoading(false); }
  }, []);

  useEffect(() => { fetchCommsData(); }, [fetchCommsData]);

  const styles = isPro ? { mainBg: 'bg-gray-50', headerBg: 'bg-white border-b border-gray-200', tabActive: 'bg-orange-600 text-white shadow-lg', tabInactive: 'bg-gray-100 text-gray-500', cardBg: 'bg-white border-gray-100', textMain: 'text-gray-900', textSub: 'text-gray-500', accent: 'text-orange-600' } : { mainBg: 'bg-[#15171C]', headerBg: 'bg-[#15171C]/80 border-b border-white/10', tabActive: 'bg-neon-cyan text-black shadow-lg shadow-neon-cyan/20', tabInactive: 'bg-white/5 text-gray-500', cardBg: 'bg-white/5 border-white/5', textMain: 'text-white', textSub: 'text-gray-400', accent: 'text-neon-cyan' };

  if (isContextLoading) return null;

  return (
    <main className={`min-h-screen pb-32 max-w-md mx-auto transition-colors duration-500 ${styles.mainBg}`}>
      <header className={`backdrop-blur-md py-5 px-6 sticky top-0 z-40 flex flex-col gap-4 shadow-sm ${styles.headerBg}`}>
        <div className="flex justify-between items-center text-left">
          <h1 className={`text-2xl font-black uppercase italic tracking-tighter leading-none ${styles.textMain}`}>
            {isPro ? 'Communications' : 'Briefing'}
          </h1>
          <div className="flex items-center gap-3">
            <div className={`${isPro ? 'bg-gray-100 text-gray-400' : 'bg-white/5 text-gray-600'} p-2.5 rounded-xl`}><Search size={18} /></div>
            {activeTab === 'announcements' && (
              <Link href="/radar/new" className={`${isPro ? 'bg-orange-600 text-white' : 'bg-neon-green text-black'} p-2.5 rounded-xl shadow-lg active:scale-90 transition-all`}>
                <Plus size={20} strokeWidth={3} />
              </Link>
            )}
          </div>
        </div>
        <div className={`p-1 rounded-2xl flex border ${isPro ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/5'}`}>
          <button onClick={() => setActiveTab('announcements')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase italic ${activeTab === 'announcements' ? styles.tabActive : styles.tabInactive}`}>
            <Megaphone size={14} /> {isPro ? 'Annonces' : 'Flash Info'}
          </button>
          <button onClick={() => setActiveTab('network')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase italic relative ${activeTab === 'network' ? styles.tabActive : styles.tabInactive}`}>
            <Users size={14} /> {isPro ? 'Mon Réseau' : 'Network'}
            {networkContacts.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center
                ${isPro ? 'bg-orange-600 text-white' : 'bg-neon-cyan text-black'}`}>
                {networkContacts.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="p-5 space-y-4">
        {isDataLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40"><Loader2 size={32} className={`animate-spin mb-4 ${styles.accent}`} /><p className={`text-[10px] font-black uppercase tracking-widest ${styles.textSub}`}>Sync Briefing...</p></div>
        ) : activeTab === 'announcements' ? (
          announcements.map(conv => (
            <div key={conv.id} onClick={() => setSelectedAnnouncement(conv)} className={`${styles.cardBg} rounded-[2rem] p-5 border flex items-center gap-4 shadow-sm active:scale-95 transition-all cursor-pointer`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPro ? 'bg-orange-100 text-orange-600' : 'bg-white/10 text-neon-cyan'}`}>{conv.type === 'match-request' ? <Trophy size={20}/> : conv.type === 'convocation' ? <Zap size={20}/> : <Bell size={20} />}</div>
              <div className="flex-1 text-left min-w-0"><p className={`text-xs font-black uppercase italic ${styles.textMain}`}>{conv.title}</p><p className={`text-[10px] truncate ${styles.textSub}`}>{conv.lastMessage}</p></div>
              <ChevronRight size={16} className={styles.textSub} />
            </div>
          ))
        ) : networkContacts.length === 0 ? (
          <div className={`py-20 text-center rounded-[2.5rem] border-2 border-dashed ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
            <Users size={32} className="mx-auto mb-3 text-gray-400" />
            <p className={`text-[11px] font-black uppercase tracking-widest ${styles.textSub}`}>
              {isPro ? 'Aucun contact pour l\'instant' : 'Réseau vide — lancez des défis !'}
            </p>
            <p className={`text-[10px] font-bold mt-2 ${styles.textSub} opacity-60`}>
              Vos contacts apparaissent après un match validé via le Radar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compteur */}
            <p className={`text-[10px] font-black uppercase tracking-widest px-1 ${styles.textSub}`}>
              {networkContacts.length} coach{networkContacts.length > 1 ? 's' : ''} rencontré{networkContacts.length > 1 ? 's' : ''}
            </p>

            {networkContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedChat(contact)}
                className={`${styles.cardBg} rounded-[2rem] p-5 border flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer shadow-sm`}
              >
                {/* Avatar / Logo club */}
                <div className="relative shrink-0">
                  <div className={`w-14 h-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${isPro ? 'bg-gray-100 border-gray-200' : 'bg-white/10 border-white/10'}`}>
                    {contact.avatar
                      ? <img src={contact.avatar} className="w-full h-full object-cover" />
                      : <UserIcon size={24} className="text-gray-400" />
                    }
                  </div>
                  {contact.clubLogo && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white bg-white overflow-hidden shadow-sm">
                      <img src={contact.clubLogo} className="w-full h-full object-contain p-0.5" />
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0 text-left">
                  <h3 className={`font-black text-sm uppercase italic tracking-tight ${styles.textMain}`}>{contact.name}</h3>
                  <p className={`text-[10px] font-bold uppercase ${styles.textSub}`}>
                    {contact.club}{contact.city ? ` — ${contact.city}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {/* Badge source */}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      contact.connectionType === 'connection'
                        ? isPro ? 'bg-orange-50 text-orange-600' : 'bg-orange-500/10 text-orange-400'
                        : isPro ? 'bg-blue-50 text-blue-500' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {contact.connectionType === 'connection' ? '🎴 Carte échangée' : '👥 Suivi'}
                    </span>
                    {/* Nb matchs */}
                    {contact.matchCount > 0 && (
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isPro ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-gray-500'}`}>
                        {contact.matchCount} match{contact.matchCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {/* Statut disponibilité */}
                    {contact.coachStatus === 'toujours_pret' && (
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                        🟢 Toujours prêt
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DÉTAILS DYNAMIQUE */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAnnouncement(null)} />
           <div className={`relative w-full max-w-sm ${isPro ? 'bg-white' : 'bg-[#1D2027] border border-white/10'} rounded-[2.5rem] p-8 shadow-2xl`}>
              <button onClick={() => setSelectedAnnouncement(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-gray-500"><X size={20} /></button>
              <div className="text-left space-y-6 mt-4">
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isPro ? 'bg-orange-100 text-orange-600' : 'bg-neon-cyan/20 text-neon-cyan'} mb-4`}>{selectedAnnouncement.type === 'match-request' ? <Trophy size={32} /> : <Activity size={32} />}</div>
                 <div><h2 className={`text-2xl font-black uppercase italic tracking-tighter ${styles.textMain}`}>{selectedAnnouncement.title}</h2><p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${styles.accent}`}>Détails de la mission</p></div>
                 {selectedAnnouncement.fullData ? (
                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3"><Calendar size={18} className={styles.accent} /><p className={`text-xs font-bold ${styles.textMain}`}>{new Date(selectedAnnouncement.fullData.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
                      <div className="flex items-center gap-3"><Clock size={18} className={styles.accent} /><p className={`text-xs font-bold ${styles.textMain}`}>{selectedAnnouncement.fullData.time}</p></div>
                      <div className="flex items-center gap-3"><MapPin size={18} className={styles.accent} /><p className={`text-xs font-bold ${styles.textMain}`}>{selectedAnnouncement.fullData.location}</p></div>
                      {selectedAnnouncement.fullData.stadium && (<div className="flex items-center gap-3"><Landmark size={18} className={styles.accent} /><p className={`text-[11px] font-black uppercase italic ${styles.textMain}`}>{selectedAnnouncement.fullData.stadium}</p></div>)}
                      <button onClick={() => { setSelectedAnnouncement(null); router.push('/radar'); }} className={`w-full py-4 mt-4 rounded-xl font-black uppercase italic text-xs ${styles.tabActive}`}>Voir sur le Radar</button>
                   </div>
                 ) : (<p className={`text-xs ${styles.textSub}`}>{selectedAnnouncement.lastMessage}</p>)}
              </div>
           </div>
        </div>
      )}

      {selectedChat && currentUserId && (<NegotiationChat isOpen={!!selectedChat} onClose={() => setSelectedChat(null)} matchRequestId={selectedChat.id} currentUserId={currentUserId} otherCoachName={selectedChat.name} theme={theme as any} />)}
    </main>
  );
}
