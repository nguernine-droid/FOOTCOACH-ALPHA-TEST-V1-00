"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  MapPin,
  MessageCircle,
  UserMinus,
  XCircle,
} from "lucide-react";
import {
  categoryLabel,
  DIVISION_LEVEL_LABELS,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
} from "@teamnexus/shared";
import { todayIso } from "@/lib/time";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";

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
}: {
  announcement: AnnouncementDto;
  onClose: () => void;
}) {
  const past = a.date < todayIso();
  const hasResponse = a.responses.some((r) => r.status === "pending");

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
          <div className="flex items-start justify-between gap-2">
            <h2 className="display text-lg capitalize">
              {categoryLabel(a.category)}
              {a.gender && ` ${MATCH_GENDER_LABELS[a.gender]}`} · {a.format}
            </h2>
            {/* Combien d'AUTRES coachs ont ouvert le détail — un signal
                d'intérêt, même sans proposition reçue. */}
            <span
              className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-ink-faint mt-1"
              title="Nombre de fois où d'autres coachs ont ouvert le détail"
            >
              <Eye size={12} aria-hidden /> {a.viewCount}
            </span>
          </div>
          <p
            className={cn(
              "text-xs font-semibold flex items-center gap-1.5",
              a.status === "matched"
                ? "text-success"
                : a.status === "open" && !past
                  ? hasResponse
                    ? "text-sun"
                    : "text-coral"
                  : "text-ink-soft",
            )}
          >
            {a.status === "open" && !past && (
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  hasResponse ? "bg-sun" : "bg-coral",
                )}
                aria-hidden
              />
            )}
            {a.status === "matched"
              ? "Match confirmé"
              : a.status === "cancelled"
                ? "Annonce annulée"
                : past
                  ? "Date passée — retirée du radar"
                  : hasResponse
                    ? "Quelqu'un a répondu — à trancher"
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
          {a.level && <span className="chip bg-paper text-ink-soft">{DIVISION_LEVEL_LABELS[a.level]}</span>}
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
                {r.status === "pending" && r.conversationId && (
                  <Link
                    href={`/coach/messages/${r.conversationId}`}
                    className="flex items-center justify-center gap-1.5 min-h-9 rounded-lg bg-blue-soft
                      text-xs font-bold text-primary transition hover:bg-blue-faint"
                  >
                    <MessageCircle size={14} aria-hidden /> Discuter et décider
                  </Link>
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
