'use client';

import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Upload, Loader2, Camera, Settings, Share2, QrCode, Edit3
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
 * COACH_VIEW (v8.6 - ALPHA TEST V1)
 * Données brutes supprimées. Blason sur carte OK.
 */
export function CoachView({ onActivateParent }: CoachViewProps) {
  const router = useRouter();
  const { teamInfo, theme, refreshData } = useTeam();
  const isPro = theme === 'classic';

  const [isUploading, setIsUploading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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

  const coachStatus = 'Actif';

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!teamInfo?.id) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamInfo.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('club-logos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('club-logos').getPublicUrl(filePath);
      await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', teamInfo.id);
      await refreshData();
      alert("✅ Blason mis à jour !");
    } catch (error: any) {
      alert("Erreur upload blason.");
    } finally { setIsUploading(false); }
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
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshData();
      alert("✅ Photo mise à jour !");
    } catch (error: any) {
      alert("Erreur upload photo.");
    } finally { setIsAvatarUploading(false); }
  };

  return (
    <div className="space-y-10 text-left">
      <div className="flex justify-end gap-3 -mb-6 px-2 relative z-20">
        <button onClick={() => router.push('/onboarding')} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all active:scale-90 ${styles.cardBg} ${styles.border} ${styles.accent} hover:bg-orange-50 font-black uppercase text-[9px] tracking-widest shadow-lg`}>
          <Edit3 size={16} /> Modifier Profil
        </button>
        <button onClick={() => router.push('/settings')} className={`p-3 rounded-2xl border transition-all active:scale-90 ${styles.cardBg} ${styles.border} ${styles.textSub} hover:text-white shadow-lg`}>
          <Settings size={20} />
        </button>
      </div>

      {/* CARTE FIFA AVEC BLASON ET SANS STATS BRUTES */}
      <div className="relative">
        <FifaCard
          name={teamInfo?.coachName || (isPro ? 'COACH' : 'COMMANDANT')}
          team={`${teamInfo?.clubName || 'UNITÉ_NEXUS'}`}
          score={teamInfo?.xp ? 85 : 0} // Score à 0 si pas d'XP pour éviter le "85" en dur
          label={teamInfo?.grade || (isPro ? 'COACH' : 'COMMANDANT')}
          stats={[]} // Stats vides pour cette version
          image={teamInfo?.coachPhoto}
          clubLogo={teamInfo?.clubLogo}
          color="from-[#FF6B00] via-[#CC5500] to-black"
          textColor="text-white"
        />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-[#39FF14]/20 text-[#39FF14]`}>
          <ShieldCheck size={10} />
          {coachStatus}
        </div>
      </div>

      {teamInfo?.bio && (
        <section className="space-y-3 px-2">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <User size={14} className={styles.accent} />
            <h3 className={`text-[10px] font-black ${styles.text} uppercase tracking-[0.2em]`}>Je_Me_Présente</h3>
          </div>
          <div className={`${styles.cardBg} p-5 rounded-3xl border ${styles.border} shadow-sm`}>
            <p className={`text-xs ${isPro ? 'text-gray-700' : 'text-gray-300'} leading-relaxed italic`}>"{teamInfo.bio}"</p>
          </div>
        </section>
      )}

      {/* SECTIONS STATS SUPPRIMÉES POUR CETTE VERSION (BUGG 11) */}

      <section className="grid grid-cols-2 gap-4">
        <div className={`${styles.cardBg} p-5 rounded-[2.5rem] border ${styles.border} flex flex-col items-center justify-center text-center transition-all hover:border-white/20 relative shadow-sm`}>
           <div className="relative mb-3">
              <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${styles.cardBg} shadow-2xl`}>
                {teamInfo?.coachPhoto ? <img src={teamInfo.coachPhoto} alt="Coach" className="w-full h-full object-cover" /> : <User size={32} className="opacity-20" />}
                {isAvatarUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl"><Loader2 size={20} className="animate-spin text-white" /></div>}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatar-upload" disabled={isAvatarUploading} />
              <label htmlFor="avatar-upload" className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-2xl active:scale-90 ${isAvatarUploading ? 'opacity-50' : 'hover:scale-110'} ${isPro ? 'bg-orange-600 text-white' : 'bg-[#39FF14] text-black'}`}>
                <Camera size={16} strokeWidth={3} />
              </label>
           </div>
           <p className={`text-[10px] font-black ${styles.text} uppercase italic tracking-tighter leading-tight`}>Ma_Photo</p>
        </div>

        <div className={`${styles.cardBg} p-5 rounded-[2.5rem] border ${styles.border} flex flex-col items-center justify-center text-center transition-all hover:border-white/20 relative shadow-sm`}>
           <div className="relative mb-3">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" disabled={isUploading} />
              <label htmlFor="logo-upload" className="cursor-pointer block group">
                <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${styles.cardBg} shadow-2xl relative transition-transform active:scale-95`}>
                  {teamInfo?.clubLogo ? <img src={teamInfo.clubLogo} alt="Club" className="w-full h-full object-contain p-2" /> : <ShieldCheck size={32} className="opacity-20" />}
                  {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl"><Loader2 size={20} className="animate-spin text-white" /></div>}
                </div>
                <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center shadow-2xl ${isUploading ? 'opacity-50' : ''} ${isPro ? 'bg-orange-600 text-white' : 'bg-neon-orange text-black'}`}>
                  <Upload size={16} strokeWidth={3} />
                </div>
              </label>
           </div>
           <p className={`text-[10px] font-black ${styles.text} uppercase italic tracking-tighter leading-tight`}>Blason_Club</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className={`flex items-center gap-3 border-b-2 ${styles.border} pb-2`}>
          <Share2 size={16} className={styles.accent} />
          <h3 className={`text-xs font-black ${styles.text} uppercase tracking-[0.2em]`}>Nexus_Network</h3>
        </div>
        <div className={`${styles.cardBg} p-6 rounded-[2rem] border-2 ${isPro ? 'border-orange-200' : 'border-neon-orange/20'} relative overflow-hidden shadow-sm`}>
           <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <p className={`text-[8px] font-black ${styles.textSub} uppercase tracking-widest`}>Code_Signal</p>
                <p className="text-xl font-black font-mono tracking-tighter text-neon-orange">{coachCode}</p>
              </div>
              <QrCode size={32} className="text-neon-orange" />
           </div>
           <button onClick={() => setShowShareModal(true)} className={`w-full py-4 flex items-center justify-center gap-3 rounded-xl font-black uppercase italic transition-all active:scale-95 ${isPro ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-neon-orange text-black shadow-[0_0_20px_#FF6B00]'}`}>
             <Share2 size={16} /> Diffuser Ma Carte
           </button>
        </div>
      </section>

      <ModalPartage isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Code_Signal" subtitle="Réseau Coach" shareLink={shareLink} accentColor="orange" />
      <TerminalControl />
    </div>
  );
}
