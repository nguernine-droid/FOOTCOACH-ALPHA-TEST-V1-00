"use client";

import { DIVISION_LEVEL_LABELS, divisionLevelsFor, type DivisionLevel } from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * Le niveau (D2, R1…), dont les choix dépendent de la catégorie d'âge — en
 * dessous des U10, aucun niveau ne se propose : les districts ne classent pas
 * ces catégories.
 *
 * Rien à afficher plutôt qu'un panneau vide quand `divisionLevelsFor` ne
 * renvoie rien : le champ n'a alors aucun sens pour cette catégorie.
 */
export function DivisionLevelPicker({
  category,
  value,
  onChange,
  label = "Niveau",
  hint,
  idPrefix = "level",
}: {
  /** Catégorie (fine ou groupée) qui détermine les niveaux proposés */
  category: string | null;
  value: DivisionLevel | null;
  onChange: (level: DivisionLevel | null) => void;
  label?: string;
  hint?: React.ReactNode;
  idPrefix?: string;
}) {
  const levels = divisionLevelsFor(category);
  if (levels.length === 0) return null;

  const labelId = `${idPrefix}-label`;
  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-xs font-bold text-ink-soft">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-4 gap-2">
        {levels.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={value === l}
            onClick={() => onChange(value === l ? null : l)}
            className={cn("chip-choice !px-2", value === l ? "chip-choice-on" : "chip-choice-off")}
          >
            <span className="truncate">{DIVISION_LEVEL_LABELS[l]}</span>
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
