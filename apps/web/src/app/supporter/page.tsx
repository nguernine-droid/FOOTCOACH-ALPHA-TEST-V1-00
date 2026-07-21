"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { RoleGuard } from "@/components/RoleGuard";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

function SupporterMatches() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MatchDto[]>("/matches")
      .then(setMatches)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-2xl px-4 py-3">{error}</p>;
  if (!matches) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;
  if (matches.length === 0)
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="text-3xl" aria-hidden>📣</p>
        <p className="text-sm text-ink-soft font-medium">Aucun match à suivre pour le moment.</p>
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match}>
          <Link href={`/supporter/matches/${match.id}`} className="block">
            <Button variant={match.status === "live" ? "accent" : "soft"} className="w-full">
              {match.status === "live" ? "🔴 Suivre en direct" : "Voir le match"} <ChevronRight size={14} />
            </Button>
          </Link>
        </MatchCard>
      ))}
    </div>
  );
}

export default function SupporterPage() {
  return (
    <RoleGuard role="supporter">
      <h2 className="text-sm font-black px-1 mb-3">Matchs à suivre</h2>
      <SupporterMatches />
    </RoleGuard>
  );
}
