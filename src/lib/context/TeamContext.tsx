'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  coachName: string;
  coachPhoto?: string;
  clubLogo?: string;
  userFirstName?: string;
  userLastName?: string;
  bio?: string;
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
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('coach');
  const [theme, setThemeState] = useState<Theme>('classic');
  const [teamInfo, setTeamInfoState] = useState<TeamInfo>({
    clubName: 'MON CLUB',
    category: 'SÉNIORS',
    coachName: 'COACH',
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*, clubs(*)')
          .eq('id', user.id)
          .single();

        if (profile && !pError) {
          setRoleState(profile.role as Role);
          setThemeState(profile.theme_preference as Theme || 'classic');

          if (profile.clubs) {
            setTeamInfoState({
              id: profile.clubs.id,
              clubName: profile.clubs.name,
              category: profile.clubs.category,
              coachName: profile.nickname || profile.first_name || 'COACH',
              coachPhoto: profile.avatar_url,
              clubLogo: profile.clubs.logo_url,
              userFirstName: profile.first_name,
              userLastName: profile.last_name,
              bio: profile.bio
            });
          } else {
            setTeamInfoState(prev => ({
              ...prev,
              coachName: profile.nickname || profile.first_name || 'COACH',
              coachPhoto: profile.avatar_url,
              userFirstName: profile.first_name,
              userLastName: profile.last_name,
              bio: profile.bio
            }));
          }

          // Sync LocalStorage pour le Guard
          localStorage.setItem('user_role', profile.role);
          localStorage.setItem('app_theme', profile.theme_preference || 'classic');
        }
      } else {
        // Fallback local if no user
        const savedRole = localStorage.getItem('user_role') as Role | null;
        const savedTheme = localStorage.getItem('app_theme') as Theme | null;
        if (savedRole) setRoleState(savedRole);
        if (savedTheme) setThemeState(savedTheme);
      }
    } catch (err) {
      console.error("Erreur refreshData:", err);
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const setTeamInfo = (info: TeamInfo) => {
    setTeamInfoState(info);
    localStorage.setItem('team_info', JSON.stringify(info));
  };

  const isPro = theme === 'classic';

  if (!isHydrated) return null;

  return (
    <TeamContext.Provider value={{
      role, setRole, theme, setTheme, teamInfo, setTeamInfo, isPro, refreshData, isLoading
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
