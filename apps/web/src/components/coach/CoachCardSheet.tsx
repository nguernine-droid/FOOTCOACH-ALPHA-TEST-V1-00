"use client";

import { useEffect, useState } from "react";
import type { CoachCardDto } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { CoachCard } from "@/components/coach/CoachCard";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * La carte d'un coach, ouverte par-dessus l'écran courant.
 *
 * Feuille basse et non navigation : on l'ouvre depuis une liste de relations,
 * une annonce ou une feuille de match, et on veut y revenir sans perdre sa
 * place ni son défilement.
 *
 * Un coach qu'on n'a pas le droit de voir renvoie 404 — l'API ne distingue pas
 * « inexistant » de « pas le droit », pour qu'on ne puisse pas sonder
 * l'application identifiant par identifiant. Le message le dit sans accuser
 * personne.
 */
export function CoachCardSheet({ coachId, onClose }: { coachId: string; onClose: () => void }) {
  const [card, setCard] = useState<CoachCardDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<CoachCardDto>(`/coaches/${coachId}/card`)
      .then((fresh) => {
        if (!cancelled) setCard(fresh);
      })
      .catch(() => {
        if (!cancelled) setError("Cette carte n'est pas accessible.");
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return (
    <BottomSheet
      label={card ? `Carte de ${card.nickname}` : "Carte du coach"}
      onClose={onClose}
      footer={
        <Button variant="soft" className="w-full" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div className="p-5">
        {error ? (
          <div className="rounded-lg bg-paper px-4 py-6 text-center space-y-1">
            <p className="text-sm font-bold">{error}</p>
            <p className="text-xs text-ink-soft">
              La carte d&apos;un coach s&apos;ouvre à ses relations, à ceux qu&apos;il rencontre, et quand il a une
              annonce en cours.
            </p>
          </div>
        ) : !card ? (
          <Skeleton className="h-[440px] max-w-[340px] mx-auto" />
        ) : (
          <div className="space-y-4">
            <CoachCard
              name={card.nickname}
              avatarUrl={card.avatarUrl}
              clubLabel={card.clubLabel}
              clubLogoUrl={card.clubLogoUrl}
              teamCategory={card.teamCategory}
              teamLevel={card.teamLevel}
              level={card.level}
              points={card.points}
              matchesPlayed={card.matchesPlayed}
              categories={card.categories}
            />
            {/* Sous la carte et non dessus : la carte est un portrait, ceci est
                une information de décision. Les mêler abîmerait les deux. */}
            <div className="max-w-[340px] mx-auto rounded-lg bg-paper px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-2">
                Son équipe sur la saison
              </p>
              <ReliabilityBadge reliability={card.reliability} detailed />
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
