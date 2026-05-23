'use client';

import React, { useState } from 'react';
import {
  Cpu, Zap, Brain, Heart, Share2, QrCode, ShieldCheck, UsersRound, Plus, FileText, Crosshair, Swords, Lock
} from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { FifaCard } from '@/components/FifaCard';
import { ScanlinesOverlay } from '@/components/ui/cyber/ScanlinesOverlay';
import { TerminalControl } from './terminal-control';
import { ModalPartage } from '@/components/ui/ModalPartage'; // 1. Import de la Modale
import { motion } from 'framer-motion';

export function PlayerView() {
  const { teamInfo, theme } = useTeam();
  const isNexus = theme === 'nexus';

  // ==========================================
  // GESTION DES THÊMES DYNAMIQUES
  // ==========================================
  const styles = isNexus ? {
    overlay: <ScanlinesOverlay />,
    mainBg: '',
    rgpdBg: 'bg-neon-cyan/5 border-neon-cyan/20 text-neon-cyan',
    cardGradient: "from-[#00F0FF] via-[#007799] to-black",
    cardWrapper: "rounded-[2rem] p-1 bg-[#00F0FF] animate-pulse shadow-[0_0_30px_rgba(0,240,255,0.3)]",
    cardInner: "rounded-[1.85rem] overflow-hidden",
    sectionBorder: "border-neon-cyan/20",
    accent: "text-neon-cyan",
    engineBg: "bg-[#050510] border-neon-cyan/20",
    engineProgressBg: "bg-white/10 border-white/5",
    engineBar: "bg-neon-cyan shadow-[0_0_15px_#00F0FF]",
    flashColor: "bg-neon-cyan/30",
    vitalityColor: 'text-neon-orange bg-neon-orange/10',
    logicColor: 'text-neon-cyan bg-neon-cyan/10',
    spiritColor: 'text-neon-magenta bg-neon-magenta/10',
    cvBg: 'bg-[#050510] border-neon-cyan/20',
    cvText: 'text-neon-cyan',
    missionBg: 'bg-gradient-to-r from-neon-cyan/10 to-transparent border border-neon-cyan/30',
    missionIcon: 'bg-neon-cyan/20 text-neon-cyan',
    shareBtn: 'bg-neon-cyan text-black shadow-[0_0_20px_#00F0FF] hover:bg-cyan-300',
    lockedBg: 'bg-red-500/10 border-red-500/30',
    lockedText: 'text-red-400',
  } : {
    overlay: null,
    mainBg: 'bg-gray-50',
    rgpdBg: 'bg-blue-50 border-blue-200 text-blue-700',
    cardGradient: "from-blue-600 via-blue-700 to-gray-800",
    cardWrapper: "rounded-[2rem] p-[1px] border border-gray-200 shadow-md",
    cardInner: "rounded-[1.85rem] overflow-hidden",
    sectionBorder: "border-gray-200",
    accent: "text-blue-600",
    engineBg: "bg-white border-gray-200",
    engineProgressBg: "bg-gray-100 border-gray-100",
    engineBar: "bg-blue-600",
    flashColor: "bg-blue-400/30",
    vitalityColor: 'text-orange-500 bg-orange-50',
    logicColor: 'text-blue-600 bg-blue-50',
    spiritColor: 'text-pink-500 bg-pink-50',
    cvBg: 'bg-white border-gray-200',
    cvText: 'text-blue-600',
    missionBg: 'bg-blue-50 border border-blue-200',
    missionIcon: 'bg-blue-100 text-blue-600',
    shareBtn: 'bg-blue-600 text-white hover:bg-blue-700',
    lockedBg: 'bg-red-50 border-red-200',
    lockedText: 'text-red-600',
  };

  // ==========================================
  // STATES & DATA
  // ==========================================
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [currentXp, setCurrentXp] = useState(3400);
  const [impulses, setImpulses] = useState(3);
  const [showShareModal, setShowShareModal] = useState(false);

  const xpPerImpulse = 250;
  const xpToNext = 5000;

  const playerStats = { vitality: 75, logic: 60, spirit: 85 };
  const parentalShareAllowed = true;
  const playerPoste = "Attaquant";
  const playerNiveau = "D1";
  const playerSaison = "2024/2025";

  // 3. Lien de partage dynamique
  const shareLink = `https://nexus-os.app/player/${(teamInfo?.userFirstName || 'lucas').toLowerCase()}-${(teamInfo?.userLastName || 'rcx').toLowerCase()}`;

  // ==========================================
  // MOTEUR RPG ANIMÉ
  // ==========================================
  const handleSync = async () => {
    if (syncStatus !== 'idle' || impulses === 0) return;
    setSyncStatus('syncing');
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSyncStatus('success');
    setImpulses(0);

    const targetXp = currentXp + (impulses * xpPerImpulse);
    const cappedXp = Math.min(targetXp, xpToNext);
    const step = (cappedXp - currentXp) / 20;
    let tempXp = currentXp;

    const interval = setInterval(() => {
      tempXp += step;
      if (tempXp >= cappedXp) {
        tempXp = cappedXp;
        clearInterval(interval);
        setTimeout(() => setSyncStatus('idle'), 1500);
      }
      setCurrentXp(Math.round(tempXp));
    }, 50);
  };

  // 4. Gestion du Verrou Parental
  const handleShareAttempt = () => {
    if (parentalShareAllowed) {
      setShowShareModal(true);
    } else {
      // Simulation de l'envoi de notification au parent
      alert("🔔 Notification envoyée à tes parents ! En attente de leur autorisation pour partager ta carte.");
    }
  };

  return (
    <div className={`relative text-left space-y-6 ${styles.mainBg}`}>
      {styles.overlay}

      {/* BANNIÈRE RGPD MINEUR */}
      <div className={`${styles.rgpdBg} rounded-2xl p-3 flex items-center gap-3`}>
        <ShieldCheck size={18} className="shrink-0" />
        <div className="text-[8px] font-bold uppercase tracking-widest leading-relaxed">
          Protection active : Profil mineur sécurisé. Les données sont chiffrées.
        </div>
      </div>

      <div className="relative z-10 space-y-10">

        {/* CARTE UNITÉ NEXUS */}
        <div className={styles.cardWrapper}>
           <div className={styles.cardInner}>
             <FifaCard
               name={teamInfo?.coachName || 'LUCAS RCX'}
               team={`${teamInfo?.clubName || 'CLUB'} ${teamInfo?.category || ''}`}
               score={Math.round((playerStats.vitality + playerStats.logic + playerStats.spirit) / 3)}
               label={playerPoste}
               stats={[
                 { label: 'PHY', value: playerStats.vitality },
                 { label: 'TEC', value: playerStats.logic },
                 { label: 'ENG', value: playerStats.spirit },
                 { label: 'N°', value: 10 },
                 { label: 'LVL', value: 8 },
                 { label: 'XP', value: currentXp }
               ]}
               image={null}
               color={styles.cardGradient}
               textColor="text-white"
               variant="cyber"
             />
           </div>
        </div>

        {/* UNIT SYNC ENGINE (MOTEUR RPG) */}
        <section className="space-y-4">
          <div className={`flex items-center gap-3 border-b-2 ${styles.sectionBorder} pb-2`}>
            <Cpu size={16} className={styles.accent} />
            <h3 className={`text-xs font-black ${isNexus ? 'text-white' : 'text-gray-900'} uppercase tracking-[0.2em]`}>Unit_Sync_Engine</h3>
          </div>
          <div className={`${styles.engineBg} rounded-[2rem] p-6 border relative overflow-hidden`}>
             {syncStatus === 'success' && (
               <motion.div
                 initial={{ opacity: 0.8, scale: 0 }}
                 animate={{ opacity: 0, scale: 2 }}
                 transition={{ duration: 0.8 }}
                 className={`absolute inset-0 ${styles.flashColor} z-0 rounded-[2rem]`}
               />
             )}
             <div className="relative z-10 space-y-6">
               <div className="flex justify-between items-center mb-2">
                 <p className={`text-[9px] font-black ${isNexus ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Progression_Impulsion</p>
                 <span className={`text-xs font-mono font-black ${styles.accent}`}>{currentXp} / {xpToNext} XP</span>
               </div>
               <div className={`w-full ${styles.engineProgressBg} rounded-full h-3 overflow-hidden border`}>
                 <motion.div
                   className={`${styles.engineBar} h-full rounded-full`}
                   animate={{ width: `${(currentXp / xpToNext) * 100}%` }}
                   transition={{ duration: 1, ease: "easeOut" }}
                 />
               </div>
               <motion.button
                 onClick={handleSync}
                 disabled={syncStatus !== 'idle' || impulses === 0}
                 animate={syncStatus === 'syncing' ? { x: [0, -3, 3, -3, 3, 0], scale: [1, 1.02, 1, 1.02, 1], transition: { duration: 0.4, repeat: Infinity, repeatType: "loop" } } : {}}
                 className={`w-full py-4 rounded-xl border-2 font-black uppercase italic tracking-widest transition-colors flex items-center justify-center gap-2 relative overflow-hidden
                   ${syncStatus === 'idle' && impulses > 0 ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20' : ''}
                   ${syncStatus === 'syncing' ? 'bg-neon-cyan/30 border-neon-cyan text-white' : ''}
                   ${syncStatus === 'success' ? 'bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14]' : ''}
                   ${impulses === 0 && syncStatus === 'idle' ? 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed' : ''}
                 `}
               >
                 {syncStatus === 'syncing' && (
                   <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                 )}
                 {syncStatus === 'idle' && impulses > 0 && <><Zap size={16} /> UPLOAD_SYNC ({impulses}⚡)</>}
                 {syncStatus === 'syncing' && 'SYNC_IN_PROGRESS...'}
                 {syncStatus === 'success' && 'NEXUS UPGRADED !'}
                 {syncStatus === 'idle' && impulses === 0 && 'AUCUNE IMPULSION'}
               </motion.button>

               <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-gray-500/10">
                 <div><div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${styles.vitalityColor}`}><Zap size={20} /></div><p className={`text-[7px] font-black uppercase ${isNexus ? 'text-gray-500' : 'text-gray-400'}`}>Vitality</p><p className={`text-sm font-black font-mono ${styles.vitalityColor.split(' ')[0]}`}>{playerStats.vitality}</p></div>
                 <div><div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${styles.logicColor}`}><Brain size={20} /></div><p className={`text-[7px] font-black uppercase ${isNexus ? 'text-gray-500' : 'text-gray-400'}`}>Logic</p><p className={`text-sm font-black font-mono ${styles.logicColor.split(' ')[0]}`}>{playerStats.logic}</p></div>
                 <div><div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${styles.spiritColor}`}><Heart size={20} /></div><p className={`text-[7px] font-black uppercase ${isNexus ? 'text-gray-500' : 'text-gray-400'}`}>Spirit</p><p className={`text-sm font-black font-mono ${styles.spiritColor.split(' ')[0]}`}>{playerStats.spirit}</p></div>
               </div>
             </div>
          </div>
        </section>

        {/* CV JOUEUR */}
        <section className="space-y-4">
          <div className={`flex items-center gap-3 border-b-2 ${styles.sectionBorder} pb-2`}>
            <FileText size={16} className={styles.accent} />
            <h3 className={`text-xs font-black ${isNexus ? 'text-white' : 'text-gray-900'} uppercase tracking-[0.2em]`}>Carte_De_Visite</h3>
          </div>
          <div className={`${styles.cvBg} rounded-2xl p-4 border grid grid-cols-2 gap-3 text-[9px] uppercase font-bold ${isNexus ? 'text-gray-500' : 'text-gray-500'}`}>
             <p>Saison: <span className={`${isNexus ? 'text-white' : 'text-gray-900'} font-mono`}>{playerSaison}</span></p>
             <p>Club: <span className={`${isNexus ? 'text-white' : 'text-gray-900'} font-mono`}>{teamInfo?.clubName || 'NEXUS'}</span></p>
             <p>Cat: <span className={`${isNexus ? 'text-white' : 'text-gray-900'} font-mono`}>{teamInfo?.category || 'U14'}</span></p>
             <p>Niveau: <span className={`${styles.cvText} font-mono`}>{playerNiveau}</span></p>
             <p className="col-span-2">Poste: <span className={`${styles.cvText} font-mono`}>{playerPoste}</span></p>
          </div>
        </section>

        {/* PROCHAINE MISSION */}
        <section className="space-y-4">
          <div className={`flex items-center gap-3 border-b-2 ${styles.sectionBorder} pb-2`}>
            <Swords size={16} className={styles.accent} />
            <h3 className={`text-xs font-black ${isNexus ? 'text-white' : 'text-gray-900'} uppercase tracking-[0.2em]`}>Prochaine_Mission</h3>
          </div>
          <div className={`${styles.missionBg} rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group`}>
            <div className={`absolute -right-4 -bottom-4 ${isNexus ? 'text-neon-cyan/10' : 'text-blue-100'}`}><Crosshair size={80} /></div>
            <div className={`relative z-10 w-12 h-12 rounded-xl ${styles.missionIcon} shrink-0 ${isNexus ? 'animate-pulse' : ''}`}>
               <Swords size={24} className="m-auto" />
            </div>
            <div className="relative z-10">
               <p className={`text-sm font-black ${isNexus ? 'text-white' : 'text-gray-900'} uppercase italic`}>Match Vs FC Sète</p>
               <p className={`text-[9px] ${isNexus ? 'text-gray-400' : 'text-gray-500'} uppercase font-bold`}>Dimanche 10h - Terrain Honneur</p>
               <span className={`text-[7px] ${styles.missionBg} ${styles.accent} px-2 py-0.5 rounded-full border mt-2 inline-block font-black uppercase`}>Objectif: Victoire</span>
            </div>
          </div>
        </section>

        {/* CLUSTER FAMILIAL */}
        <section className="space-y-4">
          <div className={`flex items-center gap-3 border-b-2 ${styles.sectionBorder} pb-2`}>
            <UsersRound size={16} className={styles.accent} />
            <h3 className={`text-xs font-black ${isNexus ? 'text-white' : 'text-gray-900'} uppercase tracking-[0.2em]`}>Cluster_Familial</h3>
          </div>
          <div className="flex -space-x-2 px-2 overflow-visible">
            {[
              { role: 'Parent', status: 'online', name: 'Sarah' },
              { role: 'Parent', status: 'offline', name: 'Papa' },
              { role: 'Supporter', status: 'online', name: 'Mamy' },
            ].map((member, i) => (
              <div key={i} className="group relative">
                <div className={`w-12 h-12 rounded-full border-2 ${isNexus ? 'bg-black' : 'bg-white'} flex items-center justify-center text-[10px] font-black transition-all relative z-10
                  ${member.status === 'online' ? (isNexus ? 'border-[#39FF14] shadow-[0_0_10px_#39FF14]' : 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]') : (isNexus ? 'border-red-500 shadow-[0_0_10px_#FF000033]' : 'border-gray-300')}`}
                >
                  {member.name.substring(0, 1)}
                </div>
                <div className={`absolute bottom-[-20px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${isNexus ? 'bg-black border border-white/10' : 'bg-white border border-gray-200 shadow-lg'} px-2 py-0.5 rounded text-[7px] font-black uppercase whitespace-nowrap z-20`}>
                  {member.name} ({member.role})
                </div>
              </div>
            ))}
            <div className={`w-12 h-12 rounded-full border-2 border-dashed ${isNexus ? 'border-white/20 text-white/20 hover:border-neon-cyan hover:text-neon-cyan' : 'border-gray-300 text-gray-300 hover:border-blue-500 hover:text-blue-500'} flex items-center justify-center cursor-pointer transition-all relative z-10`}>
              <Plus size={16} />
            </div>
          </div>
        </section>

        {/* DIFFUSION CARTE (PARTAGE RGPD) */}
        <section className="space-y-4">
           <div className={`flex items-center gap-3 border-b-2 ${styles.sectionBorder} pb-2`}>
             <Share2 size={16} className={styles.accent} />
             <h3 className={`text-xs font-black ${isNexus ? 'text-white' : 'text-gray-900'} uppercase tracking-[0.2em]`}>Diffusion_Carte</h3>
           </div>

           {parentalShareAllowed ? (
             <button
               onClick={handleShareAttempt}
               className={`w-full py-4 flex items-center justify-center gap-2 rounded-xl font-black uppercase italic transition-all active:scale-95 ${styles.shareBtn}`}
             >
               <QrCode size={16} /> Diffuser Ma Carte
             </button>
           ) : (
             <button
               onClick={handleShareAttempt}
               className={`w-full p-4 ${styles.lockedBg} rounded-2xl text-center cursor-pointer hover:opacity-80 transition-opacity border`}
             >
               <div className="flex items-center justify-center gap-2 mb-1">
                 <Lock size={14} className={styles.lockedText} />
                 <p className={`text-xs font-black uppercase italic ${styles.lockedText}`}>Partage Désactivé</p>
               </div>
               <p className={`text-[8px] font-bold uppercase mt-1 ${isNexus ? 'text-gray-400' : 'text-gray-500'}`}>Clique pour demander l'autorisation à tes parents</p>
             </button>
           )}
        </section>

        <TerminalControl />

      </div>

      {/* 5. Composant ModalPartage */}
      <ModalPartage
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Unité Nexus"
        subtitle="Carte Joueur"
        shareLink={shareLink}
        accentColor="cyan"
      />
    </div>
  );
}
