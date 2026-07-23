"use client";

import { useState } from "react";
import { CalendarDays, Check, Lock, MapPin, X } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { formatCountdown, kickoffDate, useNow } from "@/lib/time";
import { teamColor, teamInitials } from "@/components/MatchCard";

const LOCK_MS = 24 * 3600 * 1000;

function TeamSide({ team }: { team: MatchDto["homeTeam"] }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <span className={cn("w-14 h-14 rounded-full flex items-center justify-center text-base font-black text-white", teamColor(team))}>
        {teamInitials(team.name)}
      </span>
      <p className="text-xs font-bold text-center leading-tight truncate w-full">{team.name}</p>
    </div>
  );
}

/**
 * Carte "Ta convocation" : le prochain match du joueur avec réponse
 * Présent/Absent. Les réponses sont verrouillées 24h avant le coup d'envoi
 * (même règle que l'API).
 */
export function ConvocationCard({ match, onChanged }: { match: MatchDto; onChanged: () => void }) {
  const now = useNow(1000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kickoff = kickoffDate(match.date, match.time);
  const countdown = formatCountdown(kickoff.getTime() - now.getTime());
  const mine = match.myAttendance;
  const started = kickoff.getTime() - now.getTime() <= 0;
  const inLockWindow = kickoff.getTime() - now.getTime() < LOCK_MS;
  // Une réponse déjà donnée est figée à moins de 24h ; une première réponse
  // reste possible jusqu'au coup d'envoi (match créé tardivement)
  const locked = match.status !== "scheduled" || started || (inLockWindow && mine != null);

  async function answer(status: "present" | "absent") {
    if (mine?.status === status) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/matches/${match.id}/attendance`, { method: "PUT", body: JSON.stringify({ status }) });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 space-y-4 animate-rise-in" aria-label="Ta convocation">
      <div className="flex items-center justify-between gap-2">
        {match.status === "live" ? (
          <span className="chip bg-coral-soft text-coral animate-soft-pulse">● En direct</span>
        ) : mine ? (
          mine.status === "present" ? (
            <span className="chip bg-success-soft text-success">
              <Check size={12} /> Convoqué — présence confirmée
            </span>
          ) : (
            <span className="chip bg-paper text-ink-soft">
              <X size={12} /> Absence signalée
            </span>
          )
        ) : (
          <span className="chip bg-sun-soft text-sun">
            <span className="w-2 h-2 rounded-full bg-gold animate-soft-pulse" aria-hidden />
            Convocation en attente de ta réponse
          </span>
        )}
        <span className="text-xs font-semibold text-ink-soft capitalize shrink-0">
          {formatDate(match.date)} · {match.time}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <TeamSide team={match.homeTeam} />
        <div className="shrink-0 text-center px-2">
          {match.status === "scheduled" ? (
            <p className="display text-2xl text-ink-faint">VS</p>
          ) : (
            <p className="display text-5xl tabular-nums leading-none text-navy-700">
              {match.homeScore}
              <span className="text-ink-faint mx-2">–</span>
              {match.awayScore}
            </p>
          )}
        </div>
        <TeamSide team={match.awayTeam} />
      </div>

      <div className="border-t border-line pt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-ink-soft font-semibold flex items-center gap-1.5 min-w-0">
          <MapPin size={13} className="text-blue shrink-0" />
          <span className="truncate">{match.location}</span>
        </div>
        {match.status === "scheduled" && (
          <div className="text-right">
            <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">Avant coup d&apos;envoi</p>
            <p className="display text-2xl leading-none text-navy-700 tabular-nums">{countdown ?? "Imminent"}</p>
          </div>
        )}
      </div>

      {match.status === "scheduled" && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => answer("present")}
              disabled={locked || saving}
              className={cn(
                "flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
                mine?.status === "present"
                  ? "bg-success text-white shadow-[0_4px_12px_-4px_rgba(30,158,88,0.5)]"
                  : "bg-paper text-ink-soft hover:bg-success-soft hover:text-success",
              )}
              aria-pressed={mine?.status === "present"}
            >
              <Check size={17} /> Présent
            </button>
            <button
              onClick={() => answer("absent")}
              disabled={locked || saving}
              className={cn(
                "flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold border transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
                mine?.status === "absent"
                  ? "bg-coral text-white border-coral shadow-[0_6px_16px_-6px_rgba(239,68,68,0.5)]"
                  : "bg-white text-coral border-coral/40 hover:bg-coral-soft",
              )}
              aria-pressed={mine?.status === "absent"}
            >
              <X size={17} /> Absent
            </button>
          </div>
          {locked ? (
            <p className="text-[11px] font-semibold text-ink-soft flex items-center gap-1.5">
              <Lock size={11} className="shrink-0" /> Ta réponse est verrouillée — contacte ton coach pour la changer.
            </p>
          ) : inLockWindow ? (
            <p className="text-[11px] font-semibold text-sun flex items-center gap-1.5">
              <Lock size={11} className="shrink-0" /> Attention : à moins de 24h du match, ta réponse ne pourra plus être modifiée.
            </p>
          ) : (
            mine && (
              <p className="text-[11px] font-semibold text-ink-soft flex items-center gap-1.5">
                <CalendarDays size={11} className="shrink-0" /> Tu peux changer ta réponse jusqu&apos;à 24h avant le match.
              </p>
            )
          )}
          {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-4 py-2.5">{error}</p>}
        </div>
      )}
    </section>
  );
}
