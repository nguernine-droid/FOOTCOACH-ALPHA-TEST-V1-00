"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchDto } from "@footcoach/shared";
import { RoleGuard } from "@/components/RoleGuard";
import { MatchCard } from "@/components/MatchCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { api } from "@/lib/api";

function SupporterMatches() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MatchDto[]>("/matches")
      .then(setMatches)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) return <p className="text-sm text-match-red">{error}</p>;
  if (!matches) return <p className="text-white/40 animate-soft-pulse text-sm">Chargement…</p>;
  if (matches.length === 0) return <p className="text-sm text-white/40">Aucun match à suivre pour le moment.</p>;

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match}>
          <div className="flex justify-end pt-1">
            <Link href={`/supporter/matches/${match.id}`}>
              <NeonButton size="sm" variant={match.status === "live" ? "magenta" : "cyan"}>
                {match.status === "live" ? "Suivre en direct" : "Voir le match"}
              </NeonButton>
            </Link>
          </div>
        </MatchCard>
      ))}
    </div>
  );
}

export default function SupporterPage() {
  return (
    <RoleGuard role="supporter">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Matchs à suivre</h2>
      <SupporterMatches />
    </RoleGuard>
  );
}
