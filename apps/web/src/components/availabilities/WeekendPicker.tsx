"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AVAILABILITY_MAX_DATES, AVAILABILITY_MAX_DAYS_AHEAD } from "@teamnexus/shared";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Choix de PLUSIEURS dates — ce qui distingue cet écran de la publication
 * d'annonce, où l'on n'en choisit qu'une.
 *
 * Un calendrier et non une liste de dates : « je suis libre les trois
 * prochains dimanches » se lit dans un mois, pas dans un menu déroulant. Les
 * samedis et dimanches sont mis en avant sans être imposés — les plateaux de
 * jeunes se jouent le samedi, les seniors le dimanche, et certains districts
 * calent des rattrapages en semaine.
 *
 * Les jours déjà déclarés arrivent cochés : rouvrir le calendrier montre l'état
 * réel de la saison, il ne repart pas d'une page blanche.
 */
export function WeekendPicker({
  selected,
  onChange,
  /** Dates déjà déclarées : cochées, et signalées comme telles */
  existing = [],
}: {
  selected: string[];
  onChange: (dates: string[]) => void;
  existing?: string[];
}) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const todayIso = toIso(new Date());
  const maxIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + AVAILABILITY_MAX_DAYS_AHEAD);
    return toIso(d);
  }, []);
  const existingSet = useMemo(() => new Set(existing), [existing]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const full = selected.length >= AVAILABILITY_MAX_DATES;

  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7; // semaine qui commence lundi
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  function toggle(iso: string) {
    if (selectedSet.has(iso)) onChange(selected.filter((d) => d !== iso));
    else if (!full) onChange([...selected, iso].sort());
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="icon-btn text-ink-soft hover:bg-paper"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold capitalize">
          {view.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="icon-btn text-ink-soft hover:bg-paper"
          aria-label="Mois suivant"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-ink-faint text-center py-1">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(view.getFullYear(), view.getMonth(), day);
          const iso = toIso(date);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const isSelected = selectedSet.has(iso);
          const wasDeclared = existingSet.has(iso);
          // Hors bornes : passé, ou au-delà de l'horizon que le serveur accepte
          const disabled = iso < todayIso || iso > maxIso || (!isSelected && full);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggle(iso)}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${
                wasDeclared ? " — déjà déclaré" : ""
              }`}
              className={cn(
                "min-h-11 rounded-lg text-sm font-bold tabular-nums transition relative",
                "disabled:opacity-25 disabled:pointer-events-none",
                isSelected
                  ? "bg-blue text-white"
                  : weekend
                    ? "bg-blue-soft text-primary hover:bg-blue-faint"
                    : "text-ink-soft hover:bg-paper",
              )}
            >
              {day}
              {wasDeclared && !isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-ink-faint px-1">
        {selected.length} date{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}
        {full && ` · maximum atteint (${AVAILABILITY_MAX_DATES})`}
      </p>
    </div>
  );
}
