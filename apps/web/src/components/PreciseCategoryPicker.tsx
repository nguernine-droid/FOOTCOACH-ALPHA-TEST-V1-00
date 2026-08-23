"use client";

import { categoryLabel, precisableCategoriesOf, type MatchCategory } from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * L'âge précis, à l'intérieur du groupe.
 *
 * Une annonce se publie par paire d'âges (U14-U15) — c'est le défaut, et il le
 * reste : un U14 joue très bien un U15, et fermer la porte à l'année d'à côté
 * viderait le radar de moitié. Mais un coach qui sait qu'il n'alignera que des
 * U14 doit pouvoir le dire ici plutôt que dans les informations pratiques, où
 * personne ne le lit avant de proposer.
 *
 * Ne s'affiche pas là où il n'y a rien à préciser (U20, Seniors, Vétérans) :
 * un choix à une seule option n'est pas un choix.
 */
export function PreciseCategoryPicker({
  category,
  value,
  onChange,
  idPrefix = "precise-category",
}: {
  /** Le groupe d'âges de l'annonce — c'est lui qui dit quels âges sont précisables */
  category: string;
  value: MatchCategory | null;
  onChange: (age: MatchCategory | null) => void;
  idPrefix?: string;
}) {
  const ages = precisableCategoriesOf(category);
  if (ages.length === 0) return null;

  const labelId = `${idPrefix}-label`;
  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-xs font-bold text-ink-soft">
        Âge des joueurs
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className={cn("grid gap-2", ages.length + 1 <= 3 ? "grid-cols-3" : "grid-cols-4")}
      >
        {/* Le choix ouvert d'abord, et sélectionné par défaut : c'est celui qui
            fait se rencontrer le plus d'équipes. */}
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn("chip-choice !px-2", value === null ? "chip-choice-on" : "chip-choice-off")}
        >
          <span className="truncate">Les deux</span>
        </button>
        {ages.map((age) => (
          <button
            key={age}
            type="button"
            aria-pressed={value === age}
            onClick={() => onChange(age)}
            className={cn("chip-choice !px-2", value === age ? "chip-choice-on" : "chip-choice-off")}
          >
            <span className="truncate">{categoryLabel(age)}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-soft">
        {value === null
          ? `Votre annonce s'adresse aux deux années — le plus d'adversaires possible.`
          : `Annoncé comme une équipe ${categoryLabel(value)} : les coachs le verront avant de proposer.`}
      </p>
    </div>
  );
}
