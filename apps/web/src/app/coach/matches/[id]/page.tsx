"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Car, Minus, Plus, Trash2 } from "lucide-react";
import type { AttendanceDto, MatchDetailDto, MatchEventType, MatchSide } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";

const EVENT_TYPES: { value: MatchEventType; label: string; emoji: string }[] = [
  { value: "goal", label: "But", emoji: "⚽" },
  { value: "card", label: "Carton", emoji: "🟨" },
  { value: "substitution", label: "Remplacement", emoji: "🔄" },
  { value: "highlight", label: "Temps fort", emoji: "✨" },
];

const EVENT_EMOJI: Record<MatchEventType, string> = {
  goal: "⚽",
  card: "🟨",
  substitution: "🔄",
  highlight: "✨",
};

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

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-2xl px-4 py-3">{error}</p>;
  if (!match) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;

  const transporters = attendances.filter((a) => a.canTransport && a.transportSeats > 0);

  return (
    <div className="space-y-4">
      <Link href="/coach" className="text-xs font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> Mes matchs
      </Link>

      <MatchCard match={match} />

      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-black">Score</h3>
        <div className="grid grid-cols-2 gap-3">
          {([["home", match.homeTeam.name], ["away", match.awayTeam.name]] as const).map(([side, name]) => (
            <div key={side} className="bg-paper rounded-2xl p-4 space-y-3 text-center">
              <p className="text-xs font-bold text-ink-soft truncate">{name}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => updateScore(side === "home" ? -1 : 0, side === "away" ? -1 : 0)}
                  className="w-9 h-9 rounded-xl bg-white border border-line text-ink-soft hover:text-ink flex items-center justify-center transition active:scale-90"
                  aria-label={`Retirer un but (${name})`}
                >
                  <Minus size={15} />
                </button>
                <span className="text-3xl font-black tabular-nums w-10">
                  {side === "home" ? match.homeScore : match.awayScore}
                </span>
                <button
                  onClick={() => updateScore(side === "home" ? 1 : 0, side === "away" ? 1 : 0)}
                  className="w-9 h-9 rounded-xl bg-pitch text-white flex items-center justify-center transition active:scale-90 shadow-sm"
                  aria-label={`Ajouter un but (${name})`}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {match.status === "scheduled" && (
          <Button className="w-full" onClick={() => setStatus("live")}>
            🏁 Coup d&apos;envoi !
          </Button>
        )}
        {match.status === "live" && (
          <Button variant="accent" className="w-full" onClick={() => setStatus("finished")}>
            ⏱️ Coup de sifflet final
          </Button>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h3 className="text-sm font-black">Temps forts</h3>
        {match.events.length === 0 && <p className="text-xs text-ink-soft">Aucun temps fort pour l&apos;instant.</p>}
        {match.events.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 text-sm bg-paper rounded-2xl px-4 py-3">
            <span className="text-pitch-deep font-black tabular-nums text-xs bg-pitch-soft rounded-full px-2.5 py-1 shrink-0">
              {ev.minute}&apos;
            </span>
            <span aria-hidden>{EVENT_EMOJI[ev.type]}</span>
            <span className="flex-1 min-w-0">
              <span className="font-semibold">{ev.description}</span>
              <span className="text-ink-soft text-xs"> · {ev.side === "home" ? match.homeTeam.name : match.awayTeam.name}</span>
            </span>
            <button onClick={() => deleteEvent(ev.id)} className="text-ink-soft/50 hover:text-coral transition shrink-0" aria-label="Supprimer">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <form onSubmit={addEvent} className="space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setEventForm((f) => ({ ...f, type: t.value }))}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold border transition",
                  eventForm.type === t.value
                    ? "bg-pitch text-white border-pitch shadow-sm"
                    : "bg-white text-ink-soft border-line hover:border-pitch/40",
                )}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min={0}
              max={150}
              required
              placeholder="Minute"
              value={eventForm.minute}
              onChange={(e) => setEventForm((f) => ({ ...f, minute: e.target.value }))}
              className="field"
            />
            <select
              value={eventForm.side}
              onChange={(e) => setEventForm((f) => ({ ...f, side: e.target.value as MatchSide }))}
              className="field col-span-2"
            >
              <option value="home">{match.homeTeam.name}</option>
              <option value="away">{match.awayTeam.name}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              required
              placeholder="Ex : But de Paul sur corner"
              value={eventForm.description}
              onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
              className="field flex-1"
            />
            <Button type="submit" size="md">Ajouter</Button>
          </div>
        </form>
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black">Présences</h3>
          <span className="chip bg-pitch-soft text-pitch-deep">
            {match.presentCount} ✓ · {match.absentCount} ✗
          </span>
        </div>
        {attendances.length === 0 && <p className="text-xs text-ink-soft">Personne n&apos;a encore répondu.</p>}
        {attendances.map((a) => (
          <div key={a.userId} className="flex items-center gap-3 text-sm bg-paper rounded-2xl px-4 py-3">
            <span
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0",
                a.role === "parent" ? "bg-tangerine" : "bg-sky",
              )}
            >
              {a.firstName[0]}
              {a.lastName[0]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="font-bold block truncate">
                {a.firstName} {a.lastName}
              </span>
              <span className="text-xs text-ink-soft">{a.role === "player" ? "Joueur" : a.role === "parent" ? "Parent" : a.role}</span>
            </span>
            {a.canTransport && a.transportSeats > 0 && (
              <span className="chip bg-tangerine-soft text-tangerine shrink-0">
                <Car size={12} /> {a.transportSeats} pl.
              </span>
            )}
            <span className={cn("chip shrink-0", a.status === "present" ? "bg-pitch-soft text-pitch-deep" : "bg-coral-soft text-coral")}>
              {a.status === "present" ? "Présent" : "Absent"}
            </span>
          </div>
        ))}
        {transporters.length > 0 && (
          <p className="text-xs text-ink-soft font-semibold bg-tangerine-soft/50 rounded-2xl px-4 py-3">
            🚗 {transporters.reduce((s, t) => s + t.transportSeats, 0)} places de covoiturage au total ({transporters.map((t) => t.firstName).join(", ")})
          </p>
        )}
      </section>
    </div>
  );
}
