import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MatchLike {
  status: "scheduled" | "live" | "finished";
  date: string;
  time: string;
}

// Sépare les matchs : en cours, à venir (du plus proche au plus lointain), passés
export function groupMatches<T extends MatchLike>(matches: T[]) {
  const byKickoff = (a: T, b: T) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
  return [
    { key: "live", label: "🔴 En ce moment", items: matches.filter((m) => m.status === "live") },
    { key: "upcoming", label: "📅 À venir", items: matches.filter((m) => m.status === "scheduled").sort(byKickoff) },
    { key: "past", label: "✅ Matchs passés", items: matches.filter((m) => m.status === "finished").sort(byKickoff).reverse() },
  ].filter((s) => s.items.length > 0);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
