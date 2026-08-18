"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Navigation,
  UserMinus,
} from "lucide-react";
import {
  categoryLabel,
  DIVISION_LEVEL_LABELS,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { VenueLink } from "@/components/VenueLink";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { CoachCardSheet } from "@/components/coach/CoachCardSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Détail d'une annonce — l'écran qu'on ouvre depuis le radar avant de décider
 * si l'on propose un match.
 *
 * Sa raison d'être est la carte du coach : sur le radar on lit une équipe, ici
 * on voit QUI la mène. C'est ce qui manque quand on hésite à traverser le
 * département pour rencontrer un inconnu.
 */
export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [announcement, setAnnouncement] = useState<AnnouncementDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const load = useCallback(async () => {
    try {
      setAnnouncement(await api<AnnouncementDto>(`/announcements/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond() {
    setBusy(true);
    setError(null);
    try {
      await api(`/announcements/${id}/respond`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposition impossible");
    } finally {
      setBusy(false);
    }
  }

  async function withdrawResponse() {
    setBusy(true);
    setError(null);
    try {
      await api(`/announcements/${id}/respond`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrait impossible");
    } finally {
      setBusy(false);
    }
  }

  if (error && !announcement) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  }
  if (!announcement) return <Skeleton className="h-96" />;

  const a = announcement;
  const past = a.date < new Date().toISOString().slice(0, 10);
  const closed = a.status !== "open" || past;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link
        href="/coach"
        className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
          transition hover:text-ink active:bg-paper"
      >
        <ArrowLeft size={16} /> Retour au radar
      </Link>

      <section className="card p-5 space-y-4" aria-label="L'annonce">
        {a.isSos && (
          <p className="rounded-lg bg-coral-soft px-4 py-3 text-xs font-bold text-coral flex items-start gap-2">
            <UserMinus size={14} className="shrink-0 mt-px" aria-hidden />
            <span>
              SOS — l&apos;adversaire s&apos;est désisté
              {a.sosReason ? ` (${WITHDRAWAL_REASON_LABELS[a.sosReason].toLowerCase()})` : ""}
              {a.sosDetails ? ` : ${a.sosDetails}` : ""}
            </span>
          </p>
        )}

        <div className="space-y-1">
          <h2 className="display text-xl leading-tight">
            {categoryLabel(a.category)} · {a.format}
          </h2>
          <p className="text-xs text-ink-soft">Annonce de {a.team.name}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {/* Le plateau se signale ici aussi : c'est l'écran où l'on décide de proposer */}
          {a.plateau && (
            <span className="chip bg-accent-surface text-accent">
              Plateau ·{" "}
              {a.teamsWanted - a.teamsAccepted > 0
                ? `${a.teamsWanted - a.teamsAccepted} place${a.teamsWanted - a.teamsAccepted > 1 ? "s" : ""}`
                : "complet"}
            </span>
          )}
          <span className="chip bg-paper text-ink-soft">{categoryLabel(a.category)}</span>
          {a.gender && <span className="chip bg-paper text-ink-soft">{MATCH_GENDER_LABELS[a.gender]}</span>}
          <span className="chip bg-paper text-ink-soft">{a.format}</span>
          {a.level && <span className="chip bg-paper text-ink-soft">{DIVISION_LEVEL_LABELS[a.level]}</span>}
        </div>

        <div className="space-y-1 text-xs text-ink-soft">
          <p className="flex items-center gap-1.5 capitalize">
            <CalendarDays size={13} className="shrink-0" aria-hidden /> {formatDate(a.date)} · {a.time}
          </p>
          <p className="flex items-center gap-1.5">
            <VenueLink destination={`${a.stadium}, ${a.city}`} />
          </p>
          <div className="pt-1">
            <ReliabilityBadge reliability={a.reliability} detailed />
          </div>
          {a.distanceKm !== null && (
            <p className="flex items-center gap-1.5">
              <Navigation size={13} className="shrink-0" aria-hidden /> À {Math.round(a.distanceKm)} km de chez vous
            </p>
          )}
        </div>

        {/* Plus d'encart sur le délai FFF : il est rappelé dans les CGU
            acceptées à l'inscription, et le répéter à chaque écran d'annonce
            noyait les informations propres à la rencontre. */}

        {a.comment && (
          <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3 whitespace-pre-line">{a.comment}</p>
        )}
      </section>

      {/* ————— Le coach ————— */}
      {a.coach && (
        <section className="card p-5 space-y-3" aria-label="Le coach">
          <h3 className="display text-lg">Le coach</h3>
          <button
            type="button"
            onClick={() => setShowCard(true)}
            className="w-full flex items-center gap-3 rounded-lg bg-paper px-4 py-3 text-left transition
              hover:bg-blue-faint active:bg-blue-soft"
          >
            <Avatar
              name={a.coach.nickname}
              avatarUrl={a.coach.avatarUrl}
              size={44}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-bold truncate">
                {a.coach.nickname}
              </span>
              <span className="block text-xs text-ink-soft truncate">{a.team.name}</span>
            </span>
            <span className="chip bg-accent-surface text-accent shrink-0">Sa carte</span>
            <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
          </button>
        </section>
      )}

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {/* ————— Ma proposition ————— */}
      <section className="card p-5 space-y-3" aria-label="Ma proposition">
        {a.isMine ? (
          <>
            <p className="text-xs text-ink-soft">C&apos;est votre annonce.</p>
            <ButtonLink href="/coach/announcements" variant="soft" className="w-full">
              Voir les propositions reçues
            </ButtonLink>
          </>
        ) : a.matchId ? (
          <>
            <p className="rounded-lg bg-success-soft px-4 py-3 text-xs font-bold text-success flex items-center gap-2">
              <CheckCircle2 size={14} aria-hidden /> Ce match est confirmé
            </p>
            <ButtonLink href={`/coach/matches/${a.matchId}`} className="w-full">
              Ouvrir la feuille de match
            </ButtonLink>
          </>
        ) : closed ? (
          <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
            {past ? "La date est passée : cette annonce ne cherche plus personne." : "Cette annonce est pourvue."}
          </p>
        ) : a.myResponseStatus === "pending" ? (
          <>
            <p className="rounded-lg bg-blue-soft px-4 py-3 text-xs font-bold text-primary flex items-center gap-2">
              <Clock3 size={14} aria-hidden /> Votre proposition attend une réponse
            </p>
            <Button variant="danger" className="w-full" onClick={withdrawResponse} disabled={busy}>
              Retirer ma proposition
            </Button>
          </>
        ) : a.myResponseStatus === "declined" ? (
          <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
            Votre proposition a été déclinée pour cette annonce.
          </p>
        ) : (
          <>
            <p className="text-xs text-ink-soft">
              Le coach recevra votre proposition et pourra l&apos;accepter — le match sera alors confirmé.
            </p>
            <Button size="lg" className="w-full" onClick={respond} disabled={busy}>
              Proposer de jouer
            </Button>
          </>
        )}
      </section>

      {showCard && a.coach && <CoachCardSheet coachId={a.coach.id} onClose={() => setShowCard(false)} />}
    </div>
  );
}
