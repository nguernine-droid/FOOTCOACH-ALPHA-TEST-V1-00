"use client";

import { useState } from "react";
import { ChevronRight, Pencil, Repeat, Trash2 } from "lucide-react";
import type { AgendaItemDto } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { VenueLink } from "@/components/VenueLink";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
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
    <BottomSheet
      label={item.title}
      onClose={onClose}
      footer={
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div>
        <div className="p-5 pt-2 space-y-4">
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

          {item.recurrence === "weekly" && (
            <p className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
              <Repeat size={12} className="shrink-0" />
              Chaque semaine{item.recurrenceUntil && ` jusqu'au ${formatDate(item.recurrenceUntil)}`}
            </p>
          )}

          {item.location && (
            <VenueLink destination={item.location} variant="row" />
          )}

          {item.description && (
            <p className="text-sm text-ink-soft bg-paper rounded-lg px-4 py-3">{item.description}</p>
          )}

          <div className="space-y-2 border-t border-line pt-4">
            {item.kind === "match" && item.matchId && (
              <ButtonLink href={`/coach/matches/${item.matchId}`} variant="soft" className="w-full">
                Feuille de match <ChevronRight size={14} />
              </ButtonLink>
            )}
            {/* Ni modification ni suppression : une journée de tournoi se retire
                de l'agenda en se désinscrivant, sur la fiche du tournoi. */}
            {item.kind === "tournament" && item.tournamentId && (
              <ButtonLink href={`/coach/tournaments/${item.tournamentId}`} variant="soft" className="w-full">
                Voir le tournoi <ChevronRight size={14} />
              </ButtonLink>
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
    </BottomSheet>
  );
}
