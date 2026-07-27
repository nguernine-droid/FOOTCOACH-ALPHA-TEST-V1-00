"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AgendaItemDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_META, todayIso } from "./eventTypes";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Grille mensuelle (desktop) : pastilles par type, jour sélectionnable */
export function MonthGrid({
  month,
  eventsByDay,
  selected,
  onSelectDate,
  onNavigate,
}: {
  month: Date; // premier jour du mois affiché
  eventsByDay: Map<string, AgendaItemDto[]>;
  selected: string | null;
  onSelectDate: (date: string) => void;
  onNavigate: (delta: number) => void;
}) {
  const today = todayIso();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // Lundi = début de semaine
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(1 - startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const monthLabel = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          className="icon-btn text-ink-soft hover:text-ink hover:bg-paper"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="display text-lg capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onNavigate(1)}
          className="icon-btn text-ink-soft hover:text-ink hover:bg-paper"
          aria-label="Mois suivant"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-[10px] font-bold text-ink-faint text-center uppercase py-1">
            {d}
          </p>
        ))}
        {cells.map((d) => {
          const date = iso(d);
          const inMonth = d.getMonth() === month.getMonth();
          const dayItems = eventsByDay.get(date) ?? [];
          const types = [...new Set(dayItems.map((e) => e.type))];
          const active = selected === date;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={`${d.getDate()} ${monthLabel}${dayItems.length ? ` — ${dayItems.length} événement${dayItems.length > 1 ? "s" : ""}` : ""}`}
              aria-pressed={active}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition focus-visible:outline-gold",
                inMonth ? "text-ink" : "text-ink-faint",
                active ? "bg-navy-700 text-white font-black" : "hover:bg-paper",
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full tabular-nums font-bold",
                  isToday && !active && "ring-2 ring-gold",
                  active && "text-white",
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex gap-0.5 h-1.5" aria-hidden>
                {types.slice(0, 3).map((t) => (
                  <span key={t} className={cn("w-1.5 h-1.5 rounded-full", EVENT_TYPE_META[t].dot)} />
                ))}
                {types.length > 3 && <span className="text-[8px] leading-none text-ink-faint">+{types.length - 3}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
