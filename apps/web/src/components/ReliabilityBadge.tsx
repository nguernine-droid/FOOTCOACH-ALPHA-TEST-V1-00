"use client";

import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import {
  reliabilityLabel,
  reliabilityTone,
  WITHDRAWAL_REASON_LABELS,
  RELIABILITY_TONE_LABELS,
  type ReliabilityDto,
} from "@teamnexus/shared";
import { cn } from "@/lib/utils";

const TONES = {
  unknown: { className: "bg-paper text-ink-soft", Icon: ShieldQuestion },
  good: { className: "bg-success-soft text-success", Icon: ShieldCheck },
  fair: { className: "bg-sun-soft text-sun", Icon: ShieldCheck },
  poor: { className: "bg-coral-soft text-coral", Icon: ShieldAlert },
} as const;

/**
 * Ce qu'une équipe fait de ses engagements.
 *
 * Volontairement sobre : c'est un jugement porté sur un club, devant d'autres
 * clubs. La pastille dit la tendance, le détail dit sur quoi elle repose — et
 * tant que l'échantillon est trop mince, elle dit qu'elle ne sait pas plutôt
 * que d'afficher un pourcentage indéfendable.
 */
export function ReliabilityBadge({
  reliability,
  /** Avec le détail : motifs des désistements et désistements tardifs */
  detailed = false,
  className,
}: {
  reliability: ReliabilityDto;
  detailed?: boolean;
  className?: string;
}) {
  const tone = reliabilityTone(reliability);
  const { className: toneClass, Icon } = TONES[tone];

  if (!detailed) {
    return (
      <span className={cn("chip", toneClass, className)} title={reliabilityLabel(reliability)}>
        <Icon size={11} aria-hidden />
        {RELIABILITY_TONE_LABELS[tone]}
      </span>
    );
  }

  const reasons = Object.entries(reliability.withdrawnByReason) as [
    keyof typeof WITHDRAWAL_REASON_LABELS,
    number,
  ][];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("chip", toneClass)}>
          <Icon size={11} aria-hidden />
          {RELIABILITY_TONE_LABELS[tone]}
        </span>
        <span className="text-xs text-ink-soft">{reliabilityLabel(reliability)}</span>
      </div>

      {/* Les motifs ne pondèrent pas le taux, mais ils le rendent lisible : un
          club qui a annulé pour la pluie n'est pas un club qui lâche. */}
      {reasons.length > 0 && (
        <p className="text-[11px] text-ink-faint">
          {reasons.map(([reason, count]) => `${WITHDRAWAL_REASON_LABELS[reason]} ×${count}`).join(" · ")}
        </p>
      )}

      {reliability.lateWithdrawn > 0 && (
        <p className="text-[11px] font-semibold text-coral">
          {reliability.lateWithdrawn} désistement{reliability.lateWithdrawn > 1 ? "s" : ""} à moins de quatre jours
          du match
        </p>
      )}
    </div>
  );
}
