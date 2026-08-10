"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import type { PublicationDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { PublicationCard } from "@/components/publications/PublicationCard";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Fil de publications : billets des coachs contributeurs, visibles de tous —
 * sans portée club/équipe, contrairement aux annonces.
 */
export default function PublicationsPage() {
  const [publications, setPublications] = useState<PublicationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPublications(await api<PublicationDto[]>("/publications"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <BookOpen size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Publications</h2>
          <p className="text-xs text-white/80">Conseils et retours d&apos;expérience des coachs contributeurs.</p>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {!publications ? (
        <CardGridSkeleton cards={3} />
      ) : publications.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <BookOpen size={22} />
          </span>
          <p className="text-sm font-bold">Rien de publié pour l&apos;instant</p>
          <p className="text-xs text-ink-soft">
            Les coachs contributeurs partagent ici leurs conseils — revenez plus tard.
          </p>
        </div>
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start">
          {publications.map((p) => (
            <PublicationCard key={p.id} publication={p} />
          ))}
        </div>
      )}
    </div>
  );
}
