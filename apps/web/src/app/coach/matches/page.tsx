"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Clock3, Radar } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { groupMatches } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";
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
          <Link href="/coach/announcements/new" className="inline-block">
            <Button variant="soft" size="sm">Publier une annonce</Button>
          </Link>
        </div>
      )}

      {groupMatches(matches).map((section) => (
        <div key={section.key} className="space-y-3">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1 pt-2">{section.label}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            {section.items.map((match) => (
              <MatchCard key={match.id} match={match}>
                <div className="flex items-center justify-between gap-2">
                  {match.finalScoreDue ? (
                    <span className="text-xs font-bold text-coral flex items-center gap-1.5">
                      <AlertTriangle size={13} className="shrink-0" /> Score final à saisir
                    </span>
                  ) : match.status === "awaiting_confirmation" ? (
                    <span className="text-xs font-bold text-sun flex items-center gap-1.5">
                      <Clock3 size={13} className="shrink-0" />
                      {/* Le jeton n'est rendu qu'à celui qui a saisi : il attend, l'autre valide */}
                      {match.confirmationToken ? "En attente de validation" : "À valider par vous"}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Link href={`/coach/matches/${match.id}`}>
                    <Button size="sm">
                      Feuille de match <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>
              </MatchCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
