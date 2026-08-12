"use client";

import {
  COACH_CATEGORIES,
  COACH_CATEGORY_DESCRIPTIONS,
  COACH_CATEGORY_LABELS,
  COACH_PLAIN_DESCRIPTION,
  COACH_PLAIN_LABEL,
  type CoachCategory,
} from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * Les casquettes, en cases à cocher. La même liste sert à l'inscription et au
 * profil : ce qu'un coach a lu en s'inscrivant doit se relire mot pour mot le
 * jour où il revient dessus, sinon il croit avoir accepté autre chose.
 *
 * Trois options pour deux casquettes : « Coach simple » ouvre la liste et vaut
 * pour le tableau vide. Elle ne stocke rien — cocher une vraie casquette la
 * décoche d'elle-même, la cocher retire les deux autres. Sans elle, l'écran
 * demandait de choisir entre deux engagements sans jamais dire qu'on pouvait
 * n'en prendre aucun, ce qui est pourtant le cas ordinaire.
 */
export function CoachCategoryPicker({
  value,
  onToggle,
  onClear,
  idPrefix = "category",
}: {
  value: CoachCategory[];
  onToggle: (category: CoachCategory) => void;
  /** Retour au coach simple : vide la sélection */
  onClear: () => void;
  idPrefix?: string;
}) {
  const plain = value.length === 0;

  const card = (on: boolean) =>
    cn(
      "flex gap-3 items-start rounded-lg border px-4 py-3 cursor-pointer transition",
      on ? "border-accent bg-accent-surface" : "border-line bg-paper hover:border-accent/40",
    );

  return (
    <div className="space-y-3">
      <label htmlFor={`${idPrefix}-simple`} className={card(plain)}>
        <input
          id={`${idPrefix}-simple`}
          type="checkbox"
          checked={plain}
          // Déjà coché, un clic ne fait rien : il n'y a rien à décocher, et
          // « aucune casquette » ne se quitte qu'en en prenant une.
          onChange={onClear}
          className="mt-0.5 w-5 h-5 shrink-0 accent-blue"
        />
        <span className="text-xs leading-relaxed">
          <span className="block font-bold text-ink">{COACH_PLAIN_LABEL}</span>
          <span className="text-ink-soft">{COACH_PLAIN_DESCRIPTION}</span>
        </span>
      </label>

      {COACH_CATEGORIES.map((category) => {
        const on = value.includes(category);
        return (
          <label key={category} htmlFor={`${idPrefix}-${category}`} className={card(on)}>
            <input
              id={`${idPrefix}-${category}`}
              type="checkbox"
              checked={on}
              onChange={() => onToggle(category)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-blue"
            />
            <span className="text-xs leading-relaxed">
              <span className="block font-bold text-ink">{COACH_CATEGORY_LABELS[category]}</span>
              <span className="text-ink-soft">{COACH_CATEGORY_DESCRIPTIONS[category]}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
