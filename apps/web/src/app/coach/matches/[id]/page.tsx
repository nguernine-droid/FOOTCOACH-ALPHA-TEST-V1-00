"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Car, Goal, Minus, Plus, Trash2 } from "lucide-react";
import type { AttendanceDto, MatchDetailDto, MatchEventType, MatchSide } from "@footcoach/shared";
import { api } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import { NeonButton } from "@/components/ui/NeonButton";

const EVENT_TYPES: { value: MatchEventType; label: string }[] = [
  { value: "goal", label: "But" },
  { value: "card", label: "Carton" },
  { value: "substitution", label: "Remplacement" },
  { value: "highlight", label: "Temps fort" },
];

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-neon-orange/60 [color-scheme:dark]";

export default function CoachMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetailDto | null>(null);
  const [attendances, setAttendances] = useState<AttendanceDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<{ minute: string; type: MatchEventType; side: MatchSide; description: string }>({
    minute: "",
    type: "goal",
    side: "home",
    description: "",
  });

  const load = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([
        api<MatchDetailDto>(`/matches/${id}`),
        api<AttendanceDto[]>(`/matches/${id}/attendances`),
      ]);
      setMatch(m);
      setAttendances(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateScore(homeDelta: number, awayDelta: number) {
    if (!match) return;
    await api(`/matches/${id}/score`, {
      method: "PATCH",
      body: JSON.stringify({
        homeScore: Math.max(0, match.homeScore + homeDelta),
        awayScore: Math.max(0, match.awayScore + awayDelta),
      }),
    });
    load();
  }

  async function setStatus(status: "live" | "finished") {
    if (!match) return;
    await api(`/matches/${id}/score`, {
      method: "PATCH",
      body: JSON.stringify({ homeScore: match.homeScore, awayScore: match.awayScore, status }),
    });
    load();
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    await api(`/matches/${id}/events`, {
      method: "POST",
      body: JSON.stringify({ ...eventForm, minute: Number(eventForm.minute) }),
    });
    setEventForm((f) => ({ ...f, minute: "", description: "" }));
    load();
  }

  async function deleteEvent(eventId: string) {
    await api(`/matches/${id}/events/${eventId}`, { method: "DELETE" });
    load();
  }

  if (error) return <p className="text-sm text-match-red">{error}</p>;
  if (!match) return <p className="text-white/40 animate-soft-pulse text-sm">Chargement…</p>;

  const transporters = attendances.filter((a) => a.canTransport && a.transportSeats > 0);

  return (
    <div className="space-y-6">
      <MatchCard match={match} />

      <section className="card-cyber p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Score & statut</h3>
        <div className="grid grid-cols-2 gap-3">
          {([["home", match.homeTeam.name], ["away", match.awayTeam.name]] as const).map(([side, name]) => (
            <div key={side} className="space-y-2 text-center">
              <p className="text-xs text-white/50 truncate">{name}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => updateScore(side === "home" ? -1 : 0, side === "away" ? -1 : 0)}
                  className="p-2 rounded-xl border border-white/10 text-white/50 hover:text-white"
                  aria-label={`Retirer un but (${name})`}
                >
                  <Minus size={14} />
                </button>
                <span className="text-2xl font-black tabular-nums">{side === "home" ? match.homeScore : match.awayScore}</span>
                <button
                  onClick={() => updateScore(side === "home" ? 1 : 0, side === "away" ? 1 : 0)}
                  className="p-2 rounded-xl border border-neon-green/40 bg-neon-green/10 text-neon-green"
                  aria-label={`Ajouter un but (${name})`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {match.status === "scheduled" && (
            <NeonButton size="sm" variant="green" className="flex-1" onClick={() => setStatus("live")}>
              Coup d&apos;envoi
            </NeonButton>
          )}
          {match.status === "live" && (
            <NeonButton size="sm" variant="magenta" className="flex-1" onClick={() => setStatus("finished")}>
              Coup de sifflet final
            </NeonButton>
          )}
        </div>
      </section>

      <section className="card-cyber p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
          <Goal size={14} className="text-neon-orange" /> Temps forts
        </h3>
        {match.events.length === 0 && <p className="text-xs text-white/40">Aucun temps fort saisi.</p>}
        {match.events.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 text-sm border-b border-white/5 pb-2 last:border-0">
            <span className="text-neon-orange font-black tabular-nums w-9">{ev.minute}&apos;</span>
            <span className="flex-1">
              {ev.description}
              <span className="text-white/40 text-xs"> · {ev.side === "home" ? match.homeTeam.name : match.awayTeam.name}</span>
            </span>
            <button onClick={() => deleteEvent(ev.id)} className="text-white/30 hover:text-match-red" aria-label="Supprimer">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <form onSubmit={addEvent} className="grid grid-cols-4 gap-2 pt-2">
          <input
            type="number"
            min={0}
            max={150}
            required
            placeholder="Min"
            value={eventForm.minute}
            onChange={(e) => setEventForm((f) => ({ ...f, minute: e.target.value }))}
            className={inputClass}
          />
          <select
            value={eventForm.type}
            onChange={(e) => setEventForm((f) => ({ ...f, type: e.target.value as MatchEventType }))}
            className={inputClass}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-dark-card">{t.label}</option>
            ))}
          </select>
          <select
            value={eventForm.side}
            onChange={(e) => setEventForm((f) => ({ ...f, side: e.target.value as MatchSide }))}
            className={`${inputClass} col-span-2`}
          >
            <option value="home" className="bg-dark-card">{match.homeTeam.name}</option>
            <option value="away" className="bg-dark-card">{match.awayTeam.name}</option>
          </select>
          <input
            required
            placeholder="Description (ex : But de Paul sur corner)"
            value={eventForm.description}
            onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
            className={`${inputClass} col-span-3`}
          />
          <NeonButton type="submit" size="sm">Ajouter</NeonButton>
        </form>
      </section>

      <section className="card-cyber p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
          Présences ({match.presentCount} présent{match.presentCount > 1 ? "s" : ""}, {match.absentCount} absent{match.absentCount > 1 ? "s" : ""})
        </h3>
        {attendances.length === 0 && <p className="text-xs text-white/40">Personne n&apos;a encore répondu.</p>}
        {attendances.map((a) => (
          <div key={a.userId} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
            <span>
              {a.firstName} {a.lastName}
              <span className="text-white/40 text-xs"> · {a.role === "player" ? "joueur" : a.role === "parent" ? "parent" : a.role}</span>
            </span>
            <span className="flex items-center gap-2">
              {a.canTransport && a.transportSeats > 0 && (
                <span className="text-xs text-neon-cyan flex items-center gap-1">
                  <Car size={13} /> {a.transportSeats} pl.
                </span>
              )}
              <span className={a.status === "present" ? "text-neon-green text-xs font-bold" : "text-match-red text-xs font-bold"}>
                {a.status === "present" ? "Présent" : "Absent"}
              </span>
            </span>
          </div>
        ))}
        {transporters.length > 0 && (
          <p className="text-xs text-white/50 pt-1">
            Total transport : {transporters.reduce((s, t) => s + t.transportSeats, 0)} places ({transporters.map((t) => t.firstName).join(", ")})
          </p>
        )}
      </section>
    </div>
  );
}
