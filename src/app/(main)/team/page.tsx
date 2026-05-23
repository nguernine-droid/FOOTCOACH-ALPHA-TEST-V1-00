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
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [playersData, setPlayersData] = useState<any[]>([]);
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

  // Initialisation & Persistence
  useEffect(() => {
    const storedTeam = localStorage.getItem('team_info');
    const storedPlayers = localStorage.getItem('team_players');

    if (storedTeam) {
      setTeamInfo(JSON.parse(storedTeam));
    } else {
      router.push('/');
    }

    if (storedPlayers) {
      setPlayersData(JSON.parse(storedPlayers));
    }
  }, [router]);

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

  if (!teamInfo) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <TypeWriterText text="ACCESSING_NEXUS_DB..." className="text-neon-cyan text-xs tracking-[0.4em]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-32 max-w-md mx-auto bg-black relative font-sans overflow-x-hidden">
      {/* NEXUS TERMINAL HEADER */}
      <header className="bg-black/80 backdrop-blur-xl py-6 px-6 sticky top-0 z-40 border-b border-neon-cyan/20 flex flex-col gap-5 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <GlitchText
              text={teamInfo?.name?.toUpperCase() || 'UNIT_DATABASE'}
              className="text-xl font-black text-neon-cyan italic tracking-tighter leading-none"
            />
            <div className="flex items-center gap-2 mt-1 font-mono">
              <span className="text-[8px] font-black text-neon-cyan/60 uppercase tracking-widest bg-neon-cyan/5 px-2 py-0.5 rounded border border-neon-cyan/20">{teamInfo?.category} // {teamInfo?.level}</span>
            </div>
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
             <TabButton active={activeTab === 'effectif'} onClick={() => setActiveTab('effectif')} icon={<Cpu size={16} />} label="Unit_List" />
             <TabButton active={activeTab === 'presences'} onClick={() => setActiveTab('presences')} icon={<Activity size={16} />} label="Bio_Scan" />
             <TabButton active={activeTab === 'resultats'} onClick={() => setActiveTab('resultats')} icon={<Database size={16} />} label="Logs" />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8 relative z-10">

        {/* ANALYTICS TERMINAL */}
        <section className="grid grid-cols-3 gap-3">
           <StatusCard icon={<Terminal size={14} className="text-neon-green" />} label="ACTIVE" value={playersData.filter(p => p.status === 'Actif').length} color="bg-neon-green/5 border-neon-green/20" textColor="text-neon-green" />
           <StatusCard icon={<AlertCircle size={14} className="text-neon-magenta" />} label="OFFLINE" value={playersData.filter(p => p.status === 'Blessé').length} color="bg-neon-magenta/5 border-neon-magenta/20" textColor="text-neon-magenta" />
           <StatusCard icon={<Zap size={14} className="text-neon-orange" />} label="SYNC" value={playersData.length > 0 ? "92%" : "-"} color="bg-neon-orange/5 border-neon-orange/20" textColor="text-neon-orange" />
        </section>

        {activeTab === 'effectif' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Mission Controls */}
            <div className="grid grid-cols-5 gap-2">
              <ActionButton onClick={() => startAction('convocation')} icon={<Send size={16} />} label="DEPLOY" color="bg-neon-orange" active={actionMode === 'convocation'} />
              <ActionButton onClick={() => startAction('message')} icon={<MessageCircle size={16} />} label="SIGNAL" color="bg-white/10" active={actionMode === 'message'} />
              <ActionButton onClick={() => startAction('annonce')} icon={<Megaphone size={16} />} label="BROAD" color="bg-white/10" active={actionMode === 'annonce'} />
              <ActionButton onClick={() => setShowResultsModal(true)} icon={<BarChart3 size={16} />} label="DATA" color="bg-white/10" active={showResultsModal} />
              <ActionButton onClick={() => startAction('selection')} icon={<ListChecks size={16} />} label="MULTI" color="bg-neon-cyan/20" active={actionMode === 'selection'} isLight />
            </div>

            {/* List Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-gray-500">
                   <Cpu size={12} />
                   <h3 className="text-[9px] font-black uppercase tracking-[0.3em] font-mono italic">Nexus_Inventory</h3>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => setSortBy(sortBy === 'rating' ? 'name' : 'rating')} className="p-2.5 rounded-xl bg-white/5 text-neon-cyan border border-white/10 hover:border-neon-cyan/50 transition-all"><ArrowUpDown size={16} /></button>
                   <div className="bg-white/5 rounded-xl p-1 flex gap-1 border border-white/10">
                     <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-neon-cyan text-black shadow-[0_0_10px_#00F0FF]' : 'text-gray-600'}`}><LayoutGrid size={14} /></button>
                     <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-neon-cyan text-black shadow-[0_0_10px_#00F0FF]' : 'text-gray-600'}`}><List size={14} /></button>
                   </div>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                {filters.map((filter) => (
                  <button key={filter} onClick={() => setActiveFilter(filter)} className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border-2 font-mono ${activeFilter === filter ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'border-white/5 bg-[#050505] text-gray-600'}`}>
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
              <div className="text-center py-20 card-cyber border-dashed border-white/10 space-y-6">
                 <div className="w-20 h-20 bg-neon-cyan/5 rounded-[2rem] border-2 border-dashed border-neon-cyan/20 flex items-center justify-center mx-auto animate-pulse">
                    <UserPlus size={32} className="text-neon-cyan/30" />
                 </div>
                 <div className="space-y-2 px-10">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic font-mono">DATABASE_EMPTY</p>
                   <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest leading-relaxed">Initialization required. Recruit first unit to begin mission profiling.</p>
                 </div>
                 <NeonButton variant="cyan" size="lg" onClick={() => router.push('/team/new')}>
                    RECRUIT_UNIT_01
                 </NeonButton>
              </div>
            )}

            {playersData.length > 0 && (
              <button onClick={() => router.push('/team/new')} className="w-full bg-[#050505] text-neon-cyan font-black text-[11px] py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-xl border-2 border-neon-cyan/20 hover:border-neon-cyan/50 active:scale-98 transition-all uppercase italic tracking-[0.2em] font-mono">
                <Plus size={20} strokeWidth={4} /> INITIALIZE_NEW_UNIT
              </button>
            )}
          </div>
        )}

        {activeTab === 'presences' && <AttendanceView players={playersData} />}
        {activeTab === 'resultats' && <ResultsHistoryView />}

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

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all ${active ? 'bg-neon-cyan/10 text-neon-cyan shadow-[inset_0_0_10px_rgba(0,240,255,0.2)]' : 'text-gray-600 hover:text-gray-400'}`}>
      <div className={active ? 'drop-shadow-[0_0_8px_#00F0FF]' : ''}>{icon}</div>
      <span className="text-[7px] font-black uppercase tracking-[0.2em] font-mono">{label}</span>
    </button>
  );
}

function StatusCard({ icon, label, value, color, textColor }: any) {
  return (
    <div className={`p-5 rounded-[2rem] border ${color} flex flex-col items-center justify-center text-center gap-2 shadow-2xl relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
      <div className="bg-white/5 p-2 rounded-xl mb-1 border border-white/5 group-hover:scale-110 transition-transform">{icon}</div>
      <span className={`text-xl font-black ${textColor} font-mono tracking-tighter`}>{value}</span>
      <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.3em] font-mono">{label}</span>
    </div>
  );
}

function AttendanceView({ players }: { players: any[] }) {
  if (players.length === 0) {
    return (
      <div className="text-center py-24 card-cyber border-white/5 px-10">
         <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] font-mono italic leading-relaxed">RECRUIT_UNITS_TO_ENABLE_BIOMETRIC_SCAN</p>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="card-cyber p-8 border-neon-cyan/20">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00F0FF]" />
              <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Bio_Metric_Check</h3>
           </div>
           <span className="text-[9px] font-black text-neon-cyan/50 font-mono tracking-widest">SEQ_7482_92</span>
        </div>
        <div className="space-y-5">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
               <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-neon-cyan/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img src={`https://i.pravatar.cc/100?u=${p.name}`} className="w-10 h-10 rounded-xl border border-white/10 grayscale group-hover:grayscale-0 transition-all relative z-10" alt="" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase italic tracking-tight">{p.name}</span>
                    <p className="text-[8px] font-bold text-gray-600 uppercase mt-0.5 font-mono">UNIT_SYNC: 100%</p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button className="w-9 h-9 rounded-xl bg-neon-green/5 text-neon-green flex items-center justify-center border border-neon-green/20 hover:bg-neon-green/20 transition-all shadow-lg"><CheckCircle size={18} strokeWidth={2.5} /></button>
                  <button className="w-9 h-9 rounded-xl bg-neon-magenta/5 text-neon-magenta flex items-center justify-center border border-neon-magenta/20 hover:bg-neon-magenta/20 transition-all shadow-lg"><X size={18} strokeWidth={2.5} /></button>
                  <button className="w-9 h-9 rounded-xl bg-white/5 text-gray-500 flex items-center justify-center border border-white/10"><Clock size={18} /></button>
               </div>
            </div>
          ))}
        </div>
        <NeonButton variant="cyan" className="w-full mt-10 shadow-[0_10px_25px_rgba(0,240,255,0.2)]">UPLOAD_BIOMETRIC_DATA</NeonButton>
      </div>
    </div>
  );
}

function ResultsHistoryView() {
  const mockResults: any[] = [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-3 gap-3">
         <ResultCard label="SUCCESS" value="0" color="text-neon-green" bg="bg-neon-green/5 border-neon-green/20" />
         <ResultCard label="NEUTRAL" value="0" color="text-neon-orange" bg="bg-neon-orange/5 border-neon-orange/20" />
         <ResultCard label="FAILED" value="0" color="text-neon-magenta" bg="bg-neon-magenta/5 border-neon-magenta/20" />
      </div>

      <div className="card-cyber p-8 border-white/5 overflow-hidden">
        <div className="flex items-center gap-3 mb-10 border-b border-white/5 pb-4">
           <Database size={18} className="text-gray-500" />
           <h3 className="text-sm font-black text-white uppercase italic tracking-tighter leading-none">Archives_Mission_Logs</h3>
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
            <div className="py-20 text-center opacity-30 italic uppercase text-[10px]">Aucun log de mission disponible</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon, label, color, active, isLight = false }: any) {
  return (
    <button onClick={onClick} className={`${color} rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${active ? 'ring-2 ring-neon-cyan ring-offset-2 scale-95 shadow-[0_0_20px_currentColor]' : 'shadow-sm active:scale-90 border border-white/5 hover:border-white/20'} ${isLight ? 'text-neon-cyan' : 'text-white'}`}>
      <div className={active ? 'scale-110 drop-shadow-[0_0_10px_currentColor]' : ''}>{icon}</div>
      <span className="text-[7px] font-black uppercase tracking-[0.2em] font-mono">{label}</span>
    </button>
  );
}

function ResultCard({ label, value, color, bg }: any) {
  return (
    <div className={`p-4 rounded-2xl border ${bg} text-center space-y-1 shadow-2xl`}>
       <p className={`text-2xl font-black ${color} font-mono tracking-tighter`}>{value}</p>
       <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest font-mono">{label}</p>
    </div>
  );
}
