'use client';

import React, { useState } from 'react';
import { Lock, Calendar, Moon, Sun, Bell, Download, Trash2, ChevronRight } from 'lucide-react';
import { useTeam } from '@/lib/context/TeamContext';
import { supabase } from '@/lib/supabase/client';

// On remplace forceCyber par hideThemeToggle (pour Parent & Supporter)
export function TerminalControl({ hideThemeToggle = false } : { hideThemeToggle?: boolean }) {
  const { theme, setTheme } = useTeam();
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
    selectBg: 'bg-black/40 border-white/10 text-white',
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
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className={`${styles.selectBg} rounded-xl p-2 text-xs font-black outline-none appearance-none cursor-pointer border`}
          >
            <option value="2026/2027">2026/2027</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2023/2024">2023/2024</option>
          </select>
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
              className={`w-10 h-5 rounded-full relative transition-all ${isPro ? styles.toggleOn : styles.toggleOff}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${isPro ? 'left-1' : 'left-6'}`} />
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