"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  UserMinus,
  XCircle,
} from "lucide-react";
import {
  categoryLabel,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
} from "@teamnexus/shared";
import { todayIso } from "@/lib/time";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";

const LEVEL_LABELS = { loisir: "Loisir", competition: "Compétition" } as const;

/**
 * Le détail d'une de mes annonces : ce qu'elle dit, et qui y a répondu.
 *
 * Les propositions y figurent TOUTES, déclinées comprises — la carte de la
 * liste ne montre que celles qui attendent une décision, et une proposition
 * qu'on a déclinée par erreur devenait introuvable.
 */
export function MyAnnouncementSheet({
  announcement: a,
  onClose,
  onAccept,
  onDecline,
}: {
  announcement: AnnouncementDto;
  onClose: () => void;
  onAccept: (announcementId: string, responseId: string) => void;
  onDecline: (announcementId: string, responseId: string) => void;
}) {
  const past = a.date < todayIso();
  const decidable = a.status === "open" && !past;

  return (
    <BottomSheet
      label={`Annonce du ${formatDate(a.date)}`}
      onClose={onClose}
      footer={
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div className="px-5 pt-1 pb-4 space-y-4">
        <div className="space-y-1">
          <h2 className="display text-lg capitalize">
            {categoryLabel(a.category)}
            {a.gender && ` ${MATCH_GENDER_LABELS[a.gender]}`} · {a.format}
          </h2>
          <p className="text-xs text-ink-soft font-semibold">
            {a.status === "matched"
              ? "Match confirmé"
              : a.status === "cancelled"
                ? "Annonce annulée"
                : past
                  ? "Date passée — retirée du radar"
                  : "En recherche d'adversaire"}
          </p>
        </div>

        {a.status === "open" && a.isSos && (
          <p className="rounded-lg bg-coral-soft px-4 py-2.5 text-xs font-bold text-coral flex items-start gap-2">
            <UserMinus size={14} className="shrink-0 mt-px" aria-hidden />
            <span>
              SOS — l&apos;adversaire s&apos;est désisté
              {a.sosReason && ` (${WITHDRAWAL_REASON_LABELS[a.sosReason].toLowerCase()})`}
            </span>
          </p>
        )}

        <div className="space-y-1.5 text-xs text-ink-soft font-semibold">
          <p className="flex items-center gap-1.5 capitalize">
            <CalendarDays size={13} className="text-pitch shrink-0" aria-hidden /> {formatDate(a.date)} à {a.time}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin size={13} className="text-pitch shrink-0" aria-hidden /> {a.stadium}, {a.city}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-pitch-soft text-primary">{categoryLabel(a.category)}</span>
          {a.gender && <span className="chip bg-pitch-soft text-primary">{MATCH_GENDER_LABELS[a.gender]}</span>}
          <span className="chip bg-pitch-soft text-primary">{a.format}</span>
          <span className="chip bg-paper text-ink-soft">{LEVEL_LABELS[a.level]}</span>
        </div>

        {a.comment && (
          <div className="text-xs bg-paper rounded-lg px-4 py-3 space-y-0.5">
            <p className="font-bold text-ink-soft">Informations pratiques</p>
            <p className="text-ink-soft">{a.comment}</p>
          </div>
        )}

        {/* Participants */}
        <div className="space-y-2 border-t border-line pt-4">
          <h3 className="section-title text-xs text-secondary">
            {a.status === "matched" ? "Adversaire" : `Propositions reçues (${a.responses.length})`}
          </h3>

          {a.status === "matched" && a.opponentTeam ? (
            <div className="flex items-center gap-3 rounded-lg bg-success-soft px-4 py-3">
              <span
                className={cn(
                  "w-9 h-9 rounded-full text-white flex items-center justify-center text-[11px] font-black shrink-0",
                  teamColor(a.opponentTeam),
                )}
              >
                {teamInitials(a.opponentTeam.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold truncate">{a.opponentTeam.name}</span>
                <span className="block text-xs text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} aria-hidden /> {a.opponentTeam.city}
                </span>
              </span>
            </div>
          ) : a.responses.length === 0 ? (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              Personne n&apos;a encore proposé de jouer.
            </p>
          ) : (
            a.responses.map((r) => (
              <div key={r.id} className="rounded-lg bg-paper px-4 py-3 space-y-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0",
                      teamColor(r.team),
                    )}
                  >
                    {teamInitials(r.team.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold truncate">{r.team.name}</span>
                    <span className="block text-[11px] text-ink-soft font-semibold truncate">{r.team.city}</span>
                  </span>
                  {r.status === "pending" ? (
                    <span className="chip bg-sun-soft text-sun shrink-0">
                      <Clock3 size={11} aria-hidden /> À trancher
                    </span>
                  ) : r.status === "accepted" ? (
                    <span className="chip bg-success-soft text-success shrink-0">
                      <CheckCircle2 size={11} aria-hidden /> Acceptée
                    </span>
                  ) : (
                    <span className="chip bg-paper text-ink-faint shrink-0">
                      <XCircle size={11} aria-hidden /> Déclinée
                    </span>
                  )}
                </div>
                {decidable && r.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => onAccept(a.id, r.id)}>
                      Accepter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDecline(a.id, r.id)}>
                      Décliner
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {a.status === "matched" && a.matchId && (
          <ButtonLink href={`/coach/matches/${a.matchId}`} variant="soft" className="w-full">
            Feuille de match <ChevronRight size={14} />
          </ButtonLink>
        )}
      </div>
    </BottomSheet>
  );
}
