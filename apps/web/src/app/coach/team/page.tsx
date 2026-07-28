"use client";

import { Plus, ShieldCheck, Users } from "lucide-react";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Mes équipes : les équipes encadrées, et celle au nom de laquelle on publie.
 * La V1 ne gère ni effectif ni club — l'application ne connaît que des coachs,
 * qui se rencontrent en match amical.
 */
export default function CoachTeamPage() {
  const { teams, activeTeamId, setActiveTeam } = useActiveTeam();

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Users size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="display text-lg">Mes équipes</h2>
          <p className="text-xs text-white/80">
            {teams.length > 1
              ? "Choisissez l'équipe active : annonces, radar et matchs la suivent."
              : "L'équipe au nom de laquelle vous publiez vos annonces."}
          </p>
        </div>
      </div>

      <div className="stagger space-y-2">
        {teams.map((team) => {
          const active = team.id === activeTeamId;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => setActiveTeam(team.id)}
              aria-pressed={active}
              className={cn(
                "w-full card px-4 py-3 flex items-center gap-3 text-left transition",
                active ? "border-blue ring-2 ring-blue/15" : "hover:border-blue/40",
              )}
            >
              <span
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
                  active ? "bg-blue text-white" : "bg-paper text-ink-soft",
                )}
              >
                <Users size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold truncate">{team.name}</span>
                <span className="block text-xs text-ink-soft truncate">{team.city}</span>
              </span>
              {team.role === "adjoint" && <span className="chip bg-paper text-ink-soft shrink-0">Adjoint</span>}
              {active && (
                <span className="chip bg-blue-soft text-navy-700 shrink-0">
                  <ShieldCheck size={11} /> Équipe active
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Le « + » de la barre mène ici aussi : tout le monde ne le trouve pas. */}
      <ButtonLink href="/coach/team/new" variant="soft" className="w-full">
        <Plus size={15} /> Créer une équipe
      </ButtonLink>
    </div>
  );
}
