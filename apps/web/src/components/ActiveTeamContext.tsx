"use client";

import { createContext, useContext } from "react";
import type { CoachTeamDto } from "@footcoach/shared";

export interface ActiveTeamValue {
  /** Toutes les équipes encadrées par le coach (principale en premier) */
  teams: CoachTeamDto[];
  activeTeamId: string | null;
  activeTeam: CoachTeamDto | null;
  setActiveTeam: (teamId: string) => void;
}

export const ActiveTeamContext = createContext<ActiveTeamValue | null>(null);

/** Équipe active du coach. À n'utiliser que dans l'espace coach (fourni par RoleGuard). */
export function useActiveTeam(): ActiveTeamValue {
  const value = useContext(ActiveTeamContext);
  if (!value) throw new Error("useActiveTeam doit être utilisé dans l'espace coach");
  return value;
}
