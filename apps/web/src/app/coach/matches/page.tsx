"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Radar, Trophy } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { groupMatches } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

export default function CoachMatchesPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MatchDto[]>("/matches")
      .then(setMatches)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!matches) return <CardGridSkeleton cards={3} />;

  return (
    <div className="space-y-4">
      <h2 className="display text-lg text-ink px-1">Matchs</h2>

      {matches.length === 0 && (
        <div className="card p-8 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Radar size={20} />
          </span>
          <p className="text-sm text-ink-soft font-medium">
            Aucun match pour l&apos;instant. Publiez une annonce, ou répondez à une équipe depuis le radar du
            tableau de bord.
          </p>
          <ButtonLink href="/coach/announcements/new" variant="soft" className="w-full sm:w-auto">
            Publier une annonce
          </ButtonLink>
        </div>
      )}

      {groupMatches(matches).map((section) => (
        <div key={section.key} className="space-y-3">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1 pt-2">{section.label}</h3>
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            {section.items.map((match) => (
              <MatchCard key={match.id} match={match}>
                <div className="flex items-center justify-between gap-2">
                  {/* La rencontre passe devant le score : elle se valide au
                      stade, face à l'autre coach, et c'est elle qui rapporte. */}
                  {match.encounterOpen && !match.encounterConfirmedAt ? (
                    <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                      <Trophy size={13} className="shrink-0" /> Rencontre à valider
                    </span>
                  ) : match.finalScoreDue ? (
                    <span className="text-xs font-bold text-coral flex items-center gap-1.5">
                      <AlertTriangle size={13} className="shrink-0" /> Score final à saisir
                    </span>
                  ) : (
                    <span />
                  )}
                  <ButtonLink href={`/coach/matches/${match.id}`} size="sm" className="shrink-0">
                    Feuille de match <ChevronRight size={14} />
                  </ButtonLink>
                </div>
              </MatchCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
