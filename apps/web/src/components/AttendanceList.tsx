"use client";

import { useCallback, useEffect, useState } from "react";
import { Car, CalendarDays, Check, Lock, X } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api, getStoredUser } from "@/lib/api";
import { cn, groupMatches } from "@/lib/utils";
import { kickoffDate } from "@/lib/time";
import { MatchCard } from "@/components/MatchCard";
import { CarpoolSection } from "@/components/CarpoolSection";
import { TimeField } from "@/components/ui/TimeField";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

// Même règle que l'API : réponses figées 24h avant le coup d'envoi
const LOCK_MS = 24 * 3600 * 1000;

type TransportInput = {
  canTransport: boolean;
  transportSeats: number;
  departureTime?: string | null;
  departureArea?: string | null;
};

// Liste des matchs avec réponse de présence.
// parentMode : ajoute la proposition de transport (nombre de places).
// Le joueur voit les covoiturages et peut y réserver une place.
export function AttendanceList({ parentMode }: { parentMode: boolean }) {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const hasDriverInfo = getStoredUser()?.hasDriverInfo ?? false;

  const load = useCallback(async () => {
    try {
      setMatches(await api<MatchDto[]>("/matches"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  async function setAttendance(matchId: string, status: "present" | "absent", transport?: TransportInput) {
    setError(null);
    try {
      await api(`/matches/${matchId}/attendance`, {
        method: "PUT",
        body: JSON.stringify({ status, ...(parentMode ? transport : {}) }),
      });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer");
    }
  }

  if (error && !matches) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!matches) return <CardGridSkeleton cards={2} />;
  if (matches.length === 0)
    return (
      <div className="card p-8 text-center space-y-2">
        <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center mx-auto">
          <CalendarDays size={22} />
        </span>
        <p className="text-sm text-ink-soft font-medium">Aucun match prévu pour votre équipe.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}
      {groupMatches(matches).map((section) => (
      <div key={section.key} className="space-y-3">
      <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1 pt-2">{section.label}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
        {section.items.map((match) => {
          const mine = match.myAttendance;
          const locked = kickoffDate(match.date, match.time).getTime() - Date.now() < LOCK_MS;
          const answerable = match.status === "scheduled" && !locked;
          return (
            <MatchCard key={match.id} match={match}>
              {match.status === "scheduled" && locked && (
                <p className="text-xs font-semibold text-ink-soft bg-paper rounded-lg px-4 py-3 flex items-center gap-1.5">
                  <Lock size={12} className="shrink-0" />
                  Réponses verrouillées 24h avant le coup d&apos;envoi
                  {mine && ` — votre réponse : ${mine.status === "present" ? "présent" : "absent"}`}.
                </p>
              )}
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
                          departureTime: mine?.departureTime,
                          departureArea: mine?.departureArea,
                        })
                      }
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition active:scale-[0.97]",
                        mine?.status === "present"
                          ? "bg-success text-white shadow-[0_4px_12px_-4px_rgba(30,158,88,0.5)]"
                          : "bg-paper text-ink-soft hover:bg-success-soft hover:text-success",
                      )}
                    >
                      <Check size={16} /> Présent
                    </button>
                    <button
                      onClick={() => setAttendance(match.id, "absent")}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition active:scale-[0.97]",
                        mine?.status === "absent"
                          ? "bg-coral text-white shadow-[0_6px_16px_-6px_rgba(239,68,68,0.5)]"
                          : "bg-paper text-ink-soft hover:bg-coral-soft hover:text-coral",
                      )}
                    >
                      <X size={16} /> Absent
                    </button>
                  </div>

                  {parentMode &&
                    mine?.status === "present" &&
                    (hasDriverInfo ? (
                      <div className="bg-tangerine-soft/50 rounded-lg px-4 py-3.5 space-y-2.5">
                        <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <Car size={14} className="text-tangerine" /> Je peux emmener des joueurs
                        </p>
                        <div className="flex items-center gap-2">
                          {[0, 1, 2, 3, 4].map((seats) => (
                            <button
                              key={seats}
                              onClick={() =>
                                setAttendance(match.id, "present", {
                                  canTransport: seats > 0,
                                  transportSeats: seats,
                                  departureTime: mine.departureTime,
                                  departureArea: mine.departureArea,
                                })
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

                        {mine.canTransport && mine.transportSeats > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-ink-soft">Heure de départ</p>
                              <TimeField
                                value={mine.departureTime ?? ""}
                                onChange={(v) =>
                                  setAttendance(match.id, "present", {
                                    canTransport: true,
                                    transportSeats: mine.transportSeats,
                                    departureTime: v,
                                    departureArea: mine.departureArea,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-ink-soft" htmlFor={`area-${match.id}`}>
                                Quartier de départ
                              </label>
                              <input
                                id={`area-${match.id}`}
                                defaultValue={mine.departureArea ?? ""}
                                onBlur={(e) => {
                                  const value = e.target.value.trim() || null;
                                  if (value !== (mine.departureArea ?? null)) {
                                    setAttendance(match.id, "present", {
                                      canTransport: true,
                                      transportSeats: mine.transportSeats,
                                      departureTime: mine.departureTime,
                                      departureArea: value,
                                    });
                                  }
                                }}
                                className="field"
                                placeholder="Croix-Rousse"
                                maxLength={80}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-ink-soft bg-sun-soft/60 rounded-lg px-4 py-3">
                        Pour proposer un covoiturage, renseignez d&apos;abord votre plaque et votre permis dans la carte
                        « Mes infos conducteur ».
                      </p>
                    ))}

                  <CarpoolSection key={version} matchId={match.id} canBook={!parentMode} onChange={() => setVersion((v) => v + 1)} />
                </div>
              ) : (
                mine && (
                  <p className="text-xs font-semibold text-ink-soft bg-paper rounded-lg px-4 py-3">
                    Votre réponse : {mine.status === "present" ? "présent" : "absent"}
                    {parentMode && mine.canTransport && ` · covoiturage : ${mine.transportSeats} place${mine.transportSeats > 1 ? "s" : ""} proposée${mine.transportSeats > 1 ? "s" : ""}`}
                  </p>
                )
              )}
            </MatchCard>
          );
        })}
      </div>
      </div>
      ))}
    </div>
  );
}
