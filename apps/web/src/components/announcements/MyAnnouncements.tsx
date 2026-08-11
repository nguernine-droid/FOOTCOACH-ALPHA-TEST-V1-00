"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Trophy } from "lucide-react";
import { type AnnouncementDto, type TournamentDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { todayIso } from "@/lib/time";
import { cn } from "@/lib/utils";
import { MyAnnouncementCard } from "@/components/announcements/MyAnnouncementCard";
import { MyAnnouncementSheet } from "@/components/announcements/MyAnnouncementSheet";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

type Bucket = "ongoing" | "confirmed" | "past";

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "ongoing", label: "En cours" },
  { key: "confirmed", label: "Confirmées" },
  { key: "past", label: "Passées" },
];

/**
 * Dans quel casier tombe une de mes annonces.
 *
 * La date prime sur tout : une annonce d'hier est passée, qu'elle ait trouvé
 * preneur ou non — c'est le seul classement qui ne se discute pas. Ensuite, ce
 * qui sépare « en cours » de « confirmée » est qu'un coach se soit manifesté :
 * une proposition à trancher compte, elle aussi. Les annulées rejoignent les
 * passées : elles ne cherchent plus personne.
 */
function bucketOfAnnouncement(a: AnnouncementDto): Bucket {
  if (a.date < todayIso() || a.status === "cancelled") return "past";
  if (a.status === "matched" || a.responses.some((r) => r.status === "pending")) return "confirmed";
  return "ongoing";
}

/**
 * Un tournoi ne se confirme pas comme une annonce : il est « en cours » tant
 * qu'il reste une place. Une seule équipe inscrite sur huit attendues, ce n'est
 * pas un tournoi qui tient — c'est un tournoi qui cherche encore. Il ne passe en
 * confirmé qu'une fois complet.
 */
function bucketOfTournament(t: TournamentDto): Bucket {
  const lastDay = t.endDate ?? t.date;
  if (lastDay < todayIso() || t.status === "cancelled") return "past";
  return t.slotsLeft === 0 ? "confirmed" : "ongoing";
}

export type MyAnnouncements = {
  /** null tant que le premier chargement n'a pas répondu */
  announcements: AnnouncementDto[] | null;
  tournaments: TournamentDto[];
  error: string | null;
  /** Ce qui n'est pas encore passé — le nombre à porter sur un onglet */
  activeCount: number;
  reload: () => void;
  accept: (announcementId: string, responseId: string) => Promise<void>;
  decline: (announcementId: string, responseId: string) => Promise<void>;
  cancel: (announcementId: string) => Promise<void>;
};

/**
 * Ce que J'AI publié : mes annonces de match et les tournois que j'organise,
 * avec les décisions qui vont avec (accepter, décliner, annuler).
 *
 * Les données et les gestes vivent dans ce hook, la mise en page dans le
 * composant plus bas : le même contenu se lit depuis deux endroits — sa page
 * dédiée (« Moi › Mes annonces ») et l'onglet « Annonces » — et il n'était pas
 * question d'en tenir deux copies qui finiraient par diverger.
 */
