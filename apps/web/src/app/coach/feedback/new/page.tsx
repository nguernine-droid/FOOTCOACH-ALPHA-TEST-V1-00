"use client";

import { useState } from "react";
import { Bug, CheckCircle2, Lightbulb, MessageSquareWarning } from "lucide-react";
import { FEEDBACK_TYPES, FEEDBACK_TYPE_LABELS, type FeedbackType } from "@footcoach/shared";
import { api } from "@/lib/api";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const FORM_ID = "nouveau-signalement";
const TYPE_ICONS: Record<FeedbackType, typeof Bug> = { bug: Bug, suggestion: Lightbulb };

export default function NewFeedbackPage() {
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Pas de liste « mes signalements » : seul l'admin les consulte. Une simple
  // confirmation suffit à fermer la boucle côté coach.
  const [sent, setSent] = useState(false);

  useQuickActionOverride(
    sent
      ? null
      : { kind: "submit", formId: FORM_ID, label: "Envoyer", disabled: loading || message.trim().length < 10 },
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api("/feedback", { method: "POST", body: JSON.stringify({ type, message: message.trim() }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-[560px] mx-auto card p-6 space-y-3 text-center">
        <span className="w-12 h-12 rounded-lg bg-success-soft text-success flex items-center justify-center mx-auto">
          <CheckCircle2 size={22} />
        </span>
        <p className="text-sm font-bold">Signalement envoyé</p>
        <p className="text-xs text-ink-soft">Transmis à l&apos;équipe FootCoach, qui s&apos;en occupe.</p>
        <Button
          variant="soft"
          className="w-full"
          onClick={() => {
            setType("bug");
            setMessage("");
            setSent(false);
          }}
        >
          Signaler autre chose
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <MessageSquareWarning size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Signaler un bug ou une idée</h2>
          <p className="text-xs text-white/85">Reçu directement par l&apos;équipe FootCoach.</p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">De quoi s&apos;agit-il ?</span>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn("chip-choice flex items-center gap-1.5", type === t ? "chip-choice-on" : "chip-choice-off")}
                >
                  <Icon size={13} aria-hidden /> {FEEDBACK_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="message" className="text-xs font-bold text-ink-soft">
            {type === "bug" ? "Que s'est-il passé ?" : "Votre idée"}
          </label>
          <textarea
            id="message"
            required
            minLength={10}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="field resize-none"
            rows={6}
            placeholder={
              type === "bug"
                ? "Ce que vous avez fait, ce qui s'est affiché, ce que vous attendiez à la place…"
                : "Ce qui manque, ce qui pourrait être plus simple…"
            }
          />
          <p className="text-[11px] text-ink-soft">{message.trim().length}/2000</p>
        </div>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || message.trim().length < 10}>
          {loading ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </div>
  );
}
