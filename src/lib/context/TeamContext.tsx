'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type Role = 'coach' | 'player' | 'parent' | 'supporter';
export type Theme = 'nexus' | 'classic';

export interface TeamInfo {
  id?: string;
  clubName: string;
  category: string;
  level: string;
  coachName: string;
  coachPhoto?: string;
  clubLogo?: string;
  clubCity?: string;
  clubStadium?: string;
  userFirstName?: string;
  userLastName?: string;
  bio?: string;
  phone?: string;
  // RPG Stats
  doctrine: number;
  synergie: number;
  influence: number;
  lvl: number;
  xp: number;
  grade: string;
}

interface TeamContextType {
  role: Role;
  setRole: (role: Role) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  teamInfo: TeamInfo;
  setTeamInfo: (info: TeamInfo) => void;
  isPro: boolean;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  isProfileComplete: boolean;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (seen: boolean) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('coach');
  const [theme, setThemeState] = useState<Theme>('classic');
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [teamInfo, setTeamInfoState] = useState<TeamInfo>({
    clubName: 'UNITE_NEXUS',
    category: 'SÉNIORS',
    level: 'D1',
    coachName: 'COACH',
    doctrine: 0,
    synergie: 0,
    influence: 0,
    lvl: 1,
    xp: 0,
    grade: 'NOVICE'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Priorité au LocalStorage
      const savedRole = localStorage.getItem('user_role') as Role | null;
      const savedTheme = localStorage.getItem('app_theme') as Theme | null;
      const savedSeen = localStorage.getItem('has_seen_welcome') === 'true';
      if (savedRole) setRoleState(savedRole);
      if (savedTheme) setThemeState(savedTheme);
      setHasSeenWelcomeState(savedSeen);

      if (user) {
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*, clubs(*)')
          .eq('id', user.id)
          .single();

        if (profile && !pError) {
          setRoleState(profile.role as Role);
          setThemeState(profile.theme_preference as Theme || 'classic');

          // Statut du profil
          const isComplete = !!(profile.first_name && profile.last_name && profile.club_id);
          setIsProfileComplete(isComplete);

          setTeamInfoState({
            id: profile.clubs?.id,
            clubName: profile.clubs?.name || 'MON CLUB',
            category: profile.coach_category || profile.clubs?.category || 'SÉNIORS',
            level: profile.coach_level || 'D1',
            coachName: profile.nickname || profile.first_name || 'COACH',
            coachPhoto: profile.avatar_url,
            clubLogo: profile.clubs?.logo_url,
            clubCity: profile.clubs?.city,
            clubStadium: profile.clubs?.stadium,
            userFirstName: profile.first_name,
            userLastName: profile.last_name,
            bio: profile.bio,
            phone: profile.phone,
            doctrine: profile.coach_doctrine || 0,
            synergie: profile.coach_synergie || 0,
            influence: profile.coach_influence || 0,
            lvl: profile.coach_lvl || 1,
            xp: profile.coach_xp || 0,
            grade: profile.coach_grade || (profile.theme_preference === 'classic' ? 'COACH' : 'COMMANDANT')
          });
        }
      }
    } catch (err) {
      console.error("Context Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setHasSeenWelcome = (seen: boolean) => {
    setHasSeenWelcomeState(seen);
    localStorage.setItem('has_seen_welcome', seen ? 'true' : 'false');
  };

  useEffect(() => {
    refreshData();

    // --- NOUVEAU : NEXUS DATA PULSE (Toutes les 5mn sur raccourci) ---
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (isStandalone) {
      const pulseInterval = setInterval(() => {
        console.log("📡 Nexus Data Pulse: Synchronisation des données clubs...");
        refreshData();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(pulseInterval);
    }
  }, [refreshData]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);

    // Mise à jour réelle dans Supabase pour la persistance
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);
    }
  };

  const setTeamInfo = (info: TeamInfo) => {
    setTeamInfoState(info);
  };

  const isPro = theme === 'classic';

  return (
    <TeamContext.Provider value={{
      role, setRole, theme, setTheme, teamInfo, setTeamInfo, isPro, refreshData, isLoading, isProfileComplete,
      hasSeenWelcome, setHasSeenWelcome
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
};
