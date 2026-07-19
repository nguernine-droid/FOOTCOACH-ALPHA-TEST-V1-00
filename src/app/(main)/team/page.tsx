'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  TrendingUp,
  Plus,
  Shield,
  ArrowUpDown,
  X,
  LayoutGrid,
  List,
  Send,
  MapPin,
  Clock,
  Users,
  MessageCircle,
  UserCheck,
  UsersRound,
  Megaphone,
  ListChecks,
  CheckCircle,
  BarChart3,
  Heart,
  CalendarCheck,
  History,
  ChevronRight,
  UserPlus,
  Activity,
  Terminal,
  Cpu,
  Database,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerRow } from '@/components/PlayerRow';
import { FullPlayerCard } from '@/components/FullPlayerCard';
import { ActionModal } from '@/components/ui/ActionModal';
import { ResultsModal } from '@/components/ResultsModal';
import { GlitchText } from '@/components/ui/cyber/GlitchText';
import { NeonButton } from '@/components/ui/cyber/NeonButton';
import { TypeWriterText } from '@/components/ui/cyber/TypeWriterText';

type TeamTab = 'effectif' | 'presences' | 'resultats';

export default function TeamPage() {
  const router = useRouter();
  const { teamInfo, isPro } = useTeam();
  const [playersData, setPlayersData] = useState<any[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<TeamTab>('effectif');

  // Action States
  const [actionMode, setActionMode] = useState<'convocation' | 'message' | 'annonce' | 'selection' | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<'convocation' | 'message' | 'annonce'>('message');
  const [isSent, setIsSent] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Initialisation & Persistence (les joueurs restent stockés en local pour l'alpha)
  useEffect(() => {
    const storedPlayers = localStorage.getItem('team_players');
    if (storedPlayers) {
      try { setPlayersData(JSON.parse(storedPlayers)); } catch { /* données corrompues : on repart de zéro */ }
    }
    setIsHydrated(true);
  }, []);

  const savePlayers = (newData: any[]) => {
    setPlayersData(newData);
    localStorage.setItem('team_players', JSON.stringify(newData));
  };

  const filters = ['Tous', 'Attaquant', 'Milieu', 'Défenseur', 'Gardien'];

  const displayedPlayers = useMemo(() => {
    return [...playersData]
      .filter(p => activeFilter === 'Tous' || p.category === activeFilter)
      .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : a.name.localeCompare(b.name));
  }, [playersData, activeFilter, sortBy]);

  const togglePlayerSelection = (id: number) => {
    setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleUpdatePlayer = (updatedData: any) => {
    const newData = playersData.map(p => p.id === updatedData.id ? updatedData : p);
    savePlayers(newData);
    setSelectedPlayer(updatedData);
  };

  const startAction = (mode: 'convocation' | 'message' | 'annonce' | 'selection') => {
    if (actionMode === mode) { setActionMode(null); setSelectedPlayerIds([]); }
    else { setActionMode(mode); setSelectedPlayerIds([]); }
  };

  const openActionModal = (type: 'convocation' | 'message' | 'annonce', specificPlayerId?: number) => {
    setCurrentActionType(type);
    if(specificPlayerId) setSelectedPlayerIds([specificPlayerId]);
    setIsActionModalOpen(true);
  };

  const handleSendAction = (actionData: any) => {
    setIsActionModalOpen(false);
    setIsSent(true);
    setTimeout(() => { setActionMode(null); setSelectedPlayerIds([]); setIsSent(false); }, 3000);
  };

  if (!isHydrated) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-3 font-sans ${isPro ? 'bg-gray-50' : 'bg-[#15171C]'}`}>
        <span className="text-sm font-bold text-gray-400">Chargement de l'effectif...</span>
        <TypeWriterText text="SYNCHRONISATION..." className="text-neon-orange/60 text-[10px] tracking-[0.4em] font-mono" />
      </div>
    );
  }

  return (
    <main className={`min-h-screen pb-32 max-w-md lg:max-w-2xl mx-auto relative font-sans overflow-x-hidden transition-colors duration-500 ${isPro ? 'bg-gray-50' : 'bg-[#15171C]'}`}>
      {/* HEADER */}
      <header className={`backdrop-blur-xl py-6 px-6 sticky top-0 z-40 border-b flex flex-col gap-5 shadow-sm ${isPro ? 'bg-white/90 border-gray-200' : 'bg-[#15171C]/80 border-neon-cyan/20'}`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <GlitchText
              text={teamInfo?.clubName?.toUpperCase() || 'MON ÉQUIPE'}
              className={`text-xl font-black italic tracking-tighter leading-none ${isPro ? 'text-orange-600' : 'text-neon-cyan'}`}
            />
            <div className="flex items-center gap-2 mt-1 font-mono">
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isPro ? 'text-orange-600/80 bg-orange-50 border-orange-200' : 'text-neon-cyan/60 bg-neon-cyan/5 border-neon-cyan/20'}`}>{teamInfo?.category} · {teamInfo?.level}</span>
            </div>
          </div>
          <div className={`flex gap-1 p-1 rounded-xl border shadow-inner ${isPro ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/10'}`}>
             <TabButton active={activeTab === 'effectif'} onClick={() => setActiveTab('effectif')} icon={<Cpu size={16} />} label="Effectif" isPro={isPro} />
             <TabButton active={activeTab === 'presences'} onClick={() => setActiveTab('presences')} icon={<Activity size={16} />} label="Présences" isPro={isPro} />
             <TabButton active={activeTab === 'resultats'} onClick={() => setActiveTab('resultats')} icon={<Database size={16} />} label="Résultats" isPro={isPro} />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8 relative z-10">

        {/* ANALYTICS TERMINAL */}
        <section className="grid grid-cols-3 gap-3">
           <StatusCard icon={<Users size={14} className={isPro ? 'text-orange-600' : 'text-neon-orange'} />} label="Joueurs" value={playersData.length} color={isPro ? 'bg-white border-gray-200 shadow-sm' : 'bg-neon-orange/5 border-neon-orange/20'} textColor={isPro ? 'text-orange-600' : 'text-neon-orange'} isPro={isPro} />
           <StatusCard icon={<Terminal size={14} className={isPro ? 'text-emerald-600' : 'text-neon-green'} />} label="Actifs" value={playersData.filter(p => p.status === 'Actif').length} color={isPro ? 'bg-white border-gray-200 shadow-sm' : 'bg-neon-green/5 border-neon-green/20'} textColor={isPro ? 'text-emerald-600' : 'text-neon-green'} isPro={isPro} />
           <StatusCard icon={<AlertCircle size={14} className={isPro ? 'text-rose-500' : 'text-neon-magenta'} />} label="Blessés" value={playersData.filter(p => p.status === 'Blessé').length} color={isPro ? 'bg-white border-gray-200 shadow-sm' : 'bg-neon-magenta/5 border-neon-magenta/20'} textColor={isPro ? 'text-rose-500' : 'text-neon-magenta'} isPro={isPro} />
        </section>

        {activeTab === 'effectif' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Mission Controls */}
            <div className="grid grid-cols-5 gap-2">
              <ActionButton onClick={() => startAction('convocation')} icon={<Send size={16} />} label="Convoquer" color={isPro ? 'bg-orange-600 text-white' : 'bg-neon-orange'} active={actionMode === 'convocation'} />
              <ActionButton onClick={() => startAction('message')} icon={<MessageCircle size={16} />} label="Message" color={isPro ? 'bg-white border-gray-200 !text-gray-600 shadow-sm' : 'bg-white/10'} active={actionMode === 'message'} />
              <ActionButton onClick={() => startAction('annonce')} icon={<Megaphone size={16} />} label="Annonce" color={isPro ? 'bg-white border-gray-200 !text-gray-600 shadow-sm' : 'bg-white/10'} active={actionMode === 'annonce'} />
              <ActionButton onClick={() => setShowResultsModal(true)} icon={<BarChart3 size={16} />} label="Stats" color={isPro ? 'bg-white border-gray-200 !text-gray-600 shadow-sm' : 'bg-white/10'} active={showResultsModal} />
              <ActionButton onClick={() => startAction('selection')} icon={<ListChecks size={16} />} label="Sélection" color={isPro ? 'bg-orange-50 border-orange-200 !text-orange-600' : 'bg-neon-cyan/20'} active={actionMode === 'selection'} isLight={!isPro} />
            </div>

            {/* List Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-gray-500">
                   <Cpu size={12} />
                   <h3 className="text-[9px] font-black uppercase tracking-[0.3em] font-mono italic">Mon groupe</h3>
                </div>
                <div className="flex items-center gap-2">
                   <button aria-label="Trier" onClick={() => setSortBy(sortBy === 'rating' ? 'name' : 'rating')} className={`p-2.5 rounded-xl border transition-all ${isPro ? 'bg-white text-orange-600 border-gray-200 hover:border-orange-300' : 'bg-white/5 text-neon-cyan border-white/10 hover:border-neon-cyan/50'}`}><ArrowUpDown size={16} /></button>
                   <div className={`rounded-xl p-1 flex gap-1 border ${isPro ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                     <button aria-label="Vue grille" onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? (isPro ? 'bg-orange-600 text-white shadow-sm' : 'bg-neon-cyan text-black shadow-sm') : 'text-gray-500'}`}><LayoutGrid size={14} /></button>
                     <button aria-label="Vue liste" onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? (isPro ? 'bg-orange-600 text-white shadow-sm' : 'bg-neon-cyan text-black shadow-sm') : 'text-gray-500'}`}><List size={14} /></button>
                   </div>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                {filters.map((filter) => (
                  <button key={filter} onClick={() => setActiveFilter(filter)} className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border-2 font-mono ${activeFilter === filter
                    ? (isPro ? 'border-orange-600 bg-orange-50 text-orange-600 shadow-sm' : 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-sm')
                    : (isPro ? 'border-gray-200 bg-white text-gray-500' : 'border-white/5 bg-[#1D2027] text-gray-600')}`}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Units Display */}
            {playersData.length > 0 ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "card-cyber border-white/5 p-2 space-y-2"}>
                {displayedPlayers.map((player) => (
                  viewMode === 'grid' ? (
                    <PlayerCard key={player.id} player={player} onClick={setSelectedPlayer} isSelectionMode={actionMode !== null} isSelected={selectedPlayerIds.includes(player.id)} onToggleSelect={togglePlayerSelection} />
                  ) : (
                    <PlayerRow key={player.id} player={player} onClick={setSelectedPlayer} isSelectionMode={actionMode !== null} isSelected={selectedPlayerIds.includes(player.id)} onToggleSelect={togglePlayerSelection} />
                  )
                ))}
              </div>
            ) : (
              <div className={`text-center py-20 rounded-[2rem] border-2 border-dashed space-y-6 ${isPro ? 'bg-white border-gray-200' : 'card-cyber border-white/10'}`}>
                 <div className={`w-20 h-20 rounded-[2rem] border-2 border-dashed flex items-center justify-center mx-auto animate-pulse ${isPro ? 'bg-orange-50 border-orange-200' : 'bg-neon-cyan/5 border-neon-cyan/20'}`}>
                    <UserPlus size={32} className={isPro ? 'text-orange-400' : 'text-neon-cyan/30'} />
                 </div>
                 <div className="space-y-2 px-10">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic font-mono">Effectif vide</p>
                   <p className={`text-[9px] font-bold uppercase tracking-widest leading-relaxed ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>Ajoutez vos joueurs pour préparer les convocations et suivre les présences.</p>
                 </div>
                 {isPro ? (
                   <button onClick={() => router.push('/team/new')} className="px-8 py-4 rounded-2xl bg-orange-600 text-white text-[11px] font-black uppercase italic active:scale-95 transition-all shadow-lg">
                     + Ajouter mon premier joueur
                   </button>
                 ) : (
                   <NeonButton variant="cyan" size="lg" onClick={() => router.push('/team/new')}>
                      Ajouter mon premier joueur
                   </NeonButton>
                 )}
              </div>
            )}

            {playersData.length > 0 && (
              <button onClick={() => router.push('/team/new')} className={`w-full font-black text-[11px] py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-sm border-2 active:scale-98 transition-all uppercase italic tracking-[0.2em] font-mono
                ${isPro ? 'bg-white text-orange-600 border-orange-200 hover:border-orange-400' : 'bg-[#1D2027] text-neon-cyan border-neon-cyan/20 hover:border-neon-cyan/50'}`}>
                <Plus size={20} strokeWidth={4} /> Ajouter un joueur
              </button>
            )}
          </div>
        )}

        {activeTab === 'presences' && <AttendanceView players={playersData} isPro={isPro} />}
        {activeTab === 'resultats' && <ResultsHistoryView isPro={isPro} />}

      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedPlayer(null)}>
           <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
              <FullPlayerCard
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                onUpdate={handleUpdatePlayer}
                onMessage={(id) => console.log('Message to player:', id)}
              />
           </div>
        </div>
      )}
    </main>
  );
}

function TabButton({ active, onClick, icon, label, isPro }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all ${active
      ? (isPro ? 'bg-white text-orange-600 shadow-sm' : 'bg-neon-cyan/10 text-neon-cyan')
      : (isPro ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-400')}`}>
      <div>{icon}</div>
      <span className="text-[7px] font-black uppercase tracking-[0.2em] font-mono">{label}</span>
    </button>
  );
}

function StatusCard({ icon, label, value, color, textColor, isPro }: any) {
  return (
    <div className={`p-5 rounded-[2rem] border ${color} flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group ${isPro ? '' : 'shadow-2xl'}`}>
      <div className={`p-2 rounded-xl mb-1 border group-hover:scale-110 transition-transform ${isPro ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>{icon}</div>
      <span className={`text-xl font-black ${textColor} font-mono tracking-tighter`}>{value}</span>
      <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.3em] font-mono">{label}</span>
    </div>
  );
}

type PresenceStatus = 'present' | 'absent' | 'attente';

function AttendanceView({ players, isPro }: { players: any[]; isPro: boolean }) {
  const [presences, setPresences] = useState<Record<string, PresenceStatus>>({});
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('team_attendance');
    if (stored) {
      try { setPresences(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const setStatus = (id: string | number, status: PresenceStatus) => {
    setPresences(prev => ({ ...prev, [id]: status }));
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('team_attendance', JSON.stringify(presences));
    setIsSaved(true);
  };

  if (players.length === 0) {
    return (
      <div className={`text-center py-24 px-10 rounded-[2rem] border ${isPro ? 'bg-white border-gray-200' : 'card-cyber border-white/5'}`}>
         <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] font-mono italic leading-relaxed">Ajoutez des joueurs pour faire l'appel</p>
      </div>
    );
  }

  const presentCount = players.filter(p => presences[p.id] === 'present').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`p-8 rounded-[2rem] border ${isPro ? 'bg-white border-gray-200 shadow-sm' : 'card-cyber border-neon-cyan/20'}`}>
        <div className={`flex items-center justify-between mb-8 border-b pb-4 ${isPro ? 'border-gray-100' : 'border-white/5'}`}>
           <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isPro ? 'bg-orange-600' : 'bg-neon-cyan'}`} />
              <h3 className={`text-sm font-black uppercase italic tracking-tighter ${isPro ? 'text-gray-900' : 'text-white'}`}>Feuille de présence</h3>
           </div>
           <span className={`text-[9px] font-black font-mono tracking-widest ${isPro ? 'text-orange-600' : 'text-neon-cyan/60'}`}>{presentCount}/{players.length} présents</span>
        </div>
        <div className="space-y-5">
          {players.map(p => {
            const status = presences[p.id];
            return (
              <div key={p.id} className={`flex items-center justify-between py-3 border-b last:border-0 group ${isPro ? 'border-gray-100' : 'border-white/5'}`}>
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black uppercase ${isPro ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-white/10 bg-neon-cyan/10 text-neon-cyan'}`}>
                      {(p.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <span className={`text-xs font-black uppercase italic tracking-tight ${isPro ? 'text-gray-900' : 'text-white'}`}>{p.name}</span>
                      <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 font-mono">{p.category || 'Joueur'}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button aria-label="Présent" onClick={() => setStatus(p.id, 'present')} className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shadow-sm ${status === 'present' ? 'bg-emerald-500 text-white border-emerald-500' : isPro ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-neon-green/5 text-neon-green border-neon-green/20 hover:bg-neon-green/20'}`}><CheckCircle size={18} strokeWidth={2.5} /></button>
                    <button aria-label="Absent" onClick={() => setStatus(p.id, 'absent')} className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shadow-sm ${status === 'absent' ? 'bg-rose-500 text-white border-rose-500' : isPro ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100' : 'bg-neon-magenta/5 text-neon-magenta border-neon-magenta/20 hover:bg-neon-magenta/20'}`}><X size={18} strokeWidth={2.5} /></button>
                    <button aria-label="En attente" onClick={() => setStatus(p.id, 'attente')} className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${status === 'attente' ? (isPro ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white/20 text-white border-white/40') : isPro ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-white/5 text-gray-500 border-white/10'}`}><Clock size={18} /></button>
                 </div>
              </div>
            );
          })}
        </div>
        {isPro ? (
          <button onClick={handleSave} className="w-full mt-10 py-4 rounded-2xl bg-orange-600 text-white text-[11px] font-black uppercase italic shadow-lg active:scale-95 transition-all">
            {isSaved ? '✓ Présences enregistrées' : 'Enregistrer les présences'}
          </button>
        ) : (
          <NeonButton variant="cyan" className="w-full mt-10 shadow-lg" onClick={handleSave}>
            {isSaved ? '✓ Présences enregistrées' : 'Enregistrer les présences'}
          </NeonButton>
        )}
      </div>
    </div>
  );
}

function ResultsHistoryView({ isPro }: { isPro: boolean }) {
  const mockResults: any[] = [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-3 gap-3">
         <ResultCard label="Victoires" value="0" color={isPro ? 'text-emerald-600' : 'text-neon-green'} bg={isPro ? 'bg-white border-gray-200 shadow-sm' : 'bg-neon-green/5 border-neon-green/20 shadow-2xl'} />
         <ResultCard label="Nuls" value="0" color={isPro ? 'text-orange-500' : 'text-neon-orange'} bg={isPro ? 'bg-white border-gray-200 shadow-sm' : 'bg-neon-orange/5 border-neon-orange/20 shadow-2xl'} />
         <ResultCard label="Défaites" value="0" color={isPro ? 'text-rose-500' : 'text-neon-magenta'} bg={isPro ? 'bg-white border-gray-200 shadow-sm' : 'bg-neon-magenta/5 border-neon-magenta/20 shadow-2xl'} />
      </div>

      <div className={`p-8 overflow-hidden rounded-[2rem] border ${isPro ? 'bg-white border-gray-200 shadow-sm' : 'card-cyber border-white/5'}`}>
        <div className={`flex items-center gap-3 mb-10 border-b pb-4 ${isPro ? 'border-gray-100' : 'border-white/5'}`}>
           <Database size={18} className="text-gray-500" />
           <h3 className={`text-sm font-black uppercase italic tracking-tighter leading-none ${isPro ? 'text-gray-900' : 'text-white'}`}>Historique des matchs</h3>
        </div>
        <div className="space-y-4">
          {mockResults.length > 0 ? (
            mockResults.map(r => (
              <div key={r.id} className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-white/10 transition-all active:scale-[0.98]">
                 <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-xl border-2 ${r.result === 'V' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : r.result === 'N' ? 'bg-neon-orange/10 text-neon-orange border-neon-orange/30' : 'bg-neon-magenta/10 text-neon-magenta border-neon-magenta/30'}`}>{r.result}</div>
                    <div>
                      <p className="text-sm font-black text-white uppercase italic tracking-tight group-hover:text-neon-cyan transition-colors">{r.opponent}</p>
                      <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em] font-mono mt-1">{r.type} // DATA_STAMP: {r.date}</p>
                    </div>
                 </div>
                 <span className="text-base font-black italic text-white font-mono tracking-tighter">{r.score}</span>
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-30 italic uppercase text-[10px]">Aucun résultat pour l'instant — les scores saisis après vos matchs apparaîtront ici</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon, label, color, active, isLight = false }: any) {
  return (
    <button onClick={onClick} className={`${color} rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${active ? 'ring-2 ring-neon-cyan ring-offset-2 scale-95 shadow-md' : 'shadow-sm active:scale-90 border border-white/5 hover:border-white/20'} ${isLight ? 'text-neon-cyan' : 'text-white'}`}>
      <div className={active ? 'scale-110' : ''}>{icon}</div>
      <span className="text-[7px] font-black uppercase tracking-[0.2em] font-mono">{label}</span>
    </button>
  );
}

function ResultCard({ label, value, color, bg }: any) {
  return (
    <div className={`p-4 rounded-2xl border ${bg} text-center space-y-1`}>
       <p className={`text-2xl font-black ${color} font-mono tracking-tighter`}>{value}</p>
       <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest font-mono">{label}</p>
    </div>
  );
}