export function useMyAnnouncements(): MyAnnouncements {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [mine, mesTournois] = await Promise.all([
        api<AnnouncementDto[]>("/announcements/mine"),
        // `/tournaments/mine` sert aussi ceux où je suis inscrit : ici on ne
        // garde que les miens, il s'agit de ce que j'ai publié.
        api<TournamentDto[]>("/tournaments/mine").catch(() => [] as TournamentDto[]),
      ]);
      setAnnouncements(mine);
      setTournaments(mesTournois.filter((t) => t.isMine));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Accepter une proposition crée le match : on enchaîne sur sa feuille de match
  const accept = useCallback(
    async (announcementId: string, responseId: string) => {
      try {
        const { matchId } = await api<{ matchId: string }>(
          `/announcements/${announcementId}/responses/${responseId}/accept`,
          { method: "POST" },
        );
        router.push(`/coach/matches/${matchId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible d'accepter cette proposition");
        reload();
      }
    },
    [reload, router],
  );

  const decline = useCallback(
    async (announcementId: string, responseId: string) => {
      await api(`/announcements/${announcementId}/responses/${responseId}/decline`, { method: "POST" }).catch(
        () => undefined,
      );
      reload();
    },
    [reload],
  );

  const cancel = useCallback(
    async (announcementId: string) => {
      await api(`/announcements/${announcementId}`, { method: "DELETE" }).catch(() => undefined);
      reload();
    },
    [reload],
  );

  const activeCount =
    (announcements ?? []).filter((a) => bucketOfAnnouncement(a) !== "past").length +
    tournaments.filter((t) => bucketOfTournament(t) !== "past").length;

  return { announcements, tournaments, error, activeCount, reload, accept, decline, cancel };
}

/**
 * Mes annonces, rangées en trois casiers. Sans en-tête ni titre : ce
 * composant est posé tantôt sous le bandeau de sa page, tantôt sous les
 * catégories de l'onglet « Annonces », et c'est à eux de dire où l'on est.
 */
export function MyAnnouncementsList({ mine }: { mine: MyAnnouncements }) {
  const { announcements, tournaments, error, accept, decline, cancel } = mine;
  const [bucket, setBucket] = useState<Bucket>("ongoing");
  /** Annonce dont le détail est ouvert — relue dans la liste, jamais copiée */
  const [detailId, setDetailId] = useState<string | null>(null);

  if (!announcements) return <CardGridSkeleton cards={3} />;

  const counts = BUCKETS.reduce<Record<Bucket, number>>(
    (acc, b) => {
      acc[b.key] =
        announcements.filter((a) => bucketOfAnnouncement(a) === b.key).length +
        tournaments.filter((t) => bucketOfTournament(t) === b.key).length;
      return acc;
    },
    { ongoing: 0, confirmed: 0, past: 0 },
  );

  const shownAnnouncements = announcements
    .filter((a) => bucketOfAnnouncement(a) === bucket)
    .sort((a, b) => a.date.localeCompare(b.date));
  const shownTournaments = tournaments
    .filter((t) => bucketOfTournament(t) === bucket)
    .sort((a, b) => a.date.localeCompare(b.date));
  const empty = shownAnnouncements.length === 0 && shownTournaments.length === 0;

  const detail = detailId ? (announcements.find((a) => a.id === detailId) ?? null) : null;

  return (
    <div className="space-y-4">
      {/* Trois casiers qui se partagent la largeur : cible large, pas de repli */}
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Filtrer mes annonces">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={bucket === b.key}
            onClick={() => setBucket(b.key)}
            // Même resserrement que la rangée des catégories au-dessus :
            // « Confirmées (2) » ne tient pas dans un tiers d'écran de téléphone
            // avec les 16 px de côté d'origine.
            className={cn("chip-choice px-2", bucket === b.key ? "chip-choice-on" : "chip-choice-off")}
          >
            <span className="truncate">{b.label}</span> ({counts[b.key]})
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {empty ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Megaphone size={22} />
          </span>
          <p className="text-sm font-bold">
            {bucket === "ongoing"
              ? "Rien en attente de réponse"
              : bucket === "confirmed"
                ? "Rien de confirmé pour l'instant"
                : "Rien de passé"}
          </p>
          {bucket === "ongoing" && (
            <>
              <p className="text-xs text-ink-soft">
                Publiez une annonce : elle apparaîtra chez les coachs de votre secteur.
              </p>
              <ButtonLink href="/coach/announcements/new" variant="soft" className="w-full sm:w-auto">
                Publier une annonce
              </ButtonLink>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {shownAnnouncements.length > 0 && (
            <section className="space-y-3" aria-label="Mes matchs amicaux">
              <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone size={13} aria-hidden /> Matchs amicaux ({shownAnnouncements.length})
              </h3>
              <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start">
                {shownAnnouncements.map((a) => (
                  // La carte porte déjà les décisions à prendre ; sa dernière
                  // ligne ouvre le détail complet — toutes les propositions, y
                  // compris celles qu'on a déjà tranchées.
                  <MyAnnouncementCard
                    key={a.id}
                    announcement={a}
                    onAccept={accept}
                    onDecline={decline}
                    onCancel={async (id) => {
                      setDetailId(null);
                      await cancel(id);
                    }}
                    showLocation
                    onOpenDetail={() => setDetailId(a.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {shownTournaments.length > 0 && (
            <section className="space-y-3" aria-label="Mes tournois">
              <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={13} aria-hidden /> Tournois que j&apos;organise ({shownTournaments.length})
              </h3>
              <div className="stagger grid gap-4 lg:grid-cols-2 items-start">
                {shownTournaments.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {detail && (
        <MyAnnouncementSheet
          announcement={detail}
          onClose={() => setDetailId(null)}
          onAccept={accept}
          onDecline={decline}
        />
      )}
    </div>
  );
}
