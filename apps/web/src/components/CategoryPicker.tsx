"use client";

import { MATCH_CATEGORIES, categoryLabel, type MatchCategory } from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * Grille des catégories d'âge, partagée par les trois endroits qui en
 * demandent une : l'inscription, la création d'équipe et la publication d'une
 * annonce. Recopiée dans chacun, elle divergeait au premier ajustement.
 *
 * La LISTE se passe en prop : une équipe se déclare dans une catégorie fine
 * (U13), une annonce se publie dans un groupe d'âges (U12-U13) — même grille,
 * pas les mêmes valeurs. Par défaut, les catégories fines.
 *
 * Quatre par rangée au pouce, `px` resserré pour que « Vétérans » tienne sans
 * être tronqué.
 */
export function CategoryPicker<T extends string = MatchCategory>({
  value,
  onChange,
  categories = MATCH_CATEGORIES as unknown as readonly T[],
  label = "Catégorie",
  hint,
  idPrefix = "cat",
  narrow = false,
}: {
  value: T | null;
  onChange: (category: T) => void;
  /** Valeurs proposées — catégories fines par défaut, groupes pour les annonces */
  categories?: readonly T[];
  label?: string;
  /** Ligne d'explication sous la grille */
  hint?: React.ReactNode;
  /** Distingue deux grilles d'une même page pour les lecteurs d'écran */
  idPrefix?: string;
  /**
   * Reste à quatre colonnes quelles que soient les largeurs. Les points de
   * rupture regardent la fenêtre, pas le conteneur : dans une carte étroite au
   * milieu d'un grand écran (l'inscription), six colonnes tronquaient
   * « Seniors » et « Vétérans » alors que rien ne manquait de place autour.
   */
  narrow?: boolean;
}) {
  const labelId = `${idPrefix}-label`;
  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-xs font-bold text-ink-soft">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className={cn("grid gap-2", narrow ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6")}
      >
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={cn("chip-choice !px-2", value === c ? "chip-choice-on" : "chip-choice-off")}
          >
            <span className="truncate">{categoryLabel(c)}</span>
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
