"use client";

import type { LineupPlayerDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";

// Terrain vertical façon scoreboard. Les positions sont en % (x: gauche→droite, y: haut→bas).
// tone "green" = mon équipe (joueurs bleus, gardien doré) ; "orange" = adversaire (navy sombre).
export function Pitch({
  players,
  tone = "green",
  onPitchClick,
  onPlayerClick,
  interactive = false,
  ghosts,
}: {
  players: LineupPlayerDto[];
  tone?: "green" | "orange";
  onPitchClick?: (x: number, y: number) => void;
  onPlayerClick?: (playerId: string) => void;
  interactive?: boolean;
  /** Emplacements fantômes (formation par défaut) affichés quand la compo est vide */
  ghosts?: { x: number; y: number }[];
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onPitchClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onPitchClick(Math.min(96, Math.max(4, x)), Math.min(95, Math.max(5, y)));
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative w-full aspect-[3/4] rounded-lg overflow-hidden select-none bg-[#277944]",
        interactive && "cursor-crosshair",
      )}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "Terrain : cliquez pour placer le joueur sélectionné" : "Terrain"}
    >
      {/* Bandes de tonte : deux verts alternés */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-x-0"
          style={{ top: `${i * 12.5}%`, height: "12.5%", background: i % 2 ? "#2E8B4F" : "#277944" }}
        />
      ))}

      {/* Lignes blanches du terrain */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 133"
        preserveAspectRatio="none"
        aria-hidden
      >
        <g fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.7" vectorEffect="non-scaling-stroke">
          <rect x="3" y="3" width="94" height="127" />
          <line x1="3" y1="66.5" x2="97" y2="66.5" />
          <circle cx="50" cy="66.5" r="11.5" />
          {/* Surfaces + petites surfaces */}
          <rect x="22" y="3" width="56" height="19" />
          <rect x="36" y="3" width="28" height="7.5" />
          <rect x="22" y="111" width="56" height="19" />
          <rect x="36" y="122.5" width="28" height="7.5" />
          {/* Arcs de cercle des surfaces */}
          <path d="M 39.5 22 A 11.5 11.5 0 0 0 60.5 22" />
          <path d="M 39.5 111 A 11.5 11.5 0 0 1 60.5 111" />
        </g>
        <g fill="rgba(255,255,255,0.75)">
          <circle cx="50" cy="66.5" r="0.9" />
          <circle cx="50" cy="15" r="0.9" />
          <circle cx="50" cy="118" r="0.9" />
        </g>
      </svg>

      {/* Emplacements fantômes (formation par défaut, compo vide) */}
      {players.length === 0 &&
        ghosts?.map((g, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-2 border-dashed border-white/45 bg-white/10"
            style={{ left: `${g.x}%`, top: `${g.y}%` }}
          />
        ))}

      {/* Joueurs placés */}
      {players.map((p) => {
        const isGoalkeeper = p.position === "gardien";
        return (
          <button
            key={p.playerId}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayerClick?.(p.playerId);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={`${p.firstName} ${p.lastName}${interactive ? " — cliquer pour retirer" : ""}`}
          >
            <span
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white border-2 border-white/85 shadow-lg transition group-hover:scale-110",
                isGoalkeeper
                  ? "bg-gradient-to-b from-[#F5B301] to-[#C68F00] text-navy-900"
                  : tone === "green"
                    ? "bg-gradient-to-b from-[#2F7FE6] to-[#1659B8]"
                    : "bg-gradient-to-b from-[#3D4C68] to-[#1B2942]",
                interactive && "group-hover:bg-coral group-hover:from-coral group-hover:to-coral",
              )}
            >
              {p.jerseyNumber ? (
                <span className="display text-sm leading-none">{p.jerseyNumber}</span>
              ) : (
                <span className="text-[11px] font-black">
                  {p.firstName[0]}
                  {p.lastName[0] ?? ""}
                </span>
              )}
            </span>
            <span className="text-[9px] font-bold text-white bg-navy-900/60 rounded-full px-1.5 py-0.5 whitespace-nowrap">
              {p.firstName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
