"use client";

import type { AgendaItemDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_META, addDaysIso, todayIso } from "./eventTypes";

const DAY_LABELS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/** Strip horizontal des 7 prochains jours avec pastilles par type d'événement */
export function WeekStrip({
  eventsByDay,
  selected,
  onSelect,
}: {
  eventsByDay: Map<string, AgendaItemDto[]>;
  selected: string | null;
  onSelect: (date: string | null) => void;
}) {
  const today = todayIso();
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(today, i));

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist" aria-label="7 prochains jours">
      {days.map((date) => {
        const d = new Date(`${date}T12:00:00`);
        const active = selected === date;
        const types = [...new Set((eventsByDay.get(date) ?? []).map((e) => e.type))];
        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(active ? null : date)}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[52px] px-2 py-2.5 rounded-lg border transition focus-visible:outline-accent",
              active ? "bg-navy-700 text-white border-navy-700" : "surface text-ink border-line hover:border-blue/40",
            )}
          >
            <span className={cn("text-[10px] font-bold uppercase", active ? "text-white/70" : "text-ink-soft")}>
              {date === today ? "Auj." : DAY_LABELS[d.getDay()]}
            </span>
            <span className="text-sm font-black tabular-nums">{d.getDate()}</span>
            <span className="flex gap-0.5 h-1.5" aria-hidden>
              {types.slice(0, 3).map((t) => (
                <span key={t} className={cn("w-1.5 h-1.5 rounded-full", EVENT_TYPE_META[t].dot)} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
