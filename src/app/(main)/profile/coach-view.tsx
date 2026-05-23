'use client';

import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Upload, Loader2, Camera, Settings, Share2, QrCode, ToggleRight, ToggleLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { FifaCard } from '@/components/FifaCard';
import { ModalPartage } from '@/components/ui/ModalPartage';
import { StatExplainer } from '@/components/ui/StatExplainer';
import { TerminalControl } from './terminal-control';
import { Brain, Users as UsersIcon, Zap as ZapIcon, Info, TrendingUp, Timer, ClipboardCheck } from 'lucide-react';

interface CoachViewProps {
  onActivateParent: () => void;
}

/**
 * COACH_VIEW (v8.3 - ALPHA TEST V1 RESTAURATION)
 * Version avec Partage de Code Signal restaurée.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo, theme, refreshData } = useTeam();
  const isPro = theme === 'classic';

  const [isUploading, setIsUploading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'card' | 'card_cv'>('card');
  const [explainerType, setExplainerType] = useState<'DOC' | 'SYN' | 'INF' | null>(null);
  const [coachCode, setCoachCode] = useState("NEXUS-V1-BETA");

  useEffect(() => {
    const saved = localStorage.getItem('user_coach_code');
    if (saved) setCoachCode(saved);
  }, []);

  const shareLink = `https://nexus-os.app/coach/${coachCode}`;

  const styles = isPro ? {
    cardBg: 'bg-white',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textSub: 'text-gray-500',
    accent: 'text-orange-600',
  } : {
    cardBg: 'bg-[#0A0A0A]',
    border: 'border-white/10',
    text: 'text-white',
    textSub: 'text-gray-400',
    accent: 'text-[#39FF14]',
  };

  // ==========================================
  // LOGIQUE UPLOAD
  // ==========================================
  const coachStatus = 'Actif'; // Simplifié pour la V1
  const coachRPGStats = {
    doctrine: 0,
    synergie: 0,
    influence: 0,
    lvl: 1,
    grade: isPro ? 'COACH' : 'COMMANDANT',
    xp: 0
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!teamInfo?.id) {
      alert("🚨 ERREUR : Votre club n'est pas correctement identifié. Veuillez re-sélectionner votre club dans l'onboarding.");
      return;
    }

    setIsUploading(true);
    try {
      console.log("📤 Début upload logo pour club ID:", teamInfo.id);
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamInfo.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('club-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('club-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('clubs')
        .update({ logo_url: publicUrl })
        .eq('id', teamInfo.id);

      if (updateError) throw updateError;

      await refreshData();
      alert("✅ Blason du club mis à jour !");
    } catch (error: any) {
      console.error("Erreur complète upload:", error);
      alert("❌ ÉCHEC DE L'ENVOI : " + (error.message || "Erreur de stockage"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('coach-avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('coach-avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      await refreshData();
      alert("✅ Photo de profil mise à jour !");
    } catch (error: any) {
      alert("Erreur upload photo.");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  return (
    <div className="space-y-10 text-left">

      {/* HEADER ACTIONS */}
      <div className="flex justify-end gap-3 -mb-6 px-2 relative z-20">
        <button
          onClick={() => router.push('/settings')}
          className={`p-3 rounded-2xl border transition-all active:scale-90 ${styles.cardBg} ${styles.border} ${styles.textSub} hover:text-white shadow-lg`}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* CARTE FIFA */}
      <div className="relative">
        <FifaCard
          name={teamInfo?.coachName || (isPro ? 'COACH' : 'COMMANDANT')}
          team={`${teamInfo?.clubName || 'CLUB'} ${teamInfo?.category || ''}`}
          score={85}
          label={coachRPGStats.grade}
          stats={[
            { label: 'DOC', value: coachRPGStats.doctrine },
            { label: 'SYN', value: coachRPGStats.synergie },
            { label: 'INF', value: coachRPGStats.influence },
            { label: 'LVL', value: coachRPGStats.lvl },
            { label: 'SIG', value: 0 },
            { label: 'PTS', value: coachRPGStats.xp }
          ]}
          image={teamInfo?.coachPhoto}
          color="from-[#FF6B00] via-[#CC5500] to-black"
          textColor="text-white"
        />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-[#39FF14]/20 text-[#39FF14]`}>
          <ShieldCheck size={10} />
          {coachStatus}
        </div>
      </div>

      {/* BIO COACH (v9.9) */}
      {teamInfo?.bio && (
        <section className="space-y-3 px-2">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <User size={14} className={styles.accent} />
            <h3 className={`text-[10px] font-black ${styles.text} uppercase tracking-[0.2em]`}>Je_Me_Présente</h3>
          </div>
          <div className={`${styles.cardBg} p-5 rounded-3xl border ${styles.border} shadow-sm`}>
            <p className={`text-xs ${isPro ? 'text-gray-700' : 'text-gray-300'} leading-relaxed italic`}>
              "{teamInfo.bio}"
            </p>
          </div>
        </section>
      )}

      {/* PROTOCOLE TECHNIQUE (Nexus Only v9.2) */}
      {!isPro && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2 px-2">
            <Info size={14} className="text-neon-cyan" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Protocole_Technique</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setExplainerType('DOC')}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2 active:scale-95 transition-all group"
            >
              <Brain size={20} className="text-neon-orange group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Doctrine</span>
            </button>
            <button
              onClick={() => setExplainerType('SYN')}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2 active:scale-95 transition-all group"
            >
              <UsersIcon size={20} className="text-neon-cyan group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Synergie</span>
            </button>
            <button
              onClick={() => setExplainerType('INF')}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2 active:scale-95 transition-all group"
            >
              <ZapIcon size={20} className="text-neon-magenta group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Influence</span>
            </button>
          </div>
        </section>
      )}

      {/* INDICATEURS DE PERFORMANCE (Classic Only v9.3) */}
      {isPro && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-2 px-2">
            <TrendingUp size={14} className="text-orange-600" />
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Indicateurs_Performance</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
              <TrendingUp size={18} className="text-green-500 mb-1" />
              <span className="text-lg font-black text-gray-900">92%</span>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest text-center">Assiduité</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
              <Timer size={18} className="text-blue-500 mb-1" />
              <span className="text-lg font-black text-gray-900">14m</span>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest text-center">Réactivité</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
              <ClipboardCheck size={18} className="text-orange-500 mb-1" />
              <span className="text-lg font-black text-gray-900">85%</span>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest text-center">Complétude</span>
            </div>
          </div>
        </section>
      )}

      {/* CONFIGURATION PHOTO & BLASON */}
      <section className="grid grid-cols-2 gap-4">
        {/* MA PHOTO */}
        <div className={`${styles.cardBg} p-5 rounded-[2.5rem] border ${styles.border} flex flex-col items-center justify-center text-center transition-all hover:border-white/20 relative shadow-sm`}>
           <div className="relative mb-3">
              <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${styles.cardBg} shadow-2xl`}>
                {teamInfo?.coachPhoto ? (
                  <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="opacity-20" />
                )}
                {isAvatarUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatar-upload" disabled={isAvatarUploading} />
              <label htmlFor="avatar-upload" className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-2xl active:scale-90 ${isAvatarUploading ? 'opacity-50' : 'hover:scale-110'} ${isPro ? 'bg-orange-600 text-white' : 'bg-[#39FF14] text-black'}`}>
                <Camera size={16} strokeWidth={3} />
              </label>
           </div>
           <p className={`text-[10px] font-black ${styles.text} uppercase italic tracking-tighter leading-tight`}>Ma_Photo</p>
           <p className={`text-[7px] font-bold ${styles.textSub} uppercase tracking-[0.2em] mt-1`}>{isPro ? 'Coach' : 'Commandant'}</p>
        </div>

        {/* BLASON CLUB */}
        <div className={`${styles.cardBg} p-5 rounded-[2.5rem] border ${styles.border} flex flex-col items-center justify-center text-center transition-all hover:border-white/20 relative shadow-sm`}>
           <div className="relative mb-3">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" disabled={isUploading} />
              <label htmlFor="logo-upload" className="cursor-pointer block group">
                <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${styles.cardBg} shadow-2xl relative transition-transform active:scale-95`}>
                  {teamInfo?.clubLogo ? (
                    <img src={teamInfo.clubLogo} alt="Club" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ShieldCheck size={32} className="opacity-20" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                  {/* Overlay au survol */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                </div>
                {/* Petit bouton flottant conservé pour le style */}
                <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center shadow-2xl ${isUploading ? 'opacity-50' : ''} ${isPro ? 'bg-orange-600 text-white' : 'bg-neon-orange text-black'}`}>
                  <Upload size={16} strokeWidth={3} />
                </div>
              </label>
           </div>
           <p className={`text-[10px] font-black ${styles.text} uppercase italic tracking-tighter leading-tight`}>Blason_Club</p>
           <p className={`text-[7px] font-bold ${styles.textSub} uppercase tracking-[0.2em] mt-1 truncate max-w-[80px]`}>{teamInfo?.clubName || 'Nexus'}</p>
        </div>
      </section>

      {/* NEXUS NETWORK (RESTAURÉ v8.4) */}
      <section className="space-y-4">
        <div className={`flex items-center gap-3 border-b-2 ${styles.border} pb-2`}>
          <Share2 size={16} className={styles.accent} />
          <h3 className={`text-xs font-black ${styles.text} uppercase tracking-[0.2em]`}>Nexus_Network</h3>
        </div>
        <div className={`${styles.cardBg} p-6 rounded-[2rem] border-2 ${isPro ? 'border-orange-200' : 'border-neon-orange/20'} relative overflow-hidden`}>
           <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <p className={`text-[8px] font-black ${styles.textSub} uppercase tracking-widest`}>Code_Signal</p>
                <p className="text-xl font-black font-mono tracking-tighter text-neon-orange">{coachCode}</p>
              </div>
              <div className={`${isPro ? 'bg-orange-100' : 'bg-white'} p-2 rounded-xl flex items-center justify-center`}>
                 <QrCode size={32} className="text-neon-orange" />
              </div>
           </div>
           <button
             onClick={() => setShowShareModal(true)}
             className={`w-full py-4 flex items-center justify-center gap-3 rounded-xl font-black uppercase italic transition-all active:scale-95 ${isPro ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-neon-orange text-black shadow-[0_0_20px_#FF6B00]'}`}
           >
             <Share2 size={16} /> Diffuser Ma Carte
           </button>
        </div>
      </section>

      <ModalPartage
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Code_Signal"
        subtitle="Réseau Coach"
        shareLink={shareLink}
        accentColor="orange"
      />

      {explainerType && (
        <StatExplainer
          isOpen={!!explainerType}
          onClose={() => setExplainerType(null)}
          type={explainerType}
        />
      )}

      <TerminalControl />

      <div className="py-10 text-center opacity-20 border-t border-dashed border-white/10">
         <p className="text-[8px] font-black uppercase tracking-[0.5em]">ALPHA_VERSION_BRIDÉE</p>
      </div>

    </div>
  );
}
