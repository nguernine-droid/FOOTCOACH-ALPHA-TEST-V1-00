"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, List, Plus } from "lucide-react";
import type { AgendaItemDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EVENT_TYPE_META, addDaysIso, todayIso } from "./eventTypes";
import { WeekStrip } from "./WeekStrip";
import { EventList } from "./EventList";
import { MonthGrid } from "./MonthGrid";
import { EventDetail } from "./EventDetail";
import { EventForm } from "./EventForm";

/**
 * Agenda de l'équipe (coach) : liste (mobile) ou grille mois (desktop),
 * alimenté par GET /events (événements + matchs fusionnés).
 *
 * `requestCreate` ouvre directement le formulaire de création — utilisé par le
 * bouton « + » de la barre d'onglets, qui navigue vers /coach/agenda?nouveau=1.
 */
export function AgendaView({ requestCreate = false }: { requestCreate?: boolean }) {
  const [items, setItems] = useState<AgendaItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "month">("list");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [detail, setDetail] = useState<AgendaItemDto | null>(null);
  const [formInitial, setFormInitial] = useState<AgendaItemDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!requestCreate) return;
    setFormInitial(null);
    setFormOpen(true);
  }, [requestCreate]);

  const load = useCallback(async () => {
    try {
      const today = todayIso();
      const data = await api<AgendaItemDto[]>(`/events?from=${addDaysIso(today, -31)}&to=${addDaysIso(today, 92)}`);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Le détail affiché est resynchronisé après une action (réponse, édition…)
  useEffect(() => {
    if (!detail || !items) return;
    const fresh = items.find((i) => i.id === detail.id);
    if (fresh && fresh !== detail) setDetail(fresh);
  }, [items, detail]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaItemDto[]>();
    for (const item of items ?? []) {
      const list = map.get(item.occurrenceDate) ?? [];
      list.push(item);
      map.set(item.occurrenceDate, list);
    }
    return map;
  }, [items]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!items) {
    return (
      <div className="space-y-4" aria-busy aria-label="Chargement">
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasUpcoming = items.some((i) => i.occurrenceDate >= todayIso());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="display text-lg">Agenda de l&apos;équipe</h2>
        <div className="flex items-center gap-2">
          {/* Toggle liste/mois — desktop uniquement, la liste est la vue mobile */}
          <div className="hidden min-[960px]:flex rounded-lg border border-line overflow-hidden" role="tablist" aria-label="Vue de l'agenda">
            {(
              [
                { key: "list", label: "Liste", icon: List },
                { key: "month", label: "Mois", icon: CalendarRange },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={view === v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition",
                  view === v.key ? "bg-navy-700 text-white" : "surface text-ink-soft hover:text-ink",
                )}
              >
                <v.icon size={13} /> {v.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => {
              setFormInitial(null);
              setFormOpen(true);
            }}
          >
            <Plus size={14} /> Créer un événement
          </Button>
        </div>
      </div>

      {/* Légende des types */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Légende des types d'événements">
        {Object.entries(EVENT_TYPE_META).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <span className={cn("w-2 h-2 rounded-full", meta.dot)} aria-hidden /> {meta.label}
          </span>
        ))}
      </div>

      {items.length === 0 || !hasUpcoming ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <CalendarRange size={22} />
          </span>
          <p className="text-sm font-bold">Aucun événement planifié</p>
          <Button
            size="sm"
            onClick={() => {
              setFormInitial(null);
              setFormOpen(true);
            }}
          >
            <Plus size={14} /> Créer un événement
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile : strip 7 jours + liste */}
          <div className="min-[960px]:hidden space-y-4">
            <WeekStrip eventsByDay={eventsByDay} selected={selectedDate} onSelect={setSelectedDate} />
            <EventList items={items} filterDate={selectedDate} onOpen={setDetail} />
          </div>

          {/* Desktop : liste seule, ou grille mois + panneau du jour */}
          <div className="hidden min-[960px]:block">
            {view === "list" ? (
              <div className="max-w-2xl">
                <EventList items={items} filterDate={null} onOpen={setDetail} />
              </div>
            ) : (
              <div className="grid min-[960px]:grid-cols-[1fr_360px] gap-4 items-start">
                <MonthGrid
                  month={month}
                  eventsByDay={eventsByDay}
                  selected={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)}
                  onNavigate={(delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))}
                />
                <div className="card p-4">
                  {selectedDate ? (
                    <EventList items={items} filterDate={selectedDate} onOpen={setDetail} />
                  ) : (
                    <p className="text-xs text-ink-soft px-1 py-2">Sélectionnez un jour pour voir son programme.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {detail && (
        <EventDetail
          item={detail}
          onClose={() => setDetail(null)}
          onChanged={load}
          onEdit={(item) => {
            setDetail(null);
            setFormInitial(item);
            setFormOpen(true);
          }}
        />
      )}
      {formOpen && <EventForm initial={formInitial ?? undefined} onSaved={load} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
