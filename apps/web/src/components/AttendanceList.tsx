"use client";

import { useCallback, useEffect, useState } from "react";
import { Car, Check, X } from "lucide-react";
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

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-2xl px-4 py-3">{error}</p>;
  if (!matches) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;
  if (matches.length === 0)
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="text-3xl" aria-hidden>📅</p>
        <p className="text-sm text-ink-soft font-medium">Aucun match prévu pour votre équipe.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const mine = match.myAttendance;
        const answerable = match.status === "scheduled";
        return (
          <MatchCard key={match.id} match={match}>
            {answerable ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-ink-soft">
                  {mine ? "Votre réponse (modifiable) :" : "Serez-vous là ?"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setAttendance(match.id, "present", {
                        canTransport: mine?.canTransport ?? false,
                        transportSeats: mine?.transportSeats ?? 0,
                      })
                    }
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition active:scale-[0.97]",
                      mine?.status === "present"
                        ? "bg-pitch text-white shadow-[0_6px_16px_-6px_rgba(22,163,74,0.5)]"
                        : "bg-paper text-ink-soft hover:bg-pitch-soft hover:text-pitch-deep",
                    )}
                  >
                    <Check size={16} /> Présent
                  </button>
                  <button
                    onClick={() => setAttendance(match.id, "absent")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition active:scale-[0.97]",
                      mine?.status === "absent"
                        ? "bg-coral text-white shadow-[0_6px_16px_-6px_rgba(239,68,68,0.5)]"
                        : "bg-paper text-ink-soft hover:bg-coral-soft hover:text-coral",
                    )}
                  >
                    <X size={16} /> Absent
                  </button>
                </div>

                {parentMode && mine?.status === "present" && (
                  <div className="bg-tangerine-soft/50 rounded-2xl px-4 py-3.5 space-y-2.5">
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <Car size={14} className="text-tangerine" /> Je peux emmener des joueurs
                    </p>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3, 4].map((seats) => (
                        <button
                          key={seats}
                          onClick={() =>
                            setAttendance(match.id, "present", { canTransport: seats > 0, transportSeats: seats })
                          }
                          className={cn(
                            "flex-1 h-10 rounded-xl text-sm font-black transition active:scale-90",
                            (mine.canTransport ? mine.transportSeats : 0) === seats
                              ? "bg-tangerine text-white shadow-sm"
                              : "bg-white text-ink-soft hover:text-tangerine",
                          )}
                          aria-label={seats === 0 ? "Pas de transport" : `${seats} place${seats > 1 ? "s" : ""}`}
                        >
                          {seats === 0 ? "–" : seats}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-ink-soft">Nombre de places dans votre voiture (– si indisponible)</p>
                  </div>
                )}
              </div>
            ) : (
              mine && (
                <p className="text-xs font-semibold text-ink-soft bg-paper rounded-2xl px-4 py-3">
                  Votre réponse : {mine.status === "present" ? "✅ présent" : "❌ absent"}
                  {parentMode && mine.canTransport && ` · 🚗 ${mine.transportSeats} place${mine.transportSeats > 1 ? "s" : ""}`}
                </p>
              )
            )}
          </MatchCard>
        );
      })}
    </div>
  );
}
