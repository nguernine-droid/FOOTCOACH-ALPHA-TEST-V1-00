"use client";

import { LifeBuoy, Sparkles, Trophy } from "lucide-react";
import { COACH_CATEGORY_LABELS, type CoachCategory, type CoachLevelDto } from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * Palier d'un coach, en pastille. Rien n'est affiché tant qu'aucun palier n'est
 * gagné : décorer un compteur à zéro reviendrait à signaler l'absence de
 * résultat — sur la fiche d'un confrère, cela se lirait comme un mauvais point.
 */
export function LevelBadge({ level, className }: { level: CoachLevelDto; className?: string }) {
  if (level.min === 0) return null;
  return (
    <span className={cn("chip bg-accent-surface text-accent shrink-0", className)}>
      <Trophy size={11} aria-hidden /> {level.name}
    </span>
  );
}

/**
 * Casquettes d'un coach. Le joker se distingue du contributeur : savoir qui
 * dépanne se lit d'un coup d'œil le jour où on cherche un adversaire, alors que
 * le contributeur est une reconnaissance sans conséquence pratique.
 */
const CATEGORY_STYLES: Record<CoachCategory, { icon: typeof LifeBuoy; className: string }> = {
  joker: { icon: LifeBuoy, className: "bg-success-soft text-success" },
  contributeur: { icon: Sparkles, className: "bg-blue-soft text-primary" },
};

export function CategoryBadges({ categories, className }: { categories: CoachCategory[]; className?: string }) {
  if (categories.length === 0) return null;
  return (
    <>
      {categories.map((category) => {
        const { icon: Icon, className: tone } = CATEGORY_STYLES[category];
        return (
          <span key={category} className={cn("chip shrink-0", tone, className)}>
            <Icon size={11} aria-hidden /> {COACH_CATEGORY_LABELS[category]}
          </span>
        );
      })}
    </>
  );
}
