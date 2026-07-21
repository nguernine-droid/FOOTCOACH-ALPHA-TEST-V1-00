"use client";

import { MapPin, Users } from "lucide-react";
import type { MatchDto, TeamDto } from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";

const STATUS = {
  scheduled: { label: "À venir", className: "bg-sky-soft text-sky" },
  live: { label: "● En direct", className: "bg-coral-soft text-coral animate-soft-pulse" },
  finished: { label: "Terminé", className: "bg-paper text-ink-soft" },
} as const;

function TeamBadge({ team, tone }: { team: TeamDto; tone: "home" | "away" }) {
  const initials = team.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0",
          tone === "home" ? "bg-pitch" : "bg-tangerine",
        )}
      >
        {initials}
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
        <TeamBadge team={match.homeTeam} tone="home" />
        <div className="shrink-0 text-center px-2">
          {match.status === "scheduled" ? (
            <p className="text-xs font-black text-ink-soft/60 bg-paper rounded-full px-3 py-1.5">VS</p>
          ) : (
            <p className="text-3xl font-black tabular-nums tracking-tight">
              {match.homeScore}
              <span className="text-ink-soft/40 mx-1">–</span>
              {match.awayScore}
            </p>
          )}
        </div>
        <TeamBadge team={match.awayTeam} tone="away" />
      </div>

      <div className="flex items-center justify-between text-xs text-ink-soft border-t border-line pt-3">
        <span className="flex items-center gap-1.5 truncate">
          <MapPin size={13} className="text-pitch shrink-0" /> {match.location}
        </span>
        <span className="flex items-center gap-1.5 shrink-0 font-semibold">
          <Users size={13} className="text-pitch" /> {match.presentCount} présent{match.presentCount > 1 ? "s" : ""}
        </span>
      </div>

      {children}
    </div>
  );
}
