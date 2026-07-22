"use client";

import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import type { MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { CarpoolSection } from "@/components/CarpoolSection";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

export default function CoachCarpoolPage() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<MatchDto[]>("/matches")
      .then((all) => setMatches(all.filter((m) => m.status === "scheduled")))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!matches) return <CardGridSkeleton cards={2} />;

  return (
    <div className="space-y-4">
      <h2 className="display text-lg text-ink px-1">Covoiturage</h2>

      {matches.length === 0 && (
        <div className="card p-8 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Car size={20} />
          </span>
          <p className="text-sm text-ink-soft font-medium">
            Aucun match à venir — les covoiturages apparaîtront ici dès qu&apos;un match sera programmé.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 items-start">
        {matches.map((m) => (
          <div key={m.id} className="card p-5 space-y-3 animate-rise-in">
            <div>
              <p className="font-bold text-sm">
                {m.homeTeam.name} – {m.awayTeam.name}
              </p>
              <p className="text-xs text-ink-soft capitalize">
                {formatDate(m.date)} à {m.time} · {m.location}
              </p>
            </div>
            <CarpoolFallback matchId={m.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** CarpoolSection ne rend rien s'il n'y a aucune voiture : on affiche alors un état vide explicite. */
function CarpoolFallback({ matchId }: { matchId: string }) {
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    api<unknown[]>(`/matches/${matchId}/carpools`)
      .then((c) => setEmpty(c.length === 0))
      .catch(() => setEmpty(true));
  }, [matchId]);

  if (empty) {
    return (
      <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
        Aucune voiture proposée pour ce match pour l&apos;instant.
      </p>
    );
  }
  return <CarpoolSection matchId={matchId} canBook={false} />;
}
