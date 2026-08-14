"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, MapPin, Megaphone, Trophy, Users } from "lucide-react";
import {
  categoryLabel,
  type ActivityDto,
  type AnnouncementDto,
  type CategoryStatsDto,
  type MatchDto,
  type PublicationDto,
  type TournamentDto,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { formatCountdown, kickoffDate, timeAgo, todayIso, useNow } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { MyAnnouncementCard } from "@/components/announcements/MyAnnouncementCard";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { RadarFeed } from "@/components/announcements/RadarFeed";
import { NoMatchCard } from "@/components/coach/NoMatchCard";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Une case du bandeau : un chiffre, ce qu'il compte, et où il mène.
 *
 * Trois tons pour trois natures — les confrères (bleu), ce qu'ils cherchent
 * (accent), les tournois (jaune) : on retrouve sa case à la couleur avant
 * d'avoir lu le libellé, ce qui compte sur un bandeau qu'on balaie.
 */
function StatTile({
  href,
  icon,
  tone,
  count,
  label,
  className,
}: {
  href: string;
  icon: React.ReactNode;
  tone: "blue" | "accent" | "sun";
  count: number;
  label: string;
  className?: string;
}) {
  const tones = {
    blue: "bg-blue-soft text-blue",
    accent: "bg-accent-surface text-accent",
    sun: "bg-sun-soft text-sun",
  } as const;
  return (
    <Link
      href={href}
      className={cn(
        "card p-4 flex items-center gap-2.5 transition hover:bg-blue-faint active:bg-blue-soft",
        className,
      )}
    >
      <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tones[tone])}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-xs text-ink-soft font-semibold leading-tight">
        <span className="block text-lg font-black text-ink leading-none tabular-nums">{count}</span>
        {label}
      </span>
      <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
    </Link>
  );
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
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [activity, setActivity] = useState<ActivityDto[] | null>(null);
  const [publications, setPublications] = useState<PublicationDto[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([
      api<MatchDto[]>("/matches"),
      api<AnnouncementDto[]>("/announcements/mine"),
      api<ActivityDto[]>("/activity"),
      // Les tournois que j'organise tiennent la même place que mes annonces :
      // c'est publié par moi, ça attend des équipes, et ça se suit d'ici.
      api<TournamentDto[]>("/tournaments/mine").catch(() => [] as TournamentDto[]),
      // Les billets des contributeurs — en repli silencieux : un panneau
      // d'affichage vide ne doit pas faire tomber le tableau de bord.
      api<PublicationDto[]>("/publications").catch(() => [] as PublicationDto[]),
      // Le bandeau du haut — jamais bloquant : sans équipe active ou sans
      // catégorie réglée, il reste simplement absent.
      api<CategoryStatsDto>("/announcements/category-stats").catch(() => null),
    ])
      .then(([m, a, act, t, pubs, catStats]) => {
        setMatches(m);
        // En cours seulement : une annonce matchée devient un match, déjà
        // montré par la carte du prochain match — la répéter ici ferait doublon.
        setAnnouncements(a.filter((x) => x.status === "open"));
        setActivity(act);
        // Ceux que j'organise seulement, et seulement s'ils sont à venir : le
        // tableau de bord dit ce qui reste à faire, pas ce qui a eu lieu.
        setTournaments(
          t.filter((x) => x.isMine && x.status !== "cancelled" && (x.endDate ?? x.date) >= todayIso()),
        );
        // Les cinq derniers : le tableau de bord donne le fil de l'actualité,
        // l'onglet Annonces garde le panneau entier.
        setPublications(pubs.slice(0, 5));
        setCategoryStats(catStats);
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
  // Rien en cours, rien qui attend : le radar EST la tâche du jour, il monte
  // en tête d'écran plutôt que d'attendre sous des sections vides.
  const radarToTop = announcements.length === 0 || !featured;

  return (
    <div className="space-y-4">
      {/* Bandeau : où en est ma catégorie dans le secteur, avant même d'ouvrir
          le radar. Absent tant que l'équipe active n'a pas de catégorie
          réglée — rien à situer sans elle. */}
      {categoryStats?.category && (
        <section
          // Trois cases sur une grille de deux colonnes : les coachs et les
          // amicaux côte à côte, les tournois en dessous sur toute la largeur —
          // ce sont eux qu'on consulte le moins souvent.
          className="grid grid-cols-2 gap-3 animate-rise-in"
          aria-label="Ma catégorie dans le secteur"
        >
          {/* Chaque case MÈNE quelque part : un chiffre qu'on ne peut pas
              ouvrir laisse le coach devant un constat sans suite. */}
          <StatTile
            href="/coach/coachs"
            icon={<Users size={16} aria-hidden />}
            tone="blue"
            count={categoryStats.teamsInCategory}
            label={`coach${categoryStats.teamsInCategory > 1 ? "s" : ""} ${categoryLabel(categoryStats.category)} dans le secteur`}
          />
          <StatTile
            href={`/coach/announcements?cat=matches&categorie=${encodeURIComponent(categoryStats.category)}`}
            icon={<Megaphone size={16} aria-hidden />}
            tone="accent"
            count={categoryStats.announcementsInCategory}
            label={`amical${categoryStats.announcementsInCategory > 1 ? "s" : ""} ${categoryLabel(categoryStats.category)} en ce moment`}
          />
          <StatTile
            href={`/coach/announcements?cat=tournaments&categorie=${encodeURIComponent(categoryStats.category)}`}
            icon={<Trophy size={16} aria-hidden />}
            tone="sun"
            count={categoryStats.tournamentsInCategory}
            label={`tournoi${categoryStats.tournamentsInCategory > 1 ? "s" : ""} ouvert${categoryStats.tournamentsInCategory > 1 ? "s" : ""} à ma catégorie`}
            className="col-span-2"
          />
        </section>
      )}

      <div className="grid gap-4 min-[960px]:grid-cols-[1fr_360px] items-start">
      {/* ————— Colonne principale ————— */}
      <div className="space-y-4 min-w-0">
        {/* Rien en cours, rien qui attend : le radar prend la tête de l'écran,
            avant même « Mes annonces ». */}
        {radarToTop && <RadarFeed />}

        {/* Annonces en cours : en tête du dashboard sinon, une annonce publiée
            doit se voir tout de suite — avant même le prochain match. */}
        <section className="card p-5 space-y-3 animate-rise-in" aria-label="Annonces en cours">
          <div className="flex items-center justify-between">
            <h3 className="display text-lg">Mes annonces en cours</h3>
            <ButtonLink href="/coach/announcements/new" variant="soft" size="sm">
              <Megaphone size={14} /> Publier
            </ButtonLink>
          </div>

          {announcements.length === 0 && tournaments.length === 0 && (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              Aucune annonce en cours. Publiez-en une pour trouver un adversaire.
            </p>
          )}

          {announcements.map((a) => (
            <MyAnnouncementCard key={a.id} announcement={a} onCancel={cancelAnnouncement} />
          ))}

          {/* Les tournois que j'organise, sous les annonces : ils se préparent
              plus à l'avance, et une place vide s'y voit d'un coup d'œil. */}
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}

          {(announcements.length > 0 || tournaments.length > 0) && (
            <Link
              href="/coach/announcements/mine"
              className="flex items-center justify-center min-h-11 rounded-lg text-xs font-bold text-blue
                transition hover:text-blue-dark active:bg-blue-soft"
            >
              Voir toutes mes annonces
            </Link>
          )}
        </section>

        {/* Prochain match */}
        {featured && (
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
        )}

        {/* Sans match prévu, l'appel à publier suit le radar (déjà remonté
            en tête, ou juste en dessous des annonces s'il y en a en cours). */}
        {!featured && <NoMatchCard />}

        {/* Radar : les équipes qui cherchent un adversaire — cœur de la V1.
            Déjà affiché en tête si `radarToTop`, sinon il vient ici, après
            les annonces et le prochain match. */}
        {!radarToTop && <RadarFeed />}
      </div>

      {/* ————— Colonne latérale ————— */}
      <div className="space-y-4 min-w-0">
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

        {/* Les cinq derniers billets des contributeurs, en pied de tableau de
            bord : l'actualité du secteur se survole d'ici, se lit en entier
            dans l'onglet Annonces. Rien à faire dessus — donc en dernier. */}
        <section className="card p-5 space-y-3 animate-rise-in" aria-label="Dernières publications">
          <h3 className="display text-lg">Publications</h3>
          {publications.length === 0 ? (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              Aucune information du secteur pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {publications.map((p) => (
                <li key={p.id} className="flex items-start gap-2.5 text-xs">
                  <Avatar name={p.author.nickname} avatarUrl={p.author.avatarUrl} size={28} className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="leading-snug">
                      <span className="font-bold">{p.author.nickname}</span>{" "}
                      <span className="text-[10px] text-ink-faint font-semibold">{timeAgo(p.createdAt, now)}</span>
                    </p>
                    {/* Deux lignes d'aperçu : de quoi savoir si le billet me
                        concerne, pas de quoi le lire à la place du panneau. */}
                    <p className="text-ink leading-snug line-clamp-2">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/coach/announcements?cat=publications"
            className="flex items-center justify-center min-h-11 rounded-lg text-xs font-bold text-blue
              transition hover:text-blue-dark active:bg-blue-soft"
          >
            Voir toutes les publications
          </Link>
        </section>
      </div>
      </div>
    </div>
  );
}
