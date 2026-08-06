"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, MapPin, Megaphone, Trophy } from "lucide-react";
import type { ActivityDto, AnnouncementDto, MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { formatCountdown, kickoffDate, timeAgo, useNow } from "@/lib/time";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { MyAnnouncementCard } from "@/components/announcements/MyAnnouncementCard";
import { RadarFeed } from "@/components/announcements/RadarFeed";
import { NoMatchCard } from "@/components/coach/NoMatchCard";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const router = useRouter();
  const now = useNow(1000);
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [activity, setActivity] = useState<ActivityDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([
      api<MatchDto[]>("/matches"),
      api<AnnouncementDto[]>("/announcements/mine"),
      api<ActivityDto[]>("/activity"),
    ])
      .then(([m, a, act]) => {
        setMatches(m);
        setAnnouncements(a.filter((x) => x.status !== "cancelled"));
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

  // Accepter une proposition : le match est créé, on ouvre sa feuille de match
  async function acceptResponse(announcementId: string, responseId: string) {
    try {
      const { matchId } = await api<{ matchId: string }>(
        `/announcements/${announcementId}/responses/${responseId}/accept`,
        { method: "POST" },
      );
      router.push(`/coach/matches/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'accepter cette proposition");
      loadAll();
    }
  }

  async function declineResponse(announcementId: string, responseId: string) {
    await api(`/announcements/${announcementId}/responses/${responseId}/decline`, { method: "POST" }).catch(
      () => undefined,
    );
    loadAll();
  }

  // Un match qui réclame un geste passe devant : rencontre à valider au stade,
  // ou score final à saisir une fois rentré.
  const pending =
    matches?.filter((m) => (m.encounterOpen && !m.encounterConfirmedAt) || m.finalScoreDue) ?? [];
  const live = matches?.filter((m) => m.status === "live" && !m.finalScoreDue) ?? [];
  const upcoming = (matches?.filter((m) => m.status === "scheduled" && !m.finalScoreDue) ?? []).sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
  const featured = pending[0] ?? live[0] ?? upcoming[0] ?? null;

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

  return (
    <div className="grid gap-4 min-[960px]:grid-cols-[1fr_360px] items-start">
      {/* ————— Colonne principale ————— */}
      <div className="space-y-4 min-w-0">
        {/* Prochain match */}
        {featured ? (
          <section className="card p-5 space-y-4 animate-rise-in" aria-label="Prochain match">
            <div className="flex items-center justify-between gap-2">
              {featured.encounterOpen && !featured.encounterConfirmedAt ? (
                <span className="chip bg-accent-surface text-accent">
                  <Trophy size={12} /> Rencontre à valider
                </span>
              ) : featured.finalScoreDue ? (
                <span className="chip bg-coral-soft text-coral">
                  <AlertTriangle size={12} /> Score final à saisir
                </span>
              ) : featured.status === "live" ? (
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
                {featured.status === "live" || featured.status === "finished" ? (
                  <p className="display text-6xl tabular-nums leading-none text-primary">
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

            {/* L'action primaire de la carte descend en pleine largeur sous le
                contexte : au pouce, elle était trop haute et trop étroite. */}
            <div className="border-t border-line pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-ink-soft font-semibold flex items-center gap-1.5 min-w-0">
                  <MapPin size={13} className="text-blue shrink-0" />
                  <span className="truncate">{featured.location}</span>
                </div>
                {featured.status === "scheduled" && !featured.finalScoreDue && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">Avant coup d&apos;envoi</p>
                    <p className="display text-3xl leading-none text-primary tabular-nums">
                      {countdown ?? "Imminent"}
                    </p>
                  </div>
                )}
              </div>
              <ButtonLink
                href={`/coach/matches/${featured.id}`}
                size="lg"
                variant={featured.finalScoreDue ? "accent" : "primary"}
                className="w-full min-[960px]:w-auto min-[960px]:ml-auto min-[960px]:flex"
              >
                {featured.finalScoreDue ? "Saisir le score" : "Feuille de match"} <ChevronRight size={16} />
              </ButtonLink>
            </div>
          </section>
        ) : (
          <NoMatchCard />
        )}

        {/* Radar : les équipes qui cherchent un adversaire — cœur de la V1 */}
        <RadarFeed />
      </div>

      {/* ————— Colonne latérale ————— */}
      <div className="space-y-4 min-w-0">
        {/* Annonces actives */}
        <section className="card p-5 space-y-3 animate-rise-in" aria-label="Annonces actives">
          <div className="flex items-center justify-between">
            <h3 className="display text-lg">Mes annonces</h3>
            <ButtonLink href="/coach/announcements/new" variant="soft" size="sm">
              <Megaphone size={14} /> Publier
            </ButtonLink>
          </div>

          {announcements.length === 0 && (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              Aucune annonce en cours. Publiez-en une pour trouver un adversaire.
            </p>
          )}

          {announcements.map((a) => (
            <MyAnnouncementCard
              key={a.id}
              announcement={a}
              onAccept={acceptResponse}
              onDecline={declineResponse}
              onCancel={cancelAnnouncement}
            />
          ))}

          {announcements.length > 0 && (
            <Link
              href="/coach/announcements"
              className="flex items-center justify-center min-h-11 rounded-lg text-xs font-bold text-blue
                transition hover:text-blue-dark active:bg-blue-soft"
            >
              Voir toutes mes annonces
            </Link>
          )}
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
                    ev.type === "announcement" && "bg-sun-soft text-sun",
                    ev.type === "score" && "bg-success-soft text-success",
                  )}
                >
                  {ev.type === "announcement" && <Megaphone size={13} />}
                  {ev.type === "score" && <Trophy size={13} />}
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
