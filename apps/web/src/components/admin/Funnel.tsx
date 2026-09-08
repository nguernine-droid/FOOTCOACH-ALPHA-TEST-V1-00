"use client";

import { INSIGHT_MIN_BASE, insightRate, type FunnelStepDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";

/**
 * Entonnoir : ce qui atteint chaque marche, et ce qui s'y perd.
 *
 * Le point du composant n'est pas d'aligner des barres — c'est de DÉSIGNER la
 * marche qui casse. Elle est cherchée ici (la plus grosse perte en valeur
 * absolue) et signalée, parce qu'un tableau de bord qui laisse le lecteur
 * comparer six pourcentages ne l'aide pas : il lui rend son travail.
 *
 * Les taux ne s'affichent qu'au-dessus de `INSIGHT_MIN_BASE` observations. En
 * dessous, la case reste vide plutôt que d'annoncer « 33 % » sur trois
 * annonces — ce serait un chiffre faux, et un chiffre faux se retient.
 */
export function Funnel({ steps, ariaLabel }: { steps: FunnelStepDto[]; ariaLabel: string }) {
  if (steps.length === 0) return null;
  const top = steps[0].count;

  // La plus grosse perte, en nombre : c'est elle qui coûte, pas le plus petit taux
  let worstIndex = -1;
  let worstLoss = 0;
  for (let i = 1; i < steps.length; i++) {
    const loss = steps[i - 1].count - steps[i].count;
    if (loss > worstLoss) {
      worstLoss = loss;
      worstIndex = i;
    }
  }

  return (
    <ol className="space-y-1.5" aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const previous = i === 0 ? null : steps[i - 1].count;
        const fromPrevious = previous === null ? null : insightRate(step.count, previous);
        const fromTop = i === 0 ? null : insightRate(step.count, top);
        const width = top > 0 ? Math.max(step.count / top, step.count > 0 ? 0.02 : 0) * 100 : 0;
        const isBreak = i === worstIndex && worstLoss > 0;
        const lost = previous === null ? 0 : previous - step.count;

        return (
          <li key={step.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-bold text-ink-soft truncate">{step.label}</p>
              <p className="flex items-baseline gap-2 shrink-0">
                {fromPrevious !== null && (
                  <span
                    className={cn(
                      "text-[10px] font-black tabular-nums",
                      isBreak ? "text-danger" : "text-ink-faint",
                    )}
                  >
                    {Math.round(fromPrevious * 100)} %
                  </span>
                )}
                <span className="display text-lg text-primary tabular-nums leading-none">{step.count}</span>
              </p>
            </div>
            <div className="mt-1 h-2 rounded-full bg-paper overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", isBreak ? "bg-danger" : "bg-accent-solid")}
                style={{ width: `${width}%` }}
              />
            </div>
            {/* La marche qui casse s'explique ; les autres n'ont pas besoin de commentaire */}
            {isBreak && step.lossHint && (
              <p className="mt-1 text-[10px] font-semibold text-danger">
                −{lost} ici. {step.lossHint}
              </p>
            )}
            {i > 0 && fromTop !== null && !isBreak && (
              <p className="mt-0.5 text-[10px] text-ink-faint tabular-nums">
                {Math.round(fromTop * 100)} % du départ
              </p>
            )}
          </li>
        );
      })}
      {top < INSIGHT_MIN_BASE && (
        <li className="text-[10px] font-semibold text-ink-faint pt-1">
          Moins de {INSIGHT_MIN_BASE} observations : les taux ne sont pas calculés, ils ne voudraient rien
          dire.
        </li>
      )}
    </ol>
  );
}
