"use client";

import { MATCH_GENDERS, MATCH_GENDER_LABELS, type MatchGender } from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * Le genre, en trois pastilles — jumeau du `CategoryPicker`, aux mêmes quatre
 * endroits : l'inscription, la création d'équipe, le réglage des références et
 * la publication d'une annonce.
 *
 * Rien n'est présélectionné et c'est voulu : « masculin » par défaut publierait
 * des annonces masculines pour des équipes qui ne le sont pas, et la moitié des
 * coachs ne s'en apercevrait qu'en voyant se présenter les mauvais adversaires.
 */
export function GenderPicker({
  value,
  onChange,
  label = "Genre",
  hint,
  idPrefix = "gender",
}: {
  value: MatchGender | null;
  onChange: (gender: MatchGender) => void;
  label?: string;
  hint?: React.ReactNode;
  /** Distingue deux grilles d'une même page pour les lecteurs d'écran */
  idPrefix?: string;
}) {
  const labelId = `${idPrefix}-label`;
  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-xs font-bold text-ink-soft">
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
        {MATCH_GENDERS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={value === g}
            onClick={() => onChange(g)}
            className={cn("chip-choice !px-2", value === g ? "chip-choice-on" : "chip-choice-off")}
          >
            <span className="truncate">{MATCH_GENDER_LABELS[g]}</span>
          </button>
        ))}
      </div>
      {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}
