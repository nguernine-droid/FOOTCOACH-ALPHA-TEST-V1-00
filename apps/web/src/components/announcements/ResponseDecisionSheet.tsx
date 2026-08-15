"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, ShieldCheck, Users } from "lucide-react";
import {
  categoryLabel,
  teamMatchesAnnouncement,
  MATCH_GENDER_LABELS,
  type AnnouncementDto,
  type AnnouncementResponseDto,
  type CoachCardDto,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { CoachCard } from "@/components/coach/CoachCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * La feuille qui pose LA question : « on fait ce match avec lui ? »
 *
 * Ouverte au retour d'une notification « une équipe veut jouer votre annonce »
 * (deep link `?proposition=`), ou depuis le fil d'activité. Elle rassemble tout
 * ce qu'il faut pour trancher sans changer d'écran : la carte du coach qui
 * propose, les références de son équipe face à ce que l'annonce demande, puis
 * deux boutons — oui ou non.
 *
 * La carte est EMBARQUÉE et non ouverte dans une seconde feuille : la décision
 * se prend en regardant qui propose, pas en jonglant entre deux écrans.
 */
export function ResponseDecisionSheet({
  announcement: a,
  response: r,
  onAccept,
  onDecline,
  onClose,
}: {
  announcement: AnnouncementDto;
  response: AnnouncementResponseDto;
  onAccept: (announcementId: string, responseId: string) => Promise<void>;
  onDecline: (announcementId: string, responseId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [card, setCard] = useState<CoachCardDto | null>(null);
  const [cardError, setCardError] = useState(false);
  /** Une décision part, une seule : les boutons se gèlent pendant l'appel */
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!r.coach) {
      setCardError(true);
      return;
    }
    let cancelled = false;
    api<CoachCardDto>(`/coaches/${r.coach.id}/card`)
      .then((fresh) => {
        if (!cancelled) setCard(fresh);
      })
      .catch(() => {
        if (!cancelled) setCardError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [r.coach]);

  const decide = async (action: "accept" | "decline") => {
    setBusy(true);
    try {
      if (action === "accept") await onAccept(a.id, r.id);
      else await onDecline(a.id, r.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  // L'écart éventuel entre ce que l'annonce demande et ce que l'équipe joue —
  // jamais bloquant, mais à voir AVANT de dire oui (même règle que ResponseFit).
  const fit = teamMatchesAnnouncement({ category: r.teamCategory, gender: r.teamGender }, a);
  const gap =
    fit && (!fit.category || !fit.gender)
      ? !fit.category && !fit.gender
        ? "catégorie et genre différents de votre annonce"
        : !fit.category
          ? "catégorie différente de votre annonce"
          : "genre différent de votre annonce"
      : null;

  const teamRefs = [
    r.teamCategory ? categoryLabel(r.teamCategory) : null,
    r.teamGender ? MATCH_GENDER_LABELS[r.teamGender] : null,
  ].filter((v): v is string => v !== null);

  return (
    <BottomSheet
      label={r.coach ? `Proposition de ${r.coach.nickname}` : `Proposition de ${r.team.name}`}
      onClose={onClose}
      footer={
        r.status === "pending" ? (
          <div className="space-y-2">
            <p className="text-center text-sm font-black">On fait ce match ?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => decide("accept")} disabled={busy}>
                Oui, on joue
              </Button>
              <Button variant="ghost" onClick={() => decide("decline")} disabled={busy}>
                Non, décliner
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        )
      }
    >
      <div className="p-5 space-y-4">
        {/* Ce sur quoi porte la décision : mon annonce, en une ligne */}
        <p className="text-xs text-ink-soft font-semibold text-center">
          Votre annonce {categoryLabel(a.category)}
          {a.gender && ` ${MATCH_GENDER_LABELS[a.gender]}`} · {a.format} · {formatDate(a.date)} à {a.time}
        </p>

        {/* La carte du coach qui propose, telle qu'elle s'ouvre partout ailleurs */}
        {card ? (
          <CoachCard
            name={card.nickname}
            avatarUrl={card.avatarUrl}
            clubLabel={card.clubLabel}
            teamCategory={card.teamCategory}
            level={card.level}
            points={card.points}
            matchesPlayed={card.matchesPlayed}
            categories={card.categories}
          />
        ) : cardError ? (
          <div className="rounded-lg bg-paper px-4 py-5 text-center">
            <p className="text-sm font-bold">{r.coach ? r.coach.nickname : r.team.name}</p>
            <p className="text-xs text-ink-soft">La carte de ce coach n&apos;est pas accessible.</p>
          </div>
        ) : (
          <Skeleton className="h-[440px] max-w-[340px] mx-auto" />
        )}

        {/* Son équipe : ce qu'elle joue, d'où elle vient — les références qui
            comptent face à l'annonce, écart signalé s'il y en a un. */}
        <div className="rounded-lg border border-line surface px-4 py-3 space-y-1.5">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Users size={14} className="text-blue shrink-0" aria-hidden />
            {r.team.name}
          </p>
          <p className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
            <MapPin size={12} className="text-blue shrink-0" aria-hidden />
            {r.team.city}
          </p>
          {teamRefs.length > 0 && (
            <p
              className={cn(
                "text-[11px] flex items-start gap-1.5",
                gap ? "font-bold text-coral" : "text-ink-soft",
              )}
            >
              {gap ? (
                <AlertTriangle size={11} className="shrink-0 mt-0.5" aria-hidden />
              ) : (
                <ShieldCheck size={11} className="shrink-0 mt-0.5 text-success" aria-hidden />
              )}
              <span>
                {teamRefs.join(" · ")}
                {gap && ` — ${gap}`}
              </span>
            </p>
          )}
        </div>

        {r.status !== "pending" && (
          <p className="text-xs font-bold text-center text-ink-soft">
            {r.status === "accepted"
              ? "Vous avez accepté cette proposition."
              : "Vous avez décliné cette proposition."}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
