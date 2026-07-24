"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import type { CoachTeamDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<CoachTeamDto["role"], string> = {
  principal: "Coach principal",
  adjoint: "Coach adjoint",
};

/**
 * Sélecteur "Mes équipes" du header coach : bascule l'équipe active. Affiché
 * comme un simple libellé quand le coach n'encadre qu'une seule équipe.
 */
export function TeamSwitcher({
  teams,
  activeTeam,
  onSelect,
}: {
  teams: CoachTeamDto[];
  activeTeam: CoachTeamDto | null;
  onSelect: (teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const label = activeTeam?.name ?? teams[0]?.name ?? "";

  // Une seule équipe : pas de bascule, on affiche juste le nom (comme les autres rôles)
  if (teams.length <= 1) {
    return <span className="text-[11px] text-white/60 font-semibold truncate">{label}</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md -ml-1 px-1 py-0.5 hover:bg-white/10 transition group"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Changer d'équipe"
      >
        <span className="text-[11px] text-white/80 font-semibold truncate max-w-[9rem]">{label}</span>
        <ChevronDown size={12} className={cn("text-white/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Mes équipes"
          className="absolute left-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] card p-2 text-ink z-50 animate-rise-in"
        >
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint border-b border-line mb-1">
            Mes équipes
          </p>
          {teams.map((team) => {
            const isActive = team.id === activeTeam?.id;
            return (
              <button
                key={team.id}
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onSelect(team.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition",
                  isActive ? "bg-blue-soft" : "hover:bg-paper",
                )}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    isActive ? "bg-blue text-white" : "bg-paper text-ink-soft",
                  )}
                >
                  <Users size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold truncate">{team.name}</span>
                  <span className="block text-[11px] text-ink-soft font-semibold">{ROLE_LABEL[team.role]}</span>
                </span>
                {isActive && <Check size={16} className="text-blue shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
