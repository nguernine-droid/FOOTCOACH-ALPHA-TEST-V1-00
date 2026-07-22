"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { groupMatches } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

export default function PlayerMatchesPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MatchDto[]>("/matches")
      .then(setMatches)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!matches) return <CardGridSkeleton cards={2} />;
  if (matches.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
          <CalendarDays size={22} />
        </span>
        <p className="text-sm text-ink-soft font-medium">Aucun match prévu pour ton équipe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="display text-lg px-1">Mes matchs</h2>
      {groupMatches(matches).map((section) => (
        <div key={section.key} className="space-y-3">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1 pt-2">{section.label}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            {section.items.map((match) => (
              <MatchCard key={match.id} match={match}>
                <div className="space-y-2">
                  {match.status === "scheduled" && (
                    <p className="text-xs font-semibold text-ink-soft">
                      {match.myAttendance
                        ? match.myAttendance.status === "present"
                          ? "Ta réponse : présent"
                          : "Ta réponse : absent"
                        : "Convocation en attente de ta réponse"}
                    </p>
                  )}
                  <Link href={`/player/matches/${match.id}`} className="block">
                    <Button variant={match.status === "live" ? "accent" : "soft"} className="w-full">
                      {match.status === "live" ? "Suivre en direct" : "Voir le match"} <ChevronRight size={14} />
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
