"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { kickoffDate } from "@/lib/time";
import { ConvocationCard } from "@/components/player/ConvocationCard";
import { PresenceNow } from "@/components/player/PresenceNow";
import { PlayerActivityFeed } from "@/components/player/PlayerActivityFeed";
import { CarpoolSection } from "@/components/CarpoolSection";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PlayerHomePage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      setMatches(await api<MatchDto[]>("/matches"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!matches) {
    return (
      <div className="max-w-[720px] mx-auto space-y-4" aria-busy aria-label="Chargement">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  // Match du moment : celui en cours, sinon le prochain programmé
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => kickoffDate(a.date, a.time).getTime() - kickoffDate(b.date, b.time).getTime());
  const featured = live[0] ?? upcoming[0] ?? null;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      {featured ? (
        <>
          <ConvocationCard match={featured} onChanged={() => setVersion((v) => v + 1)} />
          <PresenceNow matchId={featured.id} version={version} />
          <section className="card p-5 space-y-3 animate-rise-in" aria-label="Covoiturage pour ce match">
            <h3 className="text-sm font-black">Covoiturage pour ce match</h3>
            <CarpoolSection matchId={featured.id} canBook />
          </section>
        </>
      ) : (
        <section className="card p-10 text-center space-y-3 animate-rise-in">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <CalendarDays size={22} />
          </span>
          <p className="text-sm font-bold">Aucun match programmé</p>
          <p className="text-xs text-ink-soft">Ton coach n&apos;a pas encore planifié le prochain match.</p>
        </section>
      )}

      <PlayerActivityFeed />

      <Link href="/player/matches" className="block">
        <Button variant="soft" className="w-full">
          Tous mes matchs <ChevronRight size={14} />
        </Button>
      </Link>
    </div>
  );
}
