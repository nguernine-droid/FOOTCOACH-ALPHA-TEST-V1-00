"use client";

import { MapPin } from "lucide-react";
import type { MatchDto, TeamDto } from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";

const STATUS = {
  scheduled: { label: "À venir", className: "bg-sky-soft text-sky" },
  live: { label: "● En direct", className: "bg-coral-soft text-coral animate-soft-pulse" },
  awaiting_confirmation: { label: "Score à valider", className: "bg-sun-soft text-sun" },
  finished: { label: "Terminé", className: "bg-paper text-ink-soft" },
  cancelled: { label: "Annulé — désistement", className: "bg-coral-soft text-coral" },
} as const;

// Couleur d'identité stable par équipe (dérivée de l'id) : une équipe garde
// la même couleur sur toutes les cards, qu'elle joue à domicile ou non.
// Six jetons plutôt que six valeurs : chaque thème donne sa version de la
// palette, assez soutenue pour porter du texte blanc sur les deux fonds.
const TEAM_COLORS = ["bg-team-1", "bg-team-2", "bg-team-3", "bg-team-4", "bg-team-5", "bg-team-6"];

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
          "w-9 h-9 min-[380px]:w-10 min-[380px]:h-10 min-[420px]:w-12 min-[420px]:h-12 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0",
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

      <div className="flex items-center gap-2 min-[420px]:gap-3">
        <TeamBadge team={match.homeTeam} />
        <div className="shrink-0 text-center px-1">
          {match.status === "scheduled" || match.status === "cancelled" ? (
            <p className="text-xs font-black text-ink-soft bg-paper rounded-full px-3 py-1.5">VS</p>
          ) : (
            // `text-5xl` (48px) sur les deux chiffres pleins ("99 – 99") + les deux
            // badges d'équipe (48px, non compressibles) dépassait la largeur d'un
            // téléphone : la carte débordait, rognée en silence par le conteneur
            // du carrousel d'onglets — les matchs « sortaient de l'écran ».
            <p className="display text-xl min-[350px]:text-2xl min-[380px]:text-3xl min-[420px]:text-4xl tabular-nums leading-none text-primary">
              {match.homeScore}
              <span className="text-ink-faint mx-1">–</span>
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
