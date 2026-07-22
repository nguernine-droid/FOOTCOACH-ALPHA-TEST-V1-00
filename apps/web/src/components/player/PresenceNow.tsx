"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { TeamPresenceDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

const POLL_INTERVAL_MS = 10000;

/** Présents à l'instant t : statut de chaque coéquipier, rafraîchi par polling */
export function PresenceNow({ matchId, version = 0 }: { matchId: string; version?: number }) {
  const [rows, setRows] = useState<TeamPresenceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await api<TeamPresenceDto[]>(`/matches/${matchId}/presence`);
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur de chargement");
      }
    }
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [matchId, version]);

  if (error && !rows) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!rows) return <Skeleton className="h-40" />;

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const pending = rows.length - present - absent;

  return (
    <section className="card p-5 space-y-3 animate-rise-in" aria-label="Présents à l'instant t">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black">Présents à l&apos;instant t</h3>
        <span className="chip bg-blue-soft text-navy-700 shrink-0">
          {present} présent{present > 1 ? "s" : ""} · {absent} absent{absent > 1 ? "s" : ""} · {pending} sans réponse
        </span>
      </div>
      <p className="text-[10px] text-ink-soft -mt-1 flex items-center gap-1">
        <Lock size={10} className="shrink-0" /> Visible uniquement par ton équipe.
      </p>
      {rows.length === 0 && <p className="text-xs text-ink-soft">Aucun joueur dans l&apos;effectif pour l&apos;instant.</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.userId} className="flex items-center gap-3 text-sm bg-paper rounded-lg px-4 py-2.5">
            <span className="w-8 h-8 rounded-xl bg-sky text-white flex items-center justify-center text-[11px] font-black shrink-0">
              {r.firstName[0]}
              {r.lastName[0]}
            </span>
            <span className="flex-1 min-w-0 font-bold truncate">
              {r.firstName} {r.lastName}
              {r.jerseyNumber != null && <span className="text-ink-faint font-semibold"> · {r.jerseyNumber}</span>}
            </span>
            <span
              className={cn(
                "chip shrink-0",
                r.status === "present" && "bg-success-soft text-success",
                r.status === "absent" && "bg-coral-soft text-coral",
                r.status === null && "bg-paper border border-line text-ink-soft",
              )}
            >
              {r.status === "present" ? "Présent" : r.status === "absent" ? "Absent" : "Pas encore répondu"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
