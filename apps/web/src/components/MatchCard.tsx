"use client";

import { MapPin } from "lucide-react";
import type { MatchDto, TeamDto } from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";

const STATUS = {
  scheduled: { label: "À venir", className: "bg-sky-soft text-sky" },
  live: { label: "● En direct", className: "bg-coral-soft text-coral animate-soft-pulse" },
  awaiting_confirmation: { label: "Score à valider", className: "bg-sun-soft text-sun" },
  finished: { label: "Terminé", className: "bg-paper text-ink-soft" },
} as const;

// Couleur d'identité stable par équipe (dérivée de l'id) : une équipe garde
// la même couleur sur toutes les cards, qu'elle joue à domicile ou non.
const TEAM_COLORS = ["bg-navy-700", "bg-tangerine", "bg-blue", "bg-[#6B4FA3]", "bg-[#0F766E]", "bg-[#8A5A2B]"];

export function teamColor(team: TeamDto): string {
  let hash = 0;
  for (const ch of team.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TEAM_COLORS[hash % TEAM_COLORS.length];
}

export function teamInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamBadge({ team }: { team: TeamDto }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0",
          teamColor(team),
        )}
      >
        {teamInitials(team.name)}
      </div>
      <p className="text-xs font-bold text-center leading-tight truncate w-full">{team.name}</p>
    </div>
  );
}

export function MatchCard({ match, children }: { match: MatchDto; children?: React.ReactNode }) {
  const status = STATUS[match.status];
  return (
    <div className="card p-5 space-y-4 animate-rise-in">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("chip", status.className)}>{status.label}</span>
        <span className="text-xs font-semibold text-ink-soft capitalize">
          {formatDate(match.date)} · {match.time}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <TeamBadge team={match.homeTeam} />
        <div className="shrink-0 text-center px-2">
          {match.status === "scheduled" ? (
            <p className="text-xs font-black text-ink-soft bg-paper rounded-full px-3 py-1.5">VS</p>
          ) : (
            <p className="display text-5xl tabular-nums leading-none text-pitch-deep">
              {match.homeScore}
              <span className="text-ink-faint mx-1.5">–</span>
              {match.awayScore}
            </p>
          )}
        </div>
        <TeamBadge team={match.awayTeam} />
      </div>

      <div className="flex items-center text-xs text-ink-soft border-t border-line pt-3">
        <span className="flex items-center gap-1.5 truncate">
          <MapPin size={13} className="text-pitch shrink-0" /> {match.location}
        </span>
      </div>

      {children}
    </div>
  );
}
