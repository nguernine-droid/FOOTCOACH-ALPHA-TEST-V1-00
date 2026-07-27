import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MatchStatus } from "@footcoach/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MatchLike {
  status: MatchStatus;
  date: string;
  time: string;
}

// Sépare les matchs : en cours, score à valider, à venir, passés
export function groupMatches<T extends MatchLike>(matches: T[]) {
  const byKickoff = (a: T, b: T) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
  return [
    { key: "live", label: "En ce moment", items: matches.filter((m) => m.status === "live") },
    {
      key: "toConfirm",
      label: "Score à valider",
      items: matches.filter((m) => m.status === "awaiting_confirmation").sort(byKickoff).reverse(),
    },
    { key: "upcoming", label: "À venir", items: matches.filter((m) => m.status === "scheduled").sort(byKickoff) },
    { key: "past", label: "Matchs passés", items: matches.filter((m) => m.status === "finished").sort(byKickoff).reverse() },
  ].filter((s) => s.items.length > 0);
}

// Groupes de la vue liste de l'agenda (les occurrences passées ne sont pas listées)
export function groupAgendaItems<T extends { occurrenceDate: string }>(items: T[], todayIso: string) {
  const tomorrow = new Date(new Date(`${todayIso}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
  const weekEnd = new Date(new Date(`${todayIso}T12:00:00Z`).getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const upcoming = items.filter((i) => i.occurrenceDate >= todayIso);
  return [
    { key: "today", label: "Aujourd'hui", items: upcoming.filter((i) => i.occurrenceDate === todayIso) },
    { key: "tomorrow", label: "Demain", items: upcoming.filter((i) => i.occurrenceDate === tomorrow) },
    {
      key: "week",
      label: "Cette semaine",
      items: upcoming.filter((i) => i.occurrenceDate > tomorrow && i.occurrenceDate <= weekEnd),
    },
    { key: "later", label: "Plus tard", items: upcoming.filter((i) => i.occurrenceDate > weekEnd) },
  ].filter((g) => g.items.length > 0);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
