"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Megaphone, Radar } from "lucide-react";
import type { RadarDto, AnnouncementDto, TournamentDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PublicationsFeedView, usePublicationsFeed } from "@/components/publications/PublicationsFeed";
import { SectorAnnouncementCard } from "@/components/announcements/SectorAnnouncementCard";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Tout ce qui se publie autour de soi, en trois catégories : les matchs
 * amicaux du secteur, les tournois, et les publications des contributeurs.
 *
 * Les deux premières sont ce que les AUTRES cherchent — la même matière que le
 * radar, sans la carte ni les filtres, pour qui préfère lire une liste que
 * viser un maillot. La troisième est le panneau d'affichage du secteur : les
 * billets d'information des coachs contributeurs — poules des matchs
 * officiels, intempéries qui annulent. Ses propres annonces, elles, vivent
 * dans la feuille « Moi › Mes annonces ».
 *
 * Le périmètre reste celui du radar, réglé sur le tableau de bord : deux
 * réglages de portée qui pourraient diverger seraient un piège.
 */
function AnnouncementsPageContent() {
  const [radar, setRadar] = useState<RadarDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  // `?cat=publications` : le tableau de bord pointe directement le panneau
  // d'affichage — arriver sur « Amicaux » obligerait à un second geste.
  const searchParams = useSearchParams();
  /** Amicaux d'abord : c'est ce qu'on cherche neuf fois sur dix */
  const [kind, setKind] = useState<"matches" | "tournaments" | "publications">(() => {
    const cat = searchParams.get("cat");
    return cat === "publications" || cat === "tournaments" ? cat : "matches";
  });
  const feed = usePublicationsFeed();

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
          <h2 className="display text-lg">Annonces</h2>
          <p className="text-xs text-white/80">
            Ce que les coachs autour de vous cherchent et organisent — et, dans « Publications », les
            informations du secteur.
          </p>
        </div>
        <ButtonLink href="/coach" variant="accent" className="shrink-0 w-full sm:w-auto">
          <Radar size={14} /> Voir sur la carte
        </ButtonLink>
      </div>

      {/* Trois catégories, en haut, une seule à la fois : les listes empilées
          obligeaient à faire défiler tout un secteur d'amicaux pour savoir s'il
          y avait un tournoi. On vient chercher l'une ou l'autre, rarement deux
          à la fois.

          Libellés courts et sans icône : à trois par rangée sur un téléphone,
          « Matchs amicaux » et sa pastille ne tiennent plus, et un libellé
          tronqué renseigne moins qu'un mot entier. */}
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Catégorie d'annonces">
        {(
          [
            { key: "matches", label: "Amicaux", count: announcements.length },
            { key: "tournaments", label: "Tournois", count: tournaments.length },
            { key: "publications", label: "Publications", count: feed.posts?.length ?? 0 },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={kind === t.key}
            onClick={() => setKind(t.key)}
            // `px-2` : à trois par rangée, les 16 px de côté de `.chip-choice`
            // mangeaient le libellé sur un téléphone. La hauteur de 44 px, elle,
            // ne bouge pas — c'est la cible qui compte, pas la marge.
            className={cn("chip-choice px-2", kind === t.key ? "chip-choice-on" : "chip-choice-off")}
          >
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

      {/* Le panneau d'affichage du secteur : lecture pour tous, rédaction pour
          les contributeurs — le formulaire vit dans le composant. */}
      {kind === "publications" && (
        <section className="space-y-3" aria-label="Publications des contributeurs">
          <PublicationsFeedView feed={feed} />
        </section>
      )}
    </div>
  );
}

/** `useSearchParams` impose la frontière Suspense — la silhouette est la même qu'au chargement. */
export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton cards={3} />}>
      <AnnouncementsPageContent />
    </Suspense>
  );
}
