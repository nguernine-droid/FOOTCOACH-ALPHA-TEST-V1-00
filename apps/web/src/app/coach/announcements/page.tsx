"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Radar, Trophy } from "lucide-react";
import type { RadarDto, AnnouncementDto, TournamentDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SectorAnnouncementCard } from "@/components/announcements/SectorAnnouncementCard";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Ce que les autres coachs publient, en deux listes : les matchs amicaux et
 * les tournois.
 *
 * L'onglet montrait « mes annonces » — elles ont leur écran à elles, dans la
 * feuille « Moi ». Ici on vient chercher un adversaire, pas relire ce qu'on a
 * écrit : c'est la même matière que le radar, sans la carte ni les filtres,
 * pour qui préfère lire une liste que viser un maillot.
 *
 * Le périmètre reste celui du radar, réglé sur le tableau de bord : deux
 * réglages de portée qui pourraient diverger seraient un piège.
 */
export default function AnnouncementsPage() {
  const [radar, setRadar] = useState<RadarDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  /** Amicaux d'abord : c'est ce qu'on cherche neuf fois sur dix */
  const [kind, setKind] = useState<"matches" | "tournaments">("matches");

  const load = useCallback(async () => {
    try {
      setRadar(await api<RadarDto>("/announcements/radar"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string) {
    setResponding(id);
    setError(null);
    try {
      await api(`/announcements/${id}/respond`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de répondre");
      load();
    } finally {
      setResponding(null);
    }
  }

  async function withdraw(id: string) {
    setResponding(id);
    setError(null);
    try {
      await api(`/announcements/${id}/respond`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer la proposition");
      load();
    } finally {
      setResponding(null);
    }
  }

  if (!radar) return <CardGridSkeleton cards={3} />;

  // Les plus proches d'abord, les distances inconnues à la fin : c'est l'ordre
  // dans lequel on décide de se déplacer.
  const announcements = [...radar.items].sort((a: AnnouncementDto, b: AnnouncementDto) => {
    if (a.distanceKm === null) return b.distanceKm === null ? a.date.localeCompare(b.date) : 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm || a.date.localeCompare(b.date);
  });
  const tournaments = [...radar.tournaments].sort((a: TournamentDto, b: TournamentDto) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="space-y-6">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Megaphone size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Annonces du secteur</h2>
          <p className="text-xs text-white/80">
            Ce que les coachs autour de vous cherchent et organisent. Vos propres annonces sont dans
            « Moi › Mes annonces ».
          </p>
        </div>
        <ButtonLink href="/coach" variant="accent" className="shrink-0 w-full sm:w-auto">
          <Radar size={14} /> Voir sur la carte
        </ButtonLink>
      </div>

      {/* Deux catégories, en haut, l'une OU l'autre : les deux listes empilées
          obligeaient à faire défiler tout un secteur d'amicaux pour savoir s'il
          y avait un tournoi. On vient chercher l'un ou l'autre, rarement les
          deux à la fois. */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Catégorie d'annonces">
        {(
          [
            { key: "matches", label: "Matchs amicaux", icon: Megaphone, count: announcements.length },
            { key: "tournaments", label: "Tournois", icon: Trophy, count: tournaments.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={kind === t.key}
            onClick={() => setKind(t.key)}
            className={cn("chip-choice", kind === t.key ? "chip-choice-on" : "chip-choice-off")}
          >
            <t.icon size={13} aria-hidden />
            <span className="truncate">{t.label}</span> ({t.count})
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {kind === "matches" && (
        <section className="space-y-3" aria-label="Matchs amicaux du secteur">
        {announcements.length === 0 ? (
          <div className="rounded-lg bg-paper px-4 py-8 text-center space-y-3">
            <p className="text-sm font-bold">Aucun match cherché autour de vous</p>
            <p className="text-xs text-ink-soft">
              Publiez le vôtre : il apparaîtra chez les autres coachs du secteur.
            </p>
            <ButtonLink href="/coach/announcements/new" variant="soft" className="w-full sm:w-auto">
              Publier une annonce
            </ButtonLink>
          </div>
        ) : (
          <div className="stagger grid gap-4 lg:grid-cols-2 items-start">
            {announcements.map((a) => (
              <SectorAnnouncementCard
                key={a.id}
                announcement={a}
                responding={responding === a.id}
                onRespond={respond}
                onWithdraw={withdraw}
              />
            ))}
          </div>
        )}
        </section>
      )}

      {kind === "tournaments" && (
        <section className="space-y-3" aria-label="Tournois du secteur">
        {tournaments.length === 0 ? (
          <div className="rounded-lg bg-paper px-4 py-8 text-center space-y-3">
            <p className="text-sm font-bold">Aucun tournoi annoncé autour de vous</p>
            <p className="text-xs text-ink-soft">Vous pouvez être le premier à en organiser un.</p>
            <ButtonLink href="/coach/tournaments/new" variant="soft" className="w-full sm:w-auto">
              Organiser un tournoi
            </ButtonLink>
          </div>
        ) : (
          <div className="stagger grid gap-4 lg:grid-cols-2 items-start">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
        </section>
      )}
    </div>
  );
}
