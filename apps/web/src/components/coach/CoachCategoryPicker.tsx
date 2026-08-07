"use client";

import {
  COACH_CATEGORIES,
  COACH_CATEGORY_DESCRIPTIONS,
  COACH_CATEGORY_LABELS,
  type CoachCategory,
} from "@footcoach/shared";
import { cn } from "@/lib/utils";

/**
 * Les casquettes, en cases à cocher. La même liste sert à l'inscription et au
 * profil : ce qu'un coach a lu en s'inscrivant doit se relire mot pour mot le
 * jour où il revient dessus, sinon il croit avoir accepté autre chose.
 *
 * Rien n'est coché au départ et « aucune » n'a pas de case — ce serait une case
 * pour dire non, alors que c'est le cas ordinaire.
 */
export function CoachCategoryPicker({
  value,
  onToggle,
  idPrefix = "category",
}: {
  value: CoachCategory[];
  onToggle: (category: CoachCategory) => void;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-3">
      {COACH_CATEGORIES.map((category) => {
        const on = value.includes(category);
        return (
          <label
            key={category}
            htmlFor={`${idPrefix}-${category}`}
            className={cn(
              "flex gap-3 items-start rounded-lg border px-4 py-3 cursor-pointer transition",
              on ? "border-accent bg-accent-surface" : "border-line bg-paper hover:border-accent/40",
            )}
          >
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
