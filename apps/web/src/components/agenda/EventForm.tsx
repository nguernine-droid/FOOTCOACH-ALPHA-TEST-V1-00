"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { AgendaItemDto, TeamEventType } from "@footcoach/shared";
import { TEAM_EVENT_TYPES } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { EVENT_TYPE_META, addDaysIso } from "./eventTypes";

/** Création/édition d'un événement d'agenda (coach) */
export function EventForm({
  initial,
  onSaved,
  onClose,
}: {
  /** Occurrence à modifier — absent pour une création */
  initial?: AgendaItemDto;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    type: (initial && initial.type !== "match" ? initial.type : "entrainement") as TeamEventType,
    title: initial?.title ?? "",
    // Édition : on repart de la date de base de la série via occurrenceDate
    date: initial?.occurrenceDate ?? "",
    startTime: initial?.startTime ?? "",
    endTime: initial?.endTime ?? "",
    location: initial?.location ?? "",
    description: initial?.description ?? "",
    weekly: initial?.recurrence === "weekly",
    recurrenceUntil: initial?.recurrenceUntil ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      type: form.type,
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime || null,
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      recurrence: form.weekly ? "weekly" : "none",
      recurrenceUntil: form.weekly ? form.recurrenceUntil || addDaysIso(form.date, 56) : null,
    };
    try {
      if (initial?.eventId) {
        await api(`/events/${initial.eventId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/events", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-900/50 flex items-end min-[960px]:items-center justify-center p-0 min-[960px]:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Modifier l'événement" : "Créer un événement"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="bg-white w-full min-[960px]:max-w-lg min-[960px]:rounded-2xl rounded-t-2xl shadow-pop max-h-[88dvh] overflow-y-auto p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="display text-lg">{initial ? "Modifier l'événement" : "Créer un événement"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-ink-soft hover:text-ink hover:bg-paper transition"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {TEAM_EVENT_TYPES.map((t) => {
            const meta = EVENT_TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                aria-pressed={form.type === t}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition",
                  form.type === t ? "bg-navy-700 text-white border-navy-700" : "bg-white text-ink-soft border-line hover:border-blue/40",
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", meta.dot)} aria-hidden /> {meta.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ev-title" className="text-xs font-bold text-ink-soft">Titre</label>
          <input
            id="ev-title"
            required
            maxLength={80}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="field"
            placeholder="Ex : Entraînement U13"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-ink-soft">Date</p>
            <DateField value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-ink-soft">Début</p>
            <TimeField value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-ink-soft">Fin (optionnel)</p>
            <TimeField value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ev-location" className="text-xs font-bold text-ink-soft">Lieu</label>
          <input
            id="ev-location"
            maxLength={150}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="field"
            placeholder="Ex : Gymnase Croix-Rousse"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ev-desc" className="text-xs font-bold text-ink-soft">Description</label>
          <textarea
            id="ev-desc"
            maxLength={500}
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="field resize-none"
            placeholder="Informations pratiques…"
          />
        </div>

        <label className="flex items-center gap-3 bg-paper rounded-lg px-4 py-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.weekly}
            onChange={(e) => setForm((f) => ({ ...f, weekly: e.target.checked }))}
            className="accent-navy-700 w-4 h-4 shrink-0"
          />
          <span className="text-xs font-semibold text-ink-soft">Répéter chaque semaine</span>
        </label>
        {form.weekly && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-ink-soft">Jusqu&apos;au</p>
            <DateField
              value={form.recurrenceUntil}
              onChange={(v) => setForm((f) => ({ ...f, recurrenceUntil: v }))}
              min={form.date || undefined}
              placeholder="Par défaut : 8 semaines"
            />
          </div>
        )}

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-4 py-2.5">{error}</p>}

        <div className="flex gap-2 justify-end border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving || !form.date || !form.startTime}>
            {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Créer l'événement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
