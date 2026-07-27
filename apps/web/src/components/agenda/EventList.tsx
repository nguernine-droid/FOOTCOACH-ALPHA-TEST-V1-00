"use client";

import { ChevronRight, Repeat } from "lucide-react";
import type { AgendaItemDto } from "@footcoach/shared";
import { cn, formatDate, groupAgendaItems } from "@/lib/utils";
import { EVENT_TYPE_META, todayIso } from "./eventTypes";

function ItemRow({ item, onOpen, showDate }: { item: AgendaItemDto; onOpen: (i: AgendaItemDto) => void; showDate?: boolean }) {
  const meta = EVENT_TYPE_META[item.type];
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full flex items-center gap-3 text-left bg-white border border-line rounded-lg px-4 py-3 hover:border-blue/40 transition focus-visible:outline-gold"
    >
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", meta.dot)} aria-hidden />
      <span className="text-xs font-black tabular-nums text-ink-soft shrink-0 w-11">{item.startTime}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold truncate">
          {item.title}
          {item.recurrence === "weekly" && <Repeat size={11} className="inline ml-1.5 text-ink-faint" aria-label="Chaque semaine" />}
        </span>
        <span className="block text-xs text-ink-soft truncate capitalize">
          {showDate && `${formatDate(item.occurrenceDate)} · `}
          {meta.label}
          {item.location && ` · ${item.location}`}
        </span>
      </span>
      <ChevronRight size={14} className="text-ink-faint shrink-0" aria-hidden />
    </button>
  );
}

/** Vue liste : événements à venir groupés par proximité, ou jour filtré */
export function EventList({
  items,
  filterDate,
  onOpen,
}: {
  items: AgendaItemDto[];
  filterDate: string | null;
  onOpen: (i: AgendaItemDto) => void;
}) {
  if (filterDate) {
    const dayItems = items.filter((i) => i.occurrenceDate === filterDate);
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1 capitalize">{formatDate(filterDate)}</h3>
        {dayItems.length === 0 && <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">Rien de prévu ce jour-là.</p>}
        {dayItems.map((i) => (
          <ItemRow key={i.id} item={i} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  const groups = groupAgendaItems(items, todayIso());
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider px-1">{g.label}</h3>
          {g.items.map((i) => (
            <ItemRow key={i.id} item={i} onOpen={onOpen} showDate={g.key === "week" || g.key === "later"} />
          ))}
        </div>
      ))}
    </div>
  );
}
