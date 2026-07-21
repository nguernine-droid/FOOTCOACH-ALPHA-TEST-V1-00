"use client";

import { CalendarDays, MapPin, Users } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";

const STATUS_LABELS = {
  scheduled: { label: "À venir", className: "text-sky-blue border-sky-blue/40 bg-sky-blue/10" },
  live: { label: "En direct", className: "text-match-red border-match-red/40 bg-match-red/10 animate-soft-pulse" },
  finished: { label: "Terminé", className: "text-white/50 border-white/10 bg-white/5" },
} as const;

export function MatchCard({ match, children }: { match: MatchDto; children?: React.ReactNode }) {
  const status = STATUS_LABELS[match.status];
  return (
    <div className="card-cyber p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[10px] uppercase font-bold tracking-widest border rounded-full px-3 py-1", status.className)}>
          {status.label}
        </span>
        <span className="text-xs text-white/50 flex items-center gap-1">
          <CalendarDays size={13} /> {formatDate(match.date)} · {match.time}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-sm flex-1 text-right truncate">{match.homeTeam.name}</p>
        <p className="text-xl font-black text-neon-orange tabular-nums whitespace-nowrap">
          {match.status === "scheduled" ? "VS" : `${match.homeScore} - ${match.awayScore}`}
        </p>
        <p className="font-bold text-sm flex-1 truncate">{match.awayTeam.name}</p>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span className="flex items-center gap-1 truncate">
          <MapPin size={13} /> {match.location}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Users size={13} /> {match.presentCount} présent{match.presentCount > 1 ? "s" : ""}
        </span>
      </div>

      {children}
    </div>
  );
}
