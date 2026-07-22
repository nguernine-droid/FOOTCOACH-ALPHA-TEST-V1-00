"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Goal, Navigation, ShieldCheck, Sparkles, Square } from "lucide-react";
import type { LineupDto, MatchDetailDto, MatchEventType } from "@footcoach/shared";
import { api, getStoredUser } from "@/lib/api";
import { ConvocationCard } from "@/components/player/ConvocationCard";
import { PresenceNow } from "@/components/player/PresenceNow";
import { CarpoolSection } from "@/components/CarpoolSection";
import { Pitch } from "@/components/Pitch";
import { Skeleton } from "@/components/ui/Skeleton";

const POLL_INTERVAL_MS = 5000;

const EVENT_ICONS: Record<MatchEventType, React.ElementType> = {
  goal: Goal,
  card: Square,
  substitution: ArrowLeftRight,
  highlight: Sparkles,
};

export default function PlayerMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetailDto | null>(null);
  const [lineup, setLineup] = useState<LineupDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const myId = getStoredUser()?.id;

  // Polling : score et temps forts se rafraîchissent sans recharger la page
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
  }, [id, version]);

  useEffect(() => {
    api<LineupDto>(`/matches/${id}/lineup`)
      .then(setLineup)
      .catch(() => setLineup(null));
  }, [id]);

  if (error && !match) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!match) {
    return (
      <div className="max-w-[720px] mx-auto space-y-4" aria-busy aria-label="Chargement">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const sortedEvents = [...match.events].sort((a, b) => b.minute - a.minute);
  const isPlaced = Boolean(myId && lineup?.mine.some((p) => p.playerId === myId));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link href="/player/matches" className="text-xs font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> Mes matchs
      </Link>

      <ConvocationCard match={match} onChanged={() => setVersion((v) => v + 1)} />

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="card p-4 flex items-center gap-3 text-sm font-bold hover:bg-blue-faint transition"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <Navigation size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block truncate">{match.location}</span>
          <span className="block text-xs font-semibold text-ink-soft">Ouvrir l&apos;itinéraire</span>
        </span>
      </a>

      {(match.status !== "scheduled" || sortedEvents.length > 0) && (
        <section className="card p-5 space-y-3" aria-label="Temps forts">
          <h3 className="text-sm font-black">Temps forts</h3>
          {match.status === "live" && (
            <p className="text-[11px] font-bold text-coral animate-soft-pulse">
              ● En direct — mise à jour automatique toutes les 5 s
            </p>
          )}
          {sortedEvents.length === 0 && <p className="text-xs text-ink-soft">Rien à signaler pour le moment.</p>}
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
      )}

      <PresenceNow matchId={id} version={version} />

      <section className="card p-5 space-y-3" aria-label="Covoiturage">
        <h3 className="text-sm font-black">Covoiturage pour ce match</h3>
        <CarpoolSection matchId={id} canBook />
      </section>

      <section className="card p-5 space-y-3" aria-label="Composition">
        <h3 className="text-sm font-black">Composition de mon équipe</h3>
        {lineup && lineup.mine.length > 0 ? (
          <>
            {isPlaced && (
              <p className="text-xs font-bold text-success bg-success-soft rounded-lg px-4 py-2.5 flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0" /> Tu es dans la composition.
              </p>
            )}
            <div className="max-w-sm mx-auto w-full">
              <Pitch players={lineup.mine} />
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-soft">Le coach n&apos;a pas encore publié la composition.</p>
        )}
      </section>
    </div>
  );
}
