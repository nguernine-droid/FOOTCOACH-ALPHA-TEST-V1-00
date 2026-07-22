"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Lock,
  MapPin,
  Megaphone,
  Radar,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { ActivityDto, AnnouncementDto, LineupDto, LineupPlayerDto, MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { formatCountdown, kickoffDate, timeAgo, useNow } from "@/lib/time";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { Pitch } from "@/components/Pitch";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

// Emplacements du 4-3-3 par défaut (x/y en %, but adverse en haut)
const FORMATION_433 = [
  { x: 50, y: 91 },
  { x: 15, y: 75 }, { x: 38, y: 77 }, { x: 62, y: 77 }, { x: 85, y: 75 },
  { x: 25, y: 53 }, { x: 50, y: 56 }, { x: 75, y: 53 },
  { x: 20, y: 29 }, { x: 50, y: 25 }, { x: 80, y: 29 },
];

function deriveFormation(players: LineupPlayerDto[]): string | null {
  if (players.length < 5) return null;
  const byDepth = [...players].sort((a, b) => b.y - a.y);
  const goalkeeper = players.find((p) => p.position === "gardien") ?? byDepth[0];
  const field = players.filter((p) => p.playerId !== goalkeeper.playerId);
  const def = field.filter((p) => p.y >= 66).length;
  const att = field.filter((p) => p.y < 44).length;
  const mid = field.length - def - att;
  return `${def}-${mid}-${att}`;
}


function TeamSide({ team }: { team: MatchDto["homeTeam"] }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <span className={cn("w-16 h-16 rounded-full flex items-center justify-center text-lg font-black text-white", teamColor(team))}>
        {teamInitials(team.name)}
      </span>
      <p className="text-sm font-bold text-center leading-tight truncate w-full">{team.name}</p>
    </div>
  );
}

