import type { LucideIcon } from "lucide-react";
import { CalendarDays, Dumbbell, Medal, Trophy, Users } from "lucide-react";
import type { EventType } from "@teamnexus/shared";

/** Couleur + icône par type d'événement — même langage visuel pour les trois rôles */
export const EVENT_TYPE_META: Record<EventType, { label: string; icon: LucideIcon; dot: string; chip: string }> = {
  match: { label: "Match", icon: Trophy, dot: "bg-blue", chip: "bg-blue-soft text-blue" },
  entrainement: { label: "Entraînement", icon: Dumbbell, dot: "bg-success", chip: "bg-success-soft text-success" },
  tournoi: { label: "Tournoi", icon: Medal, dot: "bg-gold", chip: "bg-sun-soft text-sun" },
  reunion: { label: "Réunion", icon: Users, dot: "bg-navy-700", chip: "bg-navy-700 text-white" },
  autre: { label: "Autre", icon: CalendarDays, dot: "bg-ink-faint", chip: "bg-paper text-ink-soft" },
};

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(`${iso}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
}
