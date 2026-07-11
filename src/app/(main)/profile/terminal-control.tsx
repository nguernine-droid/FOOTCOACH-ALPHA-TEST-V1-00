'use client';

import React, { useState } from 'react';
import { Lock, Calendar, Moon, Sun, Bell, Download, Trash2, ChevronRight, Merge } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// On remplace forceCyber par hideThemeToggle (pour Parent & Supporter)
export function TerminalControl({ hideThemeToggle = false } : { hideThemeToggle?: boolean }) {
  const { theme, setTheme, role } = useTeam();
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState('2024/2025');
  const [pushUrgence, setPushUrgence] = useState(true);

  const isPro = theme === 'classic';

  // ==========================================
  // GESTION DES THÊMES DYNAMIQUES
  // ==========================================
  const styles = isPro ? {
    sectionBorder: 'border-gray-200',
    accent: 'text-blue-600',
    containerBg: 'bg-white border-gray-200 shadow-sm',
    divider: 'divide-gray-100',
    rowHover: 'hover:bg-gray-50',
    iconBg: 'bg-gray-100',
    textMain: 'text-gray-900',
    textSub: 'text-gray-500',
    selectBg: 'bg-gray-100 border-gray-200 text-gray-900',
    toggleOn: 'bg-blue-600',
    toggleOff: 'bg-gray-300',
    deleteText: 'text-red-500 hover:text-red-700',
    deleteBg: 'bg-red-50',
  } : {
    sectionBorder: 'border-white/10',
    accent: 'text-neon-cyan',
    containerBg: 'bg-white/5 border-white/5',
    divider: 'divide-white/5',
    rowHover: 'hover:bg-white/5',
    iconBg: 'bg-white/5',
    textMain: 'text-white',
    textSub: 'text-gray-500',
    selectBg: 'bg-[#15171C]/60 border-white/10 text-white',
    toggleOn: 'bg-neon-cyan',
    toggleOff: 'bg-white/10',
    deleteText: 'text-red-500/60 hover:text-red-500',
    deleteBg: 'bg-red-500/10',
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/showcase';
  };

  return (
    <section className="space-y-4 text-left mt-8">
      <div className={`flex items-center gap-3 border-b-2 ${styles.sectionBorder} pb-2`}>
        <Lock size={16} className={styles.accent} />
        <h3 className={`text-xs font-black ${styles.textMain} uppercase tracking-[0.2em]`}>Terminal_De_Contrôle</h3>
      </div>

      <div className={`${styles.containerBg} rounded-[2rem] p-2 border divide-y ${styles.divider} space-y-0`}>

        {/* Saison */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center text-gray-500`}>
              <Calendar size={20} />
            </div>
            <p className={`text-xs font-black ${styles.textMain} uppercase italic`}>Saison Active</p>
          </div>
          <div className={`${styles.selectBg} rounded-xl px-4 py-2 text-[10px] font-black border opacity-60`}>
            2026-2027
          </div>
        </div>

        {/* Thème (Masqué si hideThemeToggle est true) */}
        {!hideThemeToggle && (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center ${isPro ? 'text-amber-500' : styles.accent}`}>
                {isPro ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <div className="text-left">
                <p className={`text-xs font-black ${styles.textMain} uppercase italic`}>Interface</p>
                <p className={`text-[8px] ${styles.textSub} font-bold uppercase`}>Mode {isPro ? "Classique" : "Nexus"}</p>
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === 'nexus' ? 'classic' : 'nexus')}
              className={`w-12 h-6 rounded-full relative transition-all border border-white/10 ${!isPro ? 'bg-neon-cyan' : 'bg-orange-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${isPro ? 'left-1' : 'left-6'}`} />
            </button>
          </div>
        )}

        {/* Push */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center text-red-500`}>
              <Bell size={20} />
            </div>
            <p className={`text-xs font-black ${styles.textMain} uppercase italic`}>Alertes Push</p>
          </div>
          <button
            onClick={() => setPushUrgence(!pushUrgence)}
            className={`w-10 h-5 rounded-full relative transition-all ${pushUrgence ? 'bg-green-500' : styles.toggleOff}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${pushUrgence ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Export RGPD - MODIFICATION : Div devenu Bouton interactif */}
        <button
          onClick={() => alert("📁 Export RGPD : Vos données sont en cours de préparation...")}
          className={`w-full p-4 flex items-center justify-between cursor-pointer ${styles.rowHover} transition-all`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center text-gray-500`}>
              <Download size={20} />
            </div>
            <p className={`text-xs font-black ${styles.textMain} uppercase italic`}>Exporter mes données</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* ADMIN : Fusion des clubs doublons */}
        {role === 'admin' && (
          <button
            onClick={() => router.push('/admin/clubs')}
            className={`w-full p-4 flex items-center justify-between ${styles.rowHover} transition-all`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center`}>
                <Merge size={20} className="text-orange-500" />
              </div>
              <div className="text-left">
                <p className={`text-xs font-black ${styles.textMain} uppercase italic`}>Fusion Clubs Doublons</p>
                <p className={`text-[9px] ${styles.textSub} font-bold uppercase`}>Admin uniquement</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        )}

        {/* LOGOUT - Remplacement de Delete par Logout sur le profil */}
        <button
          onClick={handleLogout}
          className={`w-full p-4 flex items-center gap-4 text-red-500 transition-colors rounded-b-[2rem] hover:bg-red-500/5`}
        >
          <div className={`w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center`}>
            <Trash2 size={20} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase italic">Me déconnecter</p>
          </div>
        </button>
      </div>
    </section>
  );
}