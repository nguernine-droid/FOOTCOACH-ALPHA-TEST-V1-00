"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { MatchDetailDto } from "@teamnexus/shared";
import { MatchCard } from "@/components/MatchCard";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

function LiveMatch({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Polling : le score et les temps forts se rafraîchissent sans recharger la page
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const m = await api<MatchDetailDto>(`/matches/${id}`);
        if (!cancelled) {
          setMatch(m);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur de chargement");
      }
    }
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  if (error && !match) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!match) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;

  return (
    <div className="space-y-4">
      <Link href="/supporter" className="text-xs font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> Tous les matchs
      </Link>

      <div className="max-w-md">
        <MatchCard match={match}>
          {match.status === "live" && (
            <p className="text-[11px] font-bold text-coral text-center animate-soft-pulse">
              ● En direct — mise à jour automatique toutes les 5 s
            </p>
          )}
          {match.status === "awaiting_confirmation" && (
            <p className="text-[11px] font-bold text-sun text-center">Score en attente de validation par les coachs</p>
          )}
        </MatchCard>
      </div>
    </div>
  );
}

export default function SupporterMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LiveMatch id={id} />;
}
