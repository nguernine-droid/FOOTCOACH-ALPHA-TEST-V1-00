"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Pencil, Repeat, Trash2, X } from "lucide-react";
import type { AgendaItemDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EVENT_TYPE_META } from "./eventTypes";

/** Panneau de détail d'une occurrence de l'agenda coach */
export function EventDetail({
  item,
  onClose,
  onChanged,
  onEdit,
}: {
  item: AgendaItemDto;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (item: AgendaItemDto) => void;
}) {
  const meta = EVENT_TYPE_META[item.type];
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function remove() {
    await api(`/events/${item.eventId}`, { method: "DELETE" }).catch(() => undefined);
    onChanged();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-900/50 flex items-end min-[960px]:items-center justify-center p-0 min-[960px]:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full min-[960px]:max-w-lg min-[960px]:rounded-2xl rounded-t-2xl shadow-pop max-h-[88dvh] overflow-y-auto">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", meta.chip)}>
                <meta.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-base font-black truncate">{item.title}</p>
                <p className="text-xs text-ink-soft font-semibold capitalize">
                  {meta.label} · {formatDate(item.occurrenceDate)} · {item.startTime}
                  {item.endTime && ` – ${item.endTime}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-soft hover:text-ink hover:bg-paper transition shrink-0"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          {item.recurrence === "weekly" && (
            <p className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
              <Repeat size={12} className="shrink-0" />
              Chaque semaine{item.recurrenceUntil && ` jusqu'au ${formatDate(item.recurrenceUntil)}`}
            </p>
          )}

          {item.location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-ink bg-paper rounded-lg px-4 py-3 hover:bg-blue-faint transition"
            >
              <MapPin size={14} className="text-blue shrink-0" />
              <span className="flex-1 truncate">{item.location}</span>
              <span className="text-xs text-ink-soft shrink-0">Itinéraire</span>
            </a>
          )}

          {item.description && (
            <p className="text-sm text-ink-soft bg-paper rounded-lg px-4 py-3">{item.description}</p>
          )}

          <div className="space-y-2 border-t border-line pt-4">
            {item.kind === "match" && item.matchId && (
              <Link href={`/coach/matches/${item.matchId}`} className="block">
                <Button variant="soft" className="w-full">
                  Feuille de match <ChevronRight size={14} />
                </Button>
              </Link>
            )}
            {item.kind === "event" && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="soft" onClick={() => onEdit(item)}>
                  <Pencil size={14} /> Modifier
                </Button>
                {confirmDelete ? (
                  <Button variant="danger" onClick={remove}>
                    <Trash2 size={14} /> Confirmer
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={14} /> Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
