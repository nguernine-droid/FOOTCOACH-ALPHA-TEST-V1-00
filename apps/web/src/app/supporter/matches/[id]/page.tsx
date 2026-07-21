"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Goal, RectangleVertical, Repeat, Star } from "lucide-react";
import type { MatchDetailDto, MatchEventType } from "@footcoach/shared";
import { RoleGuard } from "@/components/RoleGuard";
import { MatchCard } from "@/components/MatchCard";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 5000;

const EVENT_ICONS: Record<MatchEventType, React.ReactNode> = {
  goal: <Goal size={15} className="text-neon-green" />,
  card: <RectangleVertical size={15} className="text-brand-yellow" />,
  substitution: <Repeat size={15} className="text-sky-blue" />,
  highlight: <Star size={15} className="text-neon-orange" />,
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

  if (error && !match) return <p className="text-sm text-match-red">{error}</p>;
  if (!match) return <p className="text-white/40 animate-soft-pulse text-sm">Chargement…</p>;

  const sortedEvents = [...match.events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="space-y-6">
      <Link href="/supporter" className="text-xs text-white/50 hover:text-white flex items-center gap-1">
        <ArrowLeft size={13} /> Tous les matchs
      </Link>

      <MatchCard match={match}>
        {match.status === "live" && (
          <p className="text-[10px] uppercase tracking-widest text-match-red font-bold text-center animate-soft-pulse pt-1">
            ● Mise à jour automatique toutes les 5 s
          </p>
        )}
      </MatchCard>

      <section className="card-cyber p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Temps forts</h3>
        {sortedEvents.length === 0 && <p className="text-xs text-white/40">Aucun temps fort pour le moment.</p>}
        {sortedEvents.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 text-sm border-b border-white/5 pb-2 last:border-0">
            <span className="text-neon-orange font-black tabular-nums w-9">{ev.minute}&apos;</span>
            {EVENT_ICONS[ev.type]}
            <span className="flex-1">
              {ev.description}
              <span className="text-white/40 text-xs"> · {ev.side === "home" ? match.homeTeam.name : match.awayTeam.name}</span>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function SupporterMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RoleGuard role="supporter">
      <LiveMatch id={id} />
    </RoleGuard>
  );
}
