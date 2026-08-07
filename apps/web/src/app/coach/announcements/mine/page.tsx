"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Trophy } from "lucide-react";
import { FFF_NOTICE_DAYS, type AnnouncementDto, type TournamentDto } from "@footcoach/shared";
import { api } from "@/lib/api";
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

/**
 * Ce que J'AI publié — annonces de match et tournois que j'organise, dans trois
 * casiers. L'onglet « Annonces » montre celles des autres ; ici on suit les
 * siennes, et c'est le seul écran d'où l'on tranche une proposition reçue.
 */
export default function MyAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("ongoing");
  /** Annonce dont le détail est ouvert — relue dans la liste, jamais copiée */
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, mesTournois] = await Promise.all([
        api<AnnouncementDto[]>("/announcements/mine"),
        // `/tournaments/mine` sert aussi ceux où je suis inscrit : ici on ne
        // garde que les miens, c'est une page de ce que j'ai publié.
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
    load();
  }, [load]);

  // Accepter une proposition crée le match : on enchaîne sur sa feuille de match
  async function accept(announcementId: string, responseId: string) {
    try {
      const { matchId } = await api<{ matchId: string }>(
        `/announcements/${announcementId}/responses/${responseId}/accept`,
        { method: "POST" },
      );
      router.push(`/coach/matches/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'accepter cette proposition");
      load();
    }
  }

  async function decline(announcementId: string, responseId: string) {
    await api(`/announcements/${announcementId}/responses/${responseId}/decline`, { method: "POST" }).catch(
      () => undefined,
    );
    load();
  }

  async function cancel(id: string) {
    await api(`/announcements/${id}`, { method: "DELETE" }).catch(() => undefined);
    setDetailId(null);
    load();
  }

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

  const detail = detailId ? announcements.find((a) => a.id === detailId) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Megaphone size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Mes annonces</h2>
          <p className="text-xs text-white/80">
            Ce que vous avez publié : vos recherches d&apos;adversaire et les tournois que vous organisez.
          </p>
        </div>
        <ButtonLink href="/coach/announcements/new" variant="accent" className="shrink-0 w-full sm:w-auto">
          <Megaphone size={14} /> Publier une annonce
        </ButtonLink>
      </div>

      {/* Trois casiers qui se partagent la largeur : cible large, pas de repli */}
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Filtrer mes annonces">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={bucket === b.key}
            onClick={() => setBucket(b.key)}
            className={cn("chip-choice", bucket === b.key ? "chip-choice-on" : "chip-choice-off")}
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
            <p className="text-xs text-ink-soft">
              Publiez une annonce : elle apparaîtra chez les coachs de votre secteur. Le délai de déclaration au
              district est de {FFF_NOTICE_DAYS} jours.
            </p>
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
                    onCancel={cancel}
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
