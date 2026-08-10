"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, SendHorizontal } from "lucide-react";
import { MESSAGE_MAX_LENGTH, type ConversationThreadDto, type MessageDto } from "@footcoach/shared";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { useTabBadges } from "@/components/TabBadgesContext";
import { CoachCardSheet } from "@/components/coach/CoachCardSheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/** Le fil est relu à ce rythme tant qu'il est ouvert et l'onglet au premier plan */
const REFRESH_MS = 10_000;

/** « 14:32 » — l'heure d'un message, dans le fuseau de l'appareil */
function hourOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** « Aujourd'hui », « Hier », sinon « lun. 4 août » — le séparateur de journée */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  if (day(date) === day(now)) return "Aujourd'hui";
  if (day(date) === day(yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Une conversation avec un confrère.
 *
 * Le fil se relit tout seul toutes les dix secondes : deux coachs qui calent
 * l'heure du coup d'envoi la veille au soir s'écrivent coup sur coup, et
 * attendre un rechargement de page pour voir la réponse casserait l'échange.
 * Rien n'est poussé en temps réel pour autant — l'application n'a pas de canal
 * ouvert, et une messagerie d'organisation n'en a pas besoin.
 */
export default function CoachConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [thread, setThread] = useState<ConversationThreadDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  /** Carte du confrère, ouverte depuis son nom */
  const [cardOpen, setCardOpen] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Dernier message pour lequel la lecture a déjà été signalée au serveur */
  const readUpTo = useRef<string | null>(null);

  /**
   * La fonction seule, et non l'objet du contexte : celui-ci est recréé à
   * chaque rendu de la mise en page, et le mettre en dépendance de `load`
   * relancerait la requête à chaque battement du compteur.
   */
  const refreshBadges = useTabBadges()?.refreshMessages;

  const load = useCallback(
    async (silent: boolean) => {
      try {
        const fresh = await api<ConversationThreadDto>(`/conversations/${id}`);
        setThread(fresh);
        setError(null);

        // « Lu » n'est signalé que si quelque chose de neuf est arrivé : sinon
        // chaque relecture écrirait en base toutes les dix secondes pour rien.
        const last = fresh.messages[fresh.messages.length - 1];
        if (last && last.id !== readUpTo.current) {
          readUpTo.current = last.id;
          await api(`/conversations/${id}/read`, { method: "POST" }).catch(() => undefined);
          // La pastille de l'onglet doit s'éteindre pendant qu'on lit, pas à la
          // navigation suivante.
          refreshBadges?.();
        }
      } catch (err) {
        // Une relecture qui échoue ne doit pas effacer le fil affiché : le
        // réseau d'un stade est ce qu'il est.
        if (!silent) setError(err instanceof ApiError ? err.message : "Conversation introuvable");
      }
    },
    [id, refreshBadges],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Relecture périodique, suspendue quand l'application passe à l'arrière-plan
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // On arrive toujours en bas du fil : c'est le dernier message qui intéresse
  const messageCount = thread?.messages.length ?? 0;
  useEffect(() => {
    if (messageCount > 0) endRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount]);

  // `SyntheticEvent` et non `FormEvent` : l'envoi part aussi d'un raccourci
  // clavier, qui n'est pas une soumission de formulaire.
  async function send(e: React.SyntheticEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const created = await api<MessageDto>(`/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      readUpTo.current = created.id;
      setThread((current) => (current ? { ...current, messages: [...current.messages, created] } : current));
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Message non envoyé");
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-[720px] mx-auto space-y-4">
        <Link
          href="/coach/messages"
          className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
            transition hover:text-ink active:bg-paper"
        >
          <ArrowLeft size={16} /> Messages
        </Link>
        <div className="card p-10 text-center space-y-2">
          <p className="text-sm font-bold">{error}</p>
          <p className="text-xs text-ink-soft">
            Cette conversation n&apos;existe pas, ou elle ne vous concerne pas.
          </p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-[720px] mx-auto space-y-4">
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { coach, teamName } = thread.conversation;
  let previousDay: string | null = null;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link
        href="/coach/messages"
        className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
          transition hover:text-ink active:bg-paper"
      >
        <ArrowLeft size={16} /> Messages
      </Link>

      {/* L'identité du confrère ouvre sa carte : dans un fil, on se demande vite
          à qui l'on parle, et la carte répond sans quitter la conversation. */}
      <button
        type="button"
        onClick={() => setCardOpen(true)}
        aria-label={`Voir la carte de ${coach.firstName} ${coach.lastName}`}
        className="card w-full p-4 flex items-center gap-3 text-left transition hover:border-accent/40 active:scale-[0.995]"
      >
        <Avatar firstName={coach.firstName} lastName={coach.lastName} avatarUrl={coach.avatarUrl} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black truncate">
            {coach.firstName} {coach.lastName}
          </span>
          <span className="block text-xs text-ink-soft font-semibold truncate">
            {teamName ?? "Coach"} — voir sa carte
          </span>
        </span>
      </button>

      <div className="space-y-2">
        {thread.messages.length === 0 && (
          <div className="card p-8 text-center space-y-3">
            <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
              <MessageCircle size={22} />
            </span>
            <p className="text-sm font-bold">Votre match est convenu</p>
            <p className="text-xs text-ink-soft">
              Écrivez le premier message : l&apos;heure d&apos;arrivée, la couleur des maillots, le vestiaire.
            </p>
          </div>
        )}

        {thread.messages.map((message) => {
          const day = dayLabel(message.createdAt);
          const newDay = day !== previousDay;
          previousDay = day;
          return (
            <div key={message.id} className="space-y-2">
              {newDay && (
                <p className="text-center">
                  <span className="chip bg-paper text-ink-soft">{day}</span>
                </p>
              )}
              <div className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 space-y-0.5",
                    message.mine
                      ? "bg-blue text-white rounded-br-sm"
                      : "surface-2 text-ink rounded-bl-sm border border-line",
                  )}
                >
                  {/* `whitespace-pre-wrap` : les retours à la ligne du confrère
                      sont son découpage, pas du bruit à écraser. */}
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={cn("text-[10px] text-right", message.mine ? "text-white/60" : "text-ink-faint")}>
                    {hourOf(message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Zone d'écriture collée au-dessus de la barre d'onglets : sur un fil, on
          répond depuis n'importe où dans l'historique, pas seulement une fois
          descendu tout en bas. */}
      <form
        onSubmit={send}
        className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] min-[960px]:bottom-4 z-10
          surface rounded-2xl border border-line shadow-pop p-2 space-y-2"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">
            Votre message
          </label>
          <textarea
            id="message"
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // Le champ grandit avec le texte, jusqu'à cinq lignes environ
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
            }}
            onKeyDown={(e) => {
              // Entrée seule fait un retour à la ligne : au téléphone, c'est ce
              // qu'on attend d'une touche Entrée dans une zone de texte.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send(e);
              }
            }}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder="Votre message…"
            className="field flex-1 min-h-11 py-2.5 resize-none"
          />
          <Button type="submit" size="sm" disabled={sending || draft.trim().length === 0} aria-label="Envoyer">
            <SendHorizontal size={16} />
          </Button>
        </div>
        {sendError && <p className="text-xs font-semibold text-coral px-1">{sendError}</p>}
      </form>

      {cardOpen && <CoachCardSheet coachId={coach.id} onClose={() => setCardOpen(false)} />}
    </div>
  );
}
