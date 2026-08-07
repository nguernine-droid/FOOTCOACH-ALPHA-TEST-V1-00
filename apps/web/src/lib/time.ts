"use client";

import { useEffect, useState } from "react";

/** Horloge partagée : une seule source de vérité pour tous les comptes à rebours d'une page. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function kickoffDate(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

/**
 * Le jour même, au format des dates de l'API (YYYY-MM-DD), dans le fuseau de
 * l'appareil — et non en UTC : à 23 h à Paris, `toISOString()` donnerait déjà
 * demain, et le match du soir serait rangé dans le passé.
 */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2j 4h", "1h 45m", "12m 30s" — null si l'échéance est passée. */
export function formatCountdown(ms: number): string | null {
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

/** Horodatage relatif : "À l'instant", "Il y a 12 min", "Il y a 3 h", "Hier", "Il y a 5 j" */
export function timeAgo(iso: string, now: Date): string {
  const min = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Hier" : `Il y a ${d} j`;
}
