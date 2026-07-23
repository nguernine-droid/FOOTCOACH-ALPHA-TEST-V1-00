"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type BarDatum = {
  key: string;
  /** Libellé court sous la barre (peut être vide pour alléger l'axe) */
  label: string;
  /** Libellé complet pour le tooltip et l'accessibilité */
  fullLabel: string;
  value: number;
};

/**
 * Diagramme en barres mono-série (HTML/CSS, aucune lib).
 * Barres fines à bout arrondi ancrées à la ligne de base, grille discrète,
 * tooltip au survol (cible = colonne entière), maximum étiqueté par défaut.
 */
export function BarChart({ data, ariaLabel }: { data: BarDatum[]; ariaLabel: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const maxIndex = data.findIndex((d) => d.value === Math.max(...data.map((x) => x.value)) && d.value > 0);
  const active = hovered ?? (maxIndex >= 0 ? maxIndex : null);
  const slot = 100 / data.length;

  return (
    <figure className="space-y-1" aria-label={ariaLabel}>
      <div className="relative pt-7">
        {/* Tooltip : survol prioritaire, sinon le maximum */}
        {active !== null && (
          <div
            className="absolute top-0 pointer-events-none bg-navy-800 text-white text-[11px] font-bold rounded-lg px-2.5 py-1 shadow-pop whitespace-nowrap -translate-x-1/2 z-10"
            style={{ left: `clamp(3.5rem, ${slot * active + slot / 2}%, calc(100% - 3.5rem))` }}
            role="status"
          >
            {data[active].fullLabel} · <span className="tabular-nums">{data[active].value}</span>
          </div>
        )}

        <div className="relative h-36 border-b border-ink-faint/40">
          {/* Grille discrète : ligne médiane */}
          <div className="absolute inset-x-0 top-1/2 border-t border-line" aria-hidden />

          <div className="absolute inset-0 flex items-end">
            {data.map((d, i) => (
              <div
                key={d.key}
                className="flex-1 h-full flex items-end justify-center cursor-default"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${d.fullLabel} : ${d.value}`}
              >
                {d.value > 0 && (
                  <div
                    className={cn(
                      "w-[60%] max-w-2.5 rounded-t-[4px] bg-blue transition-opacity",
                      hovered !== null && hovered !== i ? "opacity-40" : "opacity-100",
                    )}
                    style={{ height: `${Math.max(3, (d.value / maxValue) * 100)}%` }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex" aria-hidden>
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-[9px] font-semibold text-ink-faint truncate">
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
