"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Check, ChevronRight, Lock, MapPin, Pencil, Repeat, Trash2, X } from "lucide-react";
import type { AgendaItemDto, EventAttendanceDto, Role } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { CarpoolSection } from "@/components/CarpoolSection";
import { Button } from "@/components/ui/Button";
import { EVENT_TYPE_META } from "./eventTypes";

/** Panneau de détail d'une occurrence — actions selon le rôle */
export function EventDetail({
  item,
  role,
  onClose,
  onChanged,
  onEdit,
}: {
  item: AgendaItemDto;
  role: Role;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (item: AgendaItemDto) => void;
}) {
  const meta = EVENT_TYPE_META[item.type];
  const [responses, setResponses] = useState<EventAttendanceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Vue coach : réponses des joueurs pour cette occurrence
  useEffect(() => {
    if (role !== "coach") return;
    const path =
      item.kind === "match"
        ? `/matches/${item.matchId}/presence`
        : `/events/${item.eventId}/attendances?date=${item.occurrenceDate}`;
    api<EventAttendanceDto[]>(path)
      .then(setResponses)
      .catch(() => setResponses([]));
  }, [role, item]);

  async function answer(status: "present" | "absent") {
    setError(null);
    try {
      if (item.kind === "match") {
        await api(`/matches/${item.matchId}/attendance`, { method: "PUT", body: JSON.stringify({ status }) });
      } else {
        await api(`/events/${item.eventId}/attendance`, {
          method: "PUT",
          body: JSON.stringify({ date: item.occurrenceDate, status }),
        });
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer");
    }
  }

  async function remove() {
    await api(`/events/${item.eventId}`, { method: "DELETE" }).catch(() => undefined);
    onChanged();
    onClose();
  }

  const matchHref = role === "coach" ? `/coach/matches/${item.matchId}` : `/player/matches/${item.matchId}`;

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

          {item.description && <p className="text-sm text-ink-soft bg-paper rounded-lg px-4 py-3">{item.description}</p>}

          {/* Présences */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">Présences</p>
              <span className="chip bg-blue-soft text-navy-700">
                {item.presentCount} présent{item.presentCount > 1 ? "s" : ""} · {item.absentCount} absent
                {item.absentCount > 1 ? "s" : ""}
              </span>
            </div>

            {role === "player" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => answer("present")}
                    disabled={item.locked}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
                      item.myStatus === "present"
                        ? "bg-success text-white shadow-[0_4px_12px_-4px_rgba(30,158,88,0.5)]"
                        : "bg-paper text-ink-soft hover:bg-success-soft hover:text-success",
                    )}
                    aria-pressed={item.myStatus === "present"}
                  >
                    <Check size={15} /> Présent
                  </button>
                  <button
                    onClick={() => answer("absent")}
                    disabled={item.locked}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold border transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
                      item.myStatus === "absent"
                        ? "bg-coral text-white border-coral"
                        : "bg-white text-coral border-coral/40 hover:bg-coral-soft",
                    )}
                    aria-pressed={item.myStatus === "absent"}
                  >
                    <X size={15} /> Absent
                  </button>
                </div>
                {item.locked && (
                  <p className="text-[11px] font-semibold text-ink-soft flex items-center gap-1.5">
                    <Lock size={11} className="shrink-0" /> Réponses verrouillées 24h avant le début.
                  </p>
                )}
              </>
            )}

            {role === "coach" && responses && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {responses.length === 0 && <p className="text-xs text-ink-soft">Aucun joueur dans l&apos;effectif.</p>}
                {responses.map((r) => (
                  <div key={r.userId} className="flex items-center gap-2.5 text-sm bg-paper rounded-lg px-3.5 py-2">
                    <span className="flex-1 min-w-0 font-bold truncate">
                      {r.firstName} {r.lastName}
                      {r.jerseyNumber != null && <span className="text-ink-faint font-semibold"> · {r.jerseyNumber}</span>}
                    </span>
                    <span
                      className={cn(
                        "chip shrink-0",
                        r.status === "present" && "bg-success-soft text-success",
                        r.status === "absent" && "bg-coral-soft text-coral",
                        r.status === null && "bg-white border border-line text-ink-soft",
                      )}
                    >
                      {r.status === "present" ? "Présent" : r.status === "absent" ? "Absent" : "Sans réponse"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-4 py-2.5">{error}</p>}
          </div>

          {/* Covoiturage : uniquement pour les matchs (les réservations y sont liées) */}
          {item.kind === "match" && item.matchId ? (
            <div className="space-y-2">
              <p className="text-sm font-black">Covoiturage</p>
              <CarpoolSection matchId={item.matchId} canBook={role === "player"} />
              {role === "parent" && (
                <p className="text-[11px] font-semibold text-ink-soft flex items-center gap-1.5">
                  <Car size={11} className="shrink-0" /> Proposez vos places depuis l&apos;accueil, carte du match.
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-ink-soft flex items-center gap-1.5">
              <Car size={11} className="shrink-0" /> Le covoiturage est disponible sur les matchs.
            </p>
          )}

          {/* Actions selon rôle */}
          <div className="space-y-2 border-t border-line pt-4">
            {item.kind === "match" && item.matchId && role !== "parent" && (
              <Link href={matchHref} className="block">
                <Button variant="soft" className="w-full">
                  {role === "coach" ? "Feuille de match" : "Voir le match"} <ChevronRight size={14} />
                </Button>
              </Link>
            )}
            {role === "coach" && item.kind === "event" && (
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
