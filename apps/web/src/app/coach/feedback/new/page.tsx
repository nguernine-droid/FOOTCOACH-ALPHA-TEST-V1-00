"use client";

import { useEffect, useState } from "react";
import { Bug, CheckCircle2, Lightbulb, MessageCircle, MessageSquareWarning } from "lucide-react";
import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  type FeedbackDto,
  type FeedbackType,
} from "@teamnexus/shared";
import { api, getStoredUser } from "@/lib/api";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const FORM_ID = "nouveau-signalement";
const TYPE_ICONS: Record<FeedbackType, typeof Bug> = { bug: Bug, suggestion: Lightbulb };

export default function NewFeedbackPage() {
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Pas de liste « mes signalements » : la suite se lit dans le FIL ouvert avec
  // l'équipe, à sa place, dans la messagerie.
  const [sent, setSent] = useState(false);
  /** Le fil ouvert par l'envoi — de quoi y aller directement depuis la confirmation */
  const [conversationId, setConversationId] = useState<string | null>(null);
  /**
   * La casquette est lue APRÈS le montage, comme dans le layout coach : elle vit
   * dans le stockage local, absent du rendu serveur. `null` le temps de la lire
   * — l'écran ne doit ni s'ouvrir ni se refuser avant de savoir.
   */
  const [contributor, setContributor] = useState<boolean | null>(null);
  useEffect(() => {
    setContributor((getStoredUser()?.categories ?? []).includes("contributeur"));
  }, []);

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
      const created = await api<FeedbackDto>("/feedback", {
        method: "POST",
        body: JSON.stringify({ type, message: message.trim() }),
      });
      setConversationId(created.conversationId);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
      setLoading(false);
    }
  }

  // La casquette n'est pas encore lue : rien ne s'affiche plutôt qu'un écran
  // qui s'ouvre puis se referme.
  if (contributor === null) return <Skeleton className="h-64 max-w-[560px] mx-auto rounded-card" />;

  if (!contributor) {
    return (
      <div className="max-w-[560px] mx-auto card p-6 space-y-3 text-center">
        <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
          <MessageSquareWarning size={22} />
        </span>
        <p className="text-sm font-bold">Réservé aux coachs contributeurs</p>
        <p className="text-xs text-ink-soft">
          Signaler un bug ou proposer une amélioration fait partie de ce qu&apos;engage la casquette
          contributeur : chaque retour ouvre une discussion avec l&apos;équipe TeamNexus, qui se suit dans le
          temps. Vous pouvez la prendre depuis votre profil.
        </p>
        <ButtonLink href="/coach/profile" variant="soft" className="w-full">
          Voir mes casquettes
        </ButtonLink>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="max-w-[560px] mx-auto card p-6 space-y-3 text-center">
        <span className="w-12 h-12 rounded-lg bg-success-soft text-success flex items-center justify-center mx-auto">
          <CheckCircle2 size={22} />
        </span>
        <p className="text-sm font-bold">Signalement envoyé</p>
        <p className="text-xs text-ink-soft">
          {conversationId
            ? "Il ouvre une discussion avec l'équipe TeamNexus : sa réponse arrivera dans votre messagerie, et vous pouvez y ajouter des précisions."
            : "Transmis à l'équipe TeamNexus, qui s'en occupe."}
        </p>
        {conversationId && (
          <ButtonLink href={`/coach/messages/${conversationId}`} className="w-full">
            <MessageCircle size={15} /> Ouvrir la discussion
          </ButtonLink>
        )}
        <Button
          variant="soft"
          className="w-full"
          onClick={() => {
            setType("bug");
            setMessage("");
            setConversationId(null);
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
          <p className="text-xs text-white/85">
            Votre retour ouvre une discussion avec l&apos;équipe TeamNexus.
          </p>
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
