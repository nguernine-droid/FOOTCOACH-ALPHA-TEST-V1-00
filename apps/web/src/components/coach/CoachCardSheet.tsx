"use client";

import { useEffect, useState } from "react";
import type { CoachCardDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { CoachCard } from "@/components/coach/CoachCard";
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
      label={card ? `Carte de ${card.firstName} ${card.lastName}` : "Carte du coach"}
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
          <CoachCard
            firstName={card.firstName}
            lastName={card.lastName}
            avatarUrl={card.avatarUrl}
            clubLabel={card.clubLabel}
            teamCategory={card.teamCategory}
            level={card.level}
            points={card.points}
            matchesPlayed={card.matchesPlayed}
            categories={card.categories}
          />
        )}
      </div>
    </BottomSheet>
  );
}
