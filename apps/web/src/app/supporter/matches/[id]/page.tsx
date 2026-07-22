"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Goal, Sparkles, Square } from "lucide-react";
import type { MatchDetailDto, MatchEventType } from "@footcoach/shared";
import { MatchCard } from "@/components/MatchCard";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

const EVENT_ICONS: Record<MatchEventType, React.ElementType> = {
  goal: Goal,
  card: Square,
  substitution: ArrowLeftRight,
  highlight: Sparkles,
};

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

  const sortedEvents = [...match.events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="space-y-4">
      <Link href="/supporter" className="text-xs font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> Tous les matchs
      </Link>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
      <MatchCard match={match}>
        {match.status === "live" && (
          <p className="text-[11px] font-bold text-coral text-center animate-soft-pulse">
            ● En direct — mise à jour automatique toutes les 5 s
          </p>
        )}
      </MatchCard>

      <section className="card p-5 space-y-3">
        <h3 className="text-sm font-black">Temps forts</h3>
        {sortedEvents.length === 0 && (
          <p className="text-xs text-ink-soft">Rien à signaler pour le moment.</p>
        )}
        {sortedEvents.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 text-sm bg-paper rounded-lg px-4 py-3 animate-rise-in">
            <span className="text-pitch-deep font-black tabular-nums text-xs bg-pitch-soft rounded-full px-2.5 py-1 shrink-0">
              {ev.minute}&apos;
            </span>
            {(() => {
              const Icon = EVENT_ICONS[ev.type];
              return <Icon size={15} className="text-pitch shrink-0" aria-hidden />;
            })()}
            <span className="flex-1 min-w-0">
              <span className="font-semibold">{ev.description}</span>
              <span className="text-ink-soft text-xs"> · {ev.side === "home" ? match.homeTeam.name : match.awayTeam.name}</span>
            </span>
          </div>
        ))}
      </section>
      </div>
    </div>
  );
}

export default function SupporterMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LiveMatch id={id} />;
}
