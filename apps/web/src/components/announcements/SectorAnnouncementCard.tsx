"use client";

import { CalendarDays, Clock3, MapPin, Navigation, UserMinus, XCircle } from "lucide-react";
import {
  categoryLabel,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
} from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { Button, ButtonLink } from "@/components/ui/Button";

const LEVEL_LABELS = { loisir: "Loisir", competition: "Compétition" } as const;

/**
 * L'annonce d'un AUTRE coach : ce qu'on lit avant de proposer de jouer.
 *
 * À ne pas confondre avec `MyAnnouncementCard`, qui montre l'autre versant —
 * mes annonces et les propositions que je dois trancher. Les deux cartes
 * parlent du même objet et ne servent jamais au même geste.
 *
 * Partagée entre le radar du tableau de bord et l'onglet « Annonces » : c'est
 * la même annonce, elle doit se lire pareil aux deux endroits.
 */
export function SectorAnnouncementCard({
  announcement: a,
  responding,
  onRespond,
  onWithdraw,
  selected = false,
  cardRef,
}: {
  announcement: AnnouncementDto;
  /** Un aller-retour est en cours sur cette annonce */
  responding: boolean;
  onRespond: (id: string) => void;
  onWithdraw: (id: string) => void;
  /** Mise en avant après un tap sur son maillot, côté radar */
  selected?: boolean;
  cardRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-lg border p-4 space-y-3 transition",
        selected ? "border-blue ring-2 ring-blue/15" : a.isSos ? "border-coral" : "border-line",
      )}
    >
      {/* Un match qui existe déjà et qu'il faut sauver : l'annonce le dit
          d'entrée, avec le motif — le coach juge s'il peut dépanner. */}
      {a.isSos && (
        <p className="-m-4 mb-0 rounded-t-lg bg-coral-soft px-4 py-2.5 text-xs font-bold text-coral flex items-start gap-2">
          <UserMinus size={14} className="shrink-0 mt-px" aria-hidden />
          <span>
            SOS — l&apos;adversaire s&apos;est désisté
            {a.sosReason && ` (${WITHDRAWAL_REASON_LABELS[a.sosReason].toLowerCase()})`}
            {a.sosDetails && <span className="block font-semibold text-ink-soft">{a.sosDetails}</span>}
          </span>
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "w-10 h-10 rounded-full text-white flex items-center justify-center text-xs font-black shrink-0",
              teamColor(a.team),
            )}
          >
            {teamInitials(a.team.name)}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{a.team.name}</p>
            <p className="text-xs text-ink-soft truncate">{a.team.city}</p>
          </div>
        </div>
        {a.distanceKm !== null && (
          <span className="chip bg-blue-soft text-primary shrink-0">
            <Navigation size={11} /> à {a.distanceKm.toLocaleString("fr-FR")} km
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="chip bg-pitch-soft text-primary">{categoryLabel(a.category)}</span>
        {a.gender && <span className="chip bg-pitch-soft text-primary">{MATCH_GENDER_LABELS[a.gender]}</span>}
        <span className="chip bg-pitch-soft text-primary">{a.format}</span>
        <span className="chip bg-paper text-ink-soft">{LEVEL_LABELS[a.level]}</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft font-semibold">
        <span className="flex items-center gap-1.5 capitalize">
          <CalendarDays size={13} className="text-pitch" /> {formatDate(a.date)} à {a.time}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-pitch" /> {a.stadium}, {a.city}
        </span>
      </div>

      {a.comment && (
        <div className="text-xs bg-paper rounded-lg px-4 py-3 space-y-0.5">
          <p className="font-bold text-ink-soft">Informations pratiques</p>
          <p className="text-ink-soft">{a.comment}</p>
        </div>
      )}

      {a.myResponseStatus === "pending" ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-sun bg-sun-soft rounded-lg px-4 py-3 flex items-center gap-2">
            <Clock3 size={14} className="shrink-0" />
            Proposition envoyée — en attente de validation du coach
          </p>
          <Button variant="ghost" className="w-full" onClick={() => onWithdraw(a.id)} disabled={responding}>
            {responding ? "Retrait…" : "Retirer ma proposition"}
          </Button>
        </div>
      ) : a.myResponseStatus === "declined" ? (
        <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-4 py-3 flex items-center gap-2">
          <XCircle size={14} className="shrink-0" />
          Proposition déclinée par le coach
        </p>
      ) : (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => onRespond(a.id)} disabled={responding}>
            {responding ? "Envoi…" : "Proposer de jouer"}
          </Button>
          {/* Le détail porte la carte du coach : on hésite moins à traverser le
              département quand on voit qui l'on va rencontrer. */}
          <ButtonLink href={`/coach/announcements/${a.id}`} variant="ghost" className="w-full">
            Voir le détail et le coach
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
