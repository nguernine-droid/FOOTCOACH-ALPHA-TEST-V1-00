'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export type Role = 'coach' | 'player' | 'parent' | 'supporter' | 'admin';
export type Theme = 'nexus' | 'classic';

export interface TeamInfo {
  id?: string;
  coachId?: string;
  clubName: string;
  category: string;
  level: string;
  coachName: string;
  coachPhoto?: string;
  clubLogo?: string;
  clubAcronym?: string;
  clubCity?: string;
  clubStadium?: string;
  latitude?: number;
  longitude?: number;
  userFirstName?: string;
  userLastName?: string;
  bio?: string;
  phone?: string;
  licenseNumber?: string;
  doctrine: number;
  synergie: number;
  influence: number;
  lvl: number;
  xp: number;
  grade: string;
  coachStatus?: 'inactif' | 'actif' | 'toujours_pret';
  coachGrade?: 'Coach engagé' | 'Coach contributeur' | 'Coach ambassadeur';
  refCategories?: string[];
  matchDistMax?: number;
  plateauDistMax?: number;
  tournamentReach?: 'departemental' | 'regional' | 'national' | 'distance';
  tournamentDistMax?: number;
}

interface TeamContextType {
  session: Session | null;
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
  switchRole: (role: Role) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRoleState] = useState<Role>('coach');
  const [theme, setThemeState] = useState<Theme>('classic');
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [teamInfo, setTeamInfoState] = useState<TeamInfo>({
    clubName: 'MON CLUB',
    category: 'SÉNIORS',
    level: 'D1',
    coachName: 'COACH',
    doctrine: 0,
    synergie: 0,
    influence: 0,
    lvl: 1,
    xp: 0,
    grade: 'COACH'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // 0. Restauration de la préférence "welcome déjà vu" (sinon l'écran de bienvenue
  // réapparaît à chaque rechargement de page tant que le profil n'est pas complet).
  useEffect(() => {
    setHasSeenWelcomeState(localStorage.getItem('has_seen_welcome') === 'true');
  }, []);

  // 1. GESTION DE SESSION & PERSISTANCE DU ROLE (FIX ANTI-AMNÉSIE)
  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Restaurer le rôle sauvegardé
        const savedRole = localStorage.getItem('nexus_active_role') as Role;
        if (savedRole) setRoleState(savedRole);
        refreshData();
      } else {
        setIsLoading(false);
      }
    });

    // Écouteur de changement (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        refreshData();
      } else {
        localStorage.removeItem('nexus_active_role');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*, clubs:club_id (*)')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Si aucun rôle n'est stocké en local, on prend celui de la DB
        if (!localStorage.getItem('nexus_active_role')) {
          setRoleState(profile.role as Role);
          localStorage.setItem('nexus_active_role', profile.role);
        }

        setThemeState(profile.theme_preference as Theme || 'classic');
        setIsProfileComplete(!!(profile.first_name && profile.last_name));

        setTeamInfoState({
          id: profile.clubs?.id,
          coachId: profile.id,
          clubName: profile.clubs?.name || 'MON CLUB',
          category: profile.coach_category || 'SÉNIORS',
          level: profile.coach_level || 'D1',
          coachName: (profile.nickname && profile.nickname !== 'COACH') ? profile.nickname : (profile.first_name || 'COACH'),
          coachPhoto: profile.avatar_url,
          clubLogo: profile.clubs?.logo_url,
          clubAcronym: profile.clubs?.acronym || '',
          clubCity: profile.clubs?.city || '',
          clubStadium: profile.clubs?.stadium || '',
          latitude: profile.clubs?.latitude,
          longitude: profile.clubs?.longitude,
          userFirstName: profile.first_name || '',
          userLastName: profile.last_name || '',
          bio: profile.bio || '',
          phone: profile.phone || '',
          licenseNumber: profile.license_number || '',
          doctrine: profile.coach_doctrine || 0,
          synergie: profile.coach_synergie || 0,
          influence: profile.coach_influence || 0,
          lvl: profile.coach_lvl || 1,
          xp: profile.coach_xp || 0,
          grade: profile.coach_grade || 'COACH ENGAGÉ',
          coachStatus: profile.coach_status || 'actif',
          refCategories: profile.ref_categories || [],
          matchDistMax: profile.match_dist_max || 30,
          plateauDistMax: profile.plateau_dist_max || 20,
          tournamentReach: profile.tournament_reach || 'departemental',
          tournamentDistMax: profile.tournament_dist_max || 50
        });
      }
    } catch (err) {
      console.error("Critical Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('nexus_active_role', newRole);
  };

  const setRole = (newRole: Role) => switchRole(newRole);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ theme_preference: newTheme }).eq('id', user.id);
  };

  const setHasSeenWelcome = (seen: boolean) => {
    setHasSeenWelcomeState(seen);
    localStorage.setItem('has_seen_welcome', seen ? 'true' : 'false');
  };

  const setTeamInfo = (info: TeamInfo) => { setTeamInfoState(info); };
  const isPro = theme === 'classic';

  return (
    <TeamContext.Provider value={{
      session, role, setRole, theme, setTheme, teamInfo, setTeamInfo, isPro, refreshData, isLoading, isProfileComplete,
      hasSeenWelcome, setHasSeenWelcome, switchRole
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
