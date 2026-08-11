"use client";

import { useCallback, useEffect, useState } from "react";
import { Bug, Lightbulb, Save } from "lucide-react";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  type AdminFeedbackDto,
  type FeedbackStatus,
} from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo, useNow } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

const STATUS_CHIP: Record<FeedbackStatus, string> = {
  nouveau: "bg-blue-soft text-primary",
  en_cours: "bg-sun-soft text-sun",
  resolu: "bg-success-soft text-success",
  refuse: "bg-coral-soft text-coral",
};

const FILTERS: { key: FeedbackStatus | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  ...FEEDBACK_STATUSES.map((s) => ({ key: s, label: FEEDBACK_STATUS_LABELS[s] })),
];

function FeedbackAdminCard({ feedback, onChanged }: { feedback: AdminFeedbackDto; onChanged: () => void }) {
  const now = useNow(60000);
  const [status, setStatus] = useState<FeedbackStatus>(feedback.status);
  const [adminNote, setAdminNote] = useState(feedback.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = feedback.type === "bug" ? Bug : Lightbulb;
  const dirty = status !== feedback.status || adminNote.trim() !== (feedback.adminNote ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/feedback/${feedback.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote: adminNote.trim() || undefined }),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-3 animate-rise-in">
      <div className="flex items-center gap-3">
        <Avatar name={feedback.author.nickname} avatarUrl={feedback.author.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">{feedback.author.nickname}</p>
          <p className="text-[11px] text-ink-soft">Envoyé {timeAgo(feedback.createdAt, now).toLowerCase()}</p>
        </div>
        <span className={cn("chip shrink-0", STATUS_CHIP[feedback.status])}>{FEEDBACK_STATUS_LABELS[feedback.status]}</span>
      </div>

      <span className="chip bg-paper text-ink-soft w-fit">
        <Icon size={12} aria-hidden /> {FEEDBACK_TYPE_LABELS[feedback.type]}
      </span>

      <p className="text-sm text-ink whitespace-pre-wrap">{feedback.message}</p>

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      <div className="border-t border-line pt-3 space-y-2">
        <label className="text-xs font-bold text-ink-soft" htmlFor={`status-${feedback.id}`}>
          Statut
        </label>
        <select
          id={`status-${feedback.id}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
          className="field"
        >
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FEEDBACK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="text-xs font-bold text-ink-soft" htmlFor={`note-${feedback.id}`}>
          Note pour le coach (optionnelle, visible de lui)
        </label>
        <textarea
          id={`note-${feedback.id}`}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          className="field resize-none"
          rows={2}
          maxLength={500}
          placeholder="Ce qui a été fait, pourquoi ce n'est pas retenu…"
        />
        <Button size="sm" className="w-full" disabled={busy || !dirty} onClick={save}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<AdminFeedbackDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackStatus | "all">("all");

  const load = useCallback(async () => {
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      setItems(await api<AdminFeedbackDto[]>(`/admin/feedback${query}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="display text-lg px-1">Signalements{items ? ` (${items.length})` : ""}</h2>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par statut">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn("chip-choice", filter === f.key ? "chip-choice-on" : "chip-choice-off")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && !items && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {!items ? (
        <CardGridSkeleton cards={4} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-soft text-center py-6">Aucun signalement dans ce filtre.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 items-start">
          {items.map((f) => (
            <FeedbackAdminCard key={f.id} feedback={f} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