export default function CoachDashboard() {
  const now = useNow(1000);
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [activity, setActivity] = useState<ActivityDto[] | null>(null);
  const [lineup, setLineup] = useState<LineupDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revealAttempted = useRef(false);

  const loadAll = useCallback(() => {
    Promise.all([
      api<MatchDto[]>("/matches"),
      api<AnnouncementDto[]>("/announcements"),
      api<ActivityDto[]>("/activity"),
    ])
      .then(([m, a, act]) => {
        setMatches(m);
        setAnnouncements(a.filter((x) => x.isMine && x.status !== "cancelled"));
        setActivity(act);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function cancelAnnouncement(id: string) {
    await api(`/announcements/${id}`, { method: "DELETE" }).catch(() => undefined);
    loadAll();
  }

  const live = matches?.filter((m) => m.status === "live") ?? [];
  const upcoming = (matches?.filter((m) => m.status === "scheduled") ?? []).sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
  const featured = live[0] ?? upcoming[0] ?? null;
  const featuredId = featured?.id ?? null;

  const loadLineup = useCallback(() => {
    if (!featuredId) return;
    api<LineupDto>(`/matches/${featuredId}/lineup`).then(setLineup).catch(() => setLineup(null));
  }, [featuredId]);

  useEffect(() => {
    loadLineup();
  }, [loadLineup]);

  // Révélation automatique de la compo adverse quand le compte à rebours atteint zéro
  useEffect(() => {
    if (!lineup?.opponentLocked || revealAttempted.current) return;
    if (new Date(lineup.opponentVisibleAt) <= now) {
      revealAttempted.current = true;
      loadLineup();
    }
  }, [now, lineup, loadLineup]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;

  if (!matches || !announcements || !activity) {
    return (
      <div className="grid gap-4 min-[960px]:grid-cols-[1fr_360px] items-start" aria-busy>
        <div className="space-y-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const kickoff = featured ? kickoffDate(featured.date, featured.time) : null;
  const countdown = kickoff ? formatCountdown(kickoff.getTime() - now.getTime()) : null;
  const revealCountdown = lineup?.opponentLocked
    ? formatCountdown(new Date(lineup.opponentVisibleAt).getTime() - now.getTime())
    : null;
  const formation = lineup ? deriveFormation(lineup.mine) : null;

  return (
    <div className="grid gap-4 min-[960px]:grid-cols-[1fr_360px] items-start">
      {/* ————— Colonne principale ————— */}
      <div className="space-y-4 min-w-0">
        {/* Prochain match */}
        {featured ? (
          <section className="card p-5 space-y-4 animate-rise-in" aria-label="Prochain match">
            <div className="flex items-center justify-between gap-2">
              {featured.status === "live" ? (
                <span className="chip bg-coral-soft text-coral animate-soft-pulse">● En direct</span>
              ) : (
                <span className="chip bg-success-soft text-success">
                  <CheckCircle2 size={12} /> Match confirmé
                </span>
              )}
              <span className="text-xs font-semibold text-ink-soft capitalize">
                Match amical · {formatDate(featured.date)} · {featured.time}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <TeamSide team={featured.homeTeam} />
              <div className="shrink-0 text-center px-2">
                {featured.status === "live" ? (
                  <p className="display text-6xl tabular-nums leading-none text-navy-700">
                    {featured.homeScore}
                    <span className="text-ink-faint mx-2">–</span>
                    {featured.awayScore}
                  </p>
                ) : (
                  <p className="display text-2xl text-ink-faint">VS</p>
                )}
              </div>
              <TeamSide team={featured.awayTeam} />
            </div>

            <div className="border-t border-line pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-ink-soft font-semibold flex items-center gap-1.5 min-w-0">
                <MapPin size={13} className="text-blue shrink-0" />
                <span className="truncate">{featured.location}</span>
              </div>
              <div className="flex items-center gap-4">
                {featured.status === "scheduled" && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">Avant coup d&apos;envoi</p>
                    <p className="display text-3xl leading-none text-navy-700 tabular-nums">
                      {countdown ?? "Imminent"}
                    </p>
                  </div>
                )}
                <Link href={`/coach/matches/${featured.id}`}>
                  <Button size="sm">
                    Feuille de match <ChevronRight size={14} />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="card p-8 text-center space-y-3 animate-rise-in">
            <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
              <Radar size={20} />
            </span>
            <p className="text-sm font-bold">Aucun match programmé</p>
            <p className="text-xs text-ink-soft">Publiez une annonce ou répondez à une équipe sur le radar.</p>
            <div className="flex justify-center gap-2">
              <Link href="/coach/announcements/new"><Button size="sm">Publier une annonce</Button></Link>
              <Link href="/coach/radar"><Button variant="soft" size="sm">Ouvrir le radar</Button></Link>
            </div>
          </section>
        )}

        {/* Composition */}
        {featured && (
          <section className="card p-5 space-y-4 animate-rise-in" aria-label="Composition">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h3 className="display text-lg">Composition</h3>
                <span className="chip bg-blue-soft text-navy-700">{formation ?? "4-3-3"}</span>
              </div>
              <Link href={`/coach/matches/${featured.id}`}>
                <Button variant="soft" size="sm">Ajuster ma compo</Button>
              </Link>
            </div>
            <div className="max-w-md mx-auto w-full">
              <Pitch players={lineup?.mine ?? []} ghosts={FORMATION_433} />
            </div>
            {(lineup?.mine.length ?? 0) === 0 && (
              <p className="text-xs text-ink-soft text-center">
                Aucun joueur placé — le 4-3-3 proposé s&apos;affiche en pointillés. Placez vos joueurs depuis la feuille de match.
              </p>
            )}
          </section>
        )}
      </div>

      {/* ————— Colonne latérale ————— */}
      <div className="space-y-4 min-w-0">
        {/* Composition adverse */}
        {featured && lineup && (
          <section className="card p-5 space-y-4 animate-rise-in" aria-label="Composition adverse">
            <h3 className="display text-lg">Composition adverse</h3>

            {lineup.opponentLocked ? (
              <div className="relative rounded-lg bg-paper p-4 overflow-hidden">
                <div className="grid grid-cols-4 gap-2.5 blur-[3px] opacity-50 select-none" aria-hidden>
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className="w-9 h-9 rounded-full bg-ink-faint/50 mx-auto" />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-4">
                  <span className="w-9 h-9 rounded-full bg-navy-700 text-white flex items-center justify-center">
                    <Lock size={15} />
                  </span>
                  <p className="text-xs font-bold text-navy-700">
                    Se dévoile dans{" "}
                    <span className="display text-base tabular-nums">{revealCountdown ?? "un instant"}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-paper p-4 space-y-2">
                <p className="text-xs font-semibold text-ink-soft">
                  {lineup.opponent && lineup.opponent.length > 0
                    ? `${lineup.opponent.length} joueur${lineup.opponent.length > 1 ? "s" : ""} placé${lineup.opponent.length > 1 ? "s" : ""} par le coach adverse.`
                    : "Le coach adverse n'a pas encore placé de joueurs."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <Link href={`/coach/matches/${featured.id}`} className="w-full">
                <Button size="sm" className="w-full">Ajuster ma compo</Button>
              </Link>
              {lineup.opponentLocked ? (
                <span title="Visible 2 h avant le coup d'envoi" className="w-full">
                  <Button size="sm" variant="ghost" className="w-full" disabled aria-disabled>
                    <Lock size={13} /> Voir l&apos;adversaire
                  </Button>
                </span>
              ) : (
                <Link href={`/coach/matches/${featured.id}`} className="w-full">
                  <Button size="sm" variant="ghost" className="w-full">Voir l&apos;adversaire</Button>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Annonces actives */}
        <section className="card p-5 space-y-3 animate-rise-in" aria-label="Annonces actives">
          <div className="flex items-center justify-between">
            <h3 className="display text-lg">Mes annonces</h3>
            <Link href="/coach/announcements/new">
              <Button variant="soft" size="sm">
                <Megaphone size={13} /> Publier
              </Button>
            </Link>
          </div>

          {announcements.length === 0 && (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              Aucune annonce en cours. Publiez-en une pour trouver un adversaire.
            </p>
          )}

          {announcements.map((a) => {
            const inner = (
              <div
                className={cn(
                  "rounded-lg border border-line bg-white px-4 py-3 border-l-4 space-y-1 transition",
                  a.status === "open" ? "border-l-gold" : "border-l-success hover:bg-blue-faint",
                )}
              >
                <p className="text-sm font-bold capitalize">
                  {a.category} · {a.format} · {formatDate(a.date)} à {a.time}
                </p>
                {a.status === "open" ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-sun flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gold animate-soft-pulse shrink-0" aria-hidden />
                      En attente de réponse
                    </p>
                    <button
                      onClick={() => cancelAnnouncement(a.id)}
                      className="p-1.5 rounded-lg text-ink-faint hover:text-coral hover:bg-coral-soft transition"
                      aria-label="Annuler cette annonce"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="shrink-0" />
                    Réponse reçue — {a.opponentTeam ? `${a.opponentTeam.name} (${a.opponentTeam.city})` : "adversaire trouvé"}
                  </p>
                )}
              </div>
            );
            return a.status === "matched" && a.matchId ? (
              <Link key={a.id} href={`/coach/matches/${a.matchId}`} className="block">
                {inner}
              </Link>
            ) : (
              <div key={a.id}>{inner}</div>
            );
          })}
        </section>

        {/* Activités récentes */}
        <section className="card p-5 space-y-3 animate-rise-in" aria-label="Activités récentes">
          <h3 className="display text-lg">Activités récentes</h3>
          {activity.length === 0 && (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">Aucune activité pour le moment.</p>
          )}
          <ul className="space-y-2.5">
            {activity.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2.5 text-xs">
                <span
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    ev.type === "attendance" && "bg-success-soft text-success",
                    ev.type === "carpool" && "bg-blue-soft text-blue",
                    ev.type === "announcement" && "bg-sun-soft text-sun",
                  )}
                >
                  {ev.type === "attendance" && <UserCheck size={13} />}
                  {ev.type === "carpool" && <Car size={13} />}
                  {ev.type === "announcement" && <Megaphone size={13} />}
                </span>
                <div className="min-w-0">
                  <p className="text-ink leading-snug">
                    <span className="font-bold">{ev.actor}</span> {ev.detail}
                  </p>
                  <p className="text-[10px] text-ink-faint font-semibold">{timeAgo(ev.createdAt, now)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
