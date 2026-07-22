"use client";

import type { LineupPlayerDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";

// Terrain vertical style FIFA. Les positions sont en % (x: gauche→droite, y: haut→bas).
export function Pitch({
  players,
  tone = "green",
  onPitchClick,
  onPlayerClick,
  interactive = false,
}: {
  players: LineupPlayerDto[];
  tone?: "green" | "orange";
  onPitchClick?: (x: number, y: number) => void;
  onPlayerClick?: (playerId: string) => void;
  interactive?: boolean;
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onPitchClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onPitchClick(Math.min(96, Math.max(4, x)), Math.min(95, Math.max(5, y)));
  }

  const line = "absolute border-white/40";

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative w-full aspect-[3/4] rounded-lg overflow-hidden select-none",
        "bg-gradient-to-b from-green-600 via-green-700 to-green-800",
        interactive && "cursor-crosshair",
      )}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "Terrain : cliquez pour placer le joueur sélectionné" : "Terrain"}
    >
      {/* Bandes de tonte */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="absolute inset-x-0 bg-white/[0.04]" style={{ top: `${i * 16.66}%`, height: "8.33%" }} />
      ))}
      {/* Lignes du terrain */}
      <div className={cn(line, "inset-[3%] border-2 rounded-sm")} />
      <div className={cn(line, "left-[3%] right-[3%] top-1/2 border-t-2")} />
      <div className={cn(line, "left-1/2 top-1/2 w-[24%] aspect-square -translate-x-1/2 -translate-y-1/2 border-2 rounded-full")} />
      <div className={cn(line, "left-[28%] right-[28%] top-[3%] h-[13%] border-2 border-t-0")} />
      <div className={cn(line, "left-[38%] right-[38%] top-[3%] h-[6%] border-2 border-t-0")} />
      <div className={cn(line, "left-[28%] right-[28%] bottom-[3%] h-[13%] border-2 border-b-0")} />
      <div className={cn(line, "left-[38%] right-[38%] bottom-[3%] h-[6%] border-2 border-b-0")} />

      {/* Joueurs placés */}
      {players.map((p) => (
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
              "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white border-2 border-white shadow-lg transition",
              tone === "green" ? "bg-pitch-deep" : "bg-tangerine",
              interactive && "group-hover:bg-coral group-hover:scale-110",
            )}
          >
            {p.firstName[0]}
            {p.lastName[0] ?? ""}
          </span>
          <span className="text-[9px] font-bold text-white drop-shadow bg-black/30 rounded-full px-1.5 py-0.5 whitespace-nowrap">
            {p.firstName}
          </span>
        </button>
      ))}
    </div>
  );
}
