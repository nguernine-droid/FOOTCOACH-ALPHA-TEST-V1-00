"use client";

import { useCallback, useEffect, useState } from "react";
import { Car } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";

// Liste des matchs avec réponse de présence.
// parentMode : ajoute la proposition de transport (nombre de places).
export function AttendanceList({ parentMode }: { parentMode: boolean }) {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMatches(await api<MatchDto[]>("/matches"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setAttendance(
    matchId: string,
    status: "present" | "absent",
    transport?: { canTransport: boolean; transportSeats: number },
  ) {
    try {
      await api(`/matches/${matchId}/attendance`, {
        method: "PUT",
        body: JSON.stringify({ status, ...(parentMode ? transport : {}) }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer");
    }
  }

  if (error) return <p className="text-sm text-match-red">{error}</p>;
  if (!matches) return <p className="text-white/40 animate-soft-pulse text-sm">Chargement…</p>;
  if (matches.length === 0) return <p className="text-sm text-white/40">Aucun match prévu pour votre équipe.</p>;

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const mine = match.myAttendance;
        const answerable = match.status === "scheduled";
        return (
          <MatchCard key={match.id} match={match}>
            {answerable ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setAttendance(match.id, "present", {
                        canTransport: mine?.canTransport ?? false,
                        transportSeats: mine?.transportSeats ?? 0,
                      })
                    }
                    className={cn(
                      "py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wide transition",
                      mine?.status === "present"
                        ? "border-neon-green/60 bg-neon-green/15 text-neon-green"
                        : "border-white/10 text-white/50 hover:text-white hover:bg-white/5",
                    )}
                  >
                    Présent
                  </button>
                  <button
                    onClick={() => setAttendance(match.id, "absent")}
                    className={cn(
                      "py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wide transition",
                      mine?.status === "absent"
                        ? "border-match-red/60 bg-match-red/15 text-match-red"
                        : "border-white/10 text-white/50 hover:text-white hover:bg-white/5",
                    )}
                  >
                    Absent
                  </button>
                </div>

                {parentMode && mine?.status === "present" && (
                  <div className="flex items-center justify-between gap-3 border border-white/10 rounded-2xl px-4 py-3">
                    <span className="text-xs text-white/60 flex items-center gap-2">
                      <Car size={14} className="text-neon-cyan" /> Je peux transporter
                    </span>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3, 4].map((seats) => (
                        <button
                          key={seats}
                          onClick={() =>
                            setAttendance(match.id, "present", { canTransport: seats > 0, transportSeats: seats })
                          }
                          className={cn(
                            "w-8 h-8 rounded-xl border text-xs font-bold transition",
                            (mine.canTransport ? mine.transportSeats : 0) === seats
                              ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan"
                              : "border-white/10 text-white/40 hover:text-white",
                          )}
                          aria-label={seats === 0 ? "Pas de transport" : `${seats} places`}
                        >
                          {seats}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              mine && (
                <p className="text-xs pt-1 text-white/50">
                  Votre réponse : {mine.status === "present" ? "présent" : "absent"}
                  {parentMode && mine.canTransport && ` · ${mine.transportSeats} places de transport`}
                </p>
              )
            )}
          </MatchCard>
        );
      })}
    </div>
  );
}
