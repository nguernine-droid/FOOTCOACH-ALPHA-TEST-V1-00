"use client";

import Link from "next/link";
import { AlertTriangle, CalendarX, CheckCircle2, MapPin, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import {
  categoryLabel,
  FFF_NOTICE_DAYS,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
} from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";

/**
 * Une de mes annonces, avec ses propositions à valider.
 * Partagé entre la page « Annonces » et la carte du tableau de bord —
 * `showLocation` densifie l'affichage sur la page dédiée.
 */
export function MyAnnouncementCard({
  announcement: a,
  onAccept,
  onDecline,
  onCancel,
  showLocation = false,
}: {
  announcement: AnnouncementDto;
  onAccept: (announcementId: string, responseId: string) => void;
  onDecline: (announcementId: string, responseId: string) => void;
  onCancel: (announcementId: string) => void;
  showLocation?: boolean;
}) {
  const pending = a.responses.filter((r) => r.status === "pending");
  const noticeShort = a.noticeDays < FFF_NOTICE_DAYS;
  // La date est passée : le serveur a retiré l'annonce du radar et refuse les
  // propositions. Le délai FFF n'a plus de sens (il serait négatif).
  const past = a.date < new Date().toISOString().slice(0, 10);

  const body = (
    <div
      className={cn(
        "rounded-lg border border-line surface px-4 py-3 border-l-4 space-y-1.5 transition",
        a.status === "open" && (a.isSos ? "border-l-coral" : "border-l-accent"),
        a.status === "matched" && "border-l-success hover:bg-blue-faint",
        a.status === "cancelled" && "border-l-ink-faint opacity-70",
      )}
    >
      <p className="text-sm font-bold capitalize">
        {categoryLabel(a.category)}
        {a.gender && ` ${MATCH_GENDER_LABELS[a.gender]}`} · {a.format} · {formatDate(a.date)} à {a.time}
      </p>

      {showLocation && (
        <p className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
          <MapPin size={12} className="text-blue shrink-0" aria-hidden />
          <span className="truncate">
            {a.stadium}, {a.city}
          </span>
        </p>
      )}

      {/* Adversaire désisté : l'annonce est repartie en tête du radar */}
      {a.status === "open" && a.isSos && (
        <p className="rounded-lg bg-coral-soft px-3 py-2 text-xs font-bold text-coral flex items-start gap-2">
          <UserMinus size={13} className="shrink-0 mt-px" aria-hidden />
          <span>
            SOS — adversaire désisté
            {a.sosReason && ` (${WITHDRAWAL_REASON_LABELS[a.sosReason].toLowerCase()})`}
            <span className="block font-semibold text-ink-soft">
              Remise en tête du radar, les coachs du secteur ont été alertés.
            </span>
          </span>
        </p>
      )}

      {/* Conformité FFF : le délai de déclaration, et lui seul — l'attestation
          par annonce a laissé place à l'acceptation donnée à l'inscription.
          Une annonce repartie en SOS n'est pas réévaluée : la déclaration au
          district porte sur la tenue du match, pas sur l'identité de l'adversaire. */}
      <div className="flex flex-wrap gap-1.5">
        {past && a.status === "open" ? (
          <span className="chip bg-paper text-ink-soft">
            <CalendarX size={11} /> Date passée
          </span>
        ) : a.isSos ? (
          <span className="chip bg-success-soft text-success">
            <ShieldCheck size={11} /> Match déjà déclaré — délai sans objet
          </span>
        ) : noticeShort ? (
          <span className="chip bg-coral-soft text-coral">
            <AlertTriangle size={11} /> Délai FFF non respecté ({a.noticeDays} j)
          </span>
        ) : (
          <span className="chip bg-success-soft text-success">
            <ShieldCheck size={11} /> Délai FFF respecté
          </span>
        )}
      </div>

      {a.status === "open" && (
        <>
          <div className="flex items-center justify-between gap-2">
            {past ? (
              // Sans cette ligne, l'annonce restait « en attente de proposition »
              // pour toujours, sans dire qu'elle ne cherchait plus personne.
              <p className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ink-faint shrink-0" aria-hidden />
                Retirée du radar — la date est passée
              </p>
            ) : (
              <p className="text-xs font-semibold text-sun flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-soft-pulse shrink-0" aria-hidden />
                {pending.length === 0
                  ? "En attente de proposition"
                  : `${pending.length} proposition${pending.length > 1 ? "s" : ""} à valider`}
              </p>
            )}
            <button
              onClick={() => onCancel(a.id)}
              className="icon-btn -mr-2 text-ink-faint hover:text-coral hover:bg-coral-soft"
              aria-label="Annuler cette annonce"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {/* Adversaire sur une ligne, décision sur la suivante : les deux
              boutons tenaient sinon dans une centaine de pixels. */}
          {!past &&
            pending.map((r) => (
              <div key={r.id} className="bg-paper rounded-lg px-3 py-2.5 mt-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-7 h-7 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0",
                      teamColor(r.team),
                    )}
                  >
                    {teamInitials(r.team.name)}
                  </span>
                  <span className="flex-1 min-w-0 text-xs font-bold truncate">
                    {r.team.name}
                    <span className="text-ink-soft font-semibold"> · {r.team.city}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => onAccept(a.id, r.id)}>
                    Accepter
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDecline(a.id, r.id)}>
                    Décliner
                  </Button>
                </div>
              </div>
            ))}
        </>
      )}

      {a.status === "matched" && (
        <p className="text-xs font-semibold text-success flex items-center gap-1.5">
          <CheckCircle2 size={12} className="shrink-0" />
          Match confirmé — {a.opponentTeam ? `${a.opponentTeam.name} (${a.opponentTeam.city})` : "adversaire trouvé"}
        </p>
      )}

      {a.status === "cancelled" && <p className="text-xs font-semibold text-ink-faint">Annonce annulée</p>}
    </div>
  );

  return a.status === "matched" && a.matchId ? (
    <Link href={`/coach/matches/${a.matchId}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
