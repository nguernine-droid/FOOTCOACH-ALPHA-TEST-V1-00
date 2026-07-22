"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, ChevronRight, Radar } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { groupMatches } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";

export default function CoachMatchesPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MatchDto[]>("/matches")
      .then(setMatches)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!matches) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;

  return (
    <div className="space-y-4">
      <h2 className="display text-lg text-ink px-1">Matchs</h2>

      {matches.length === 0 && (
        <div className="card p-8 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Radar size={20} />
          </span>
          <p className="text-sm text-ink-soft font-medium">
            Aucun match pour l&apos;instant. Postez une annonce ou explorez le radar.
          </p>
          <Link href="/coach/radar" className="inline-block">
            <Button variant="soft" size="sm">Ouvrir le radar</Button>
          </Link>
        </div>
      )}

      {groupMatches(matches).map((section) => (
        <div key={section.key} className="space-y-3">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1 pt-2">{section.label}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            {section.items.map((match) => (
              <MatchCard key={match.id} match={match}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
                    <Car size={13} className="text-tangerine" /> Covoiturage : {match.transportSeats} place
                    {match.transportSeats > 1 ? "s" : ""}
                  </span>
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
