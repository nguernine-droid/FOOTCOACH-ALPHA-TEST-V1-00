"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, ChevronRight, MessageCircle } from "lucide-react";
import type { ConversationDto } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";

/** Silhouette de la liste : trois lignes à la bonne hauteur, zéro saut au chargement */
function ConversationsSkeleton() {
  return (
    <div className="card divide-y divide-line" aria-busy aria-label="Chargement">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Mes conversations avec les autres coachs.
 *
 * Aucun bouton « nouvelle conversation » : un fil s'ouvre quand un match est
 * convenu — quand j'accepte une proposition, ou quand la mienne est acceptée.
 * On écrit donc à quelqu'un avec qui on a quelque chose à organiser, et la
 * messagerie ne devient jamais un moyen de démarcher tous les coachs du secteur.
 */
export default function CoachMessagesPage() {
  const pathname = usePathname();
  const active = pathname === "/coach/messages";
  const [conversations, setConversations] = useState<ConversationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const load = useCallback(async () => {
    try {
      setConversations(await api<ConversationDto[]>("/conversations"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  /**
   * Chargée au montage — l'écran est déjà dessiné quand le doigt l'amène — puis
   * relue chaque fois qu'on revient sur l'onglet : un message reçu pendant
   * qu'on regardait ailleurs doit apparaître sans relancer l'application. Le
   * ref évite la requête inutile au moment où l'on QUITTE l'onglet.
   */
  const wasActive = useRef<boolean | null>(null);
  useEffect(() => {
    const first = wasActive.current === null;
    const reopened = active && wasActive.current === false;
    wasActive.current = active;
    if (first || reopened) load();
  }, [active, load]);

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <h2 className="display text-lg text-ink px-1">Messages</h2>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {!conversations && !error ? (
        <ConversationsSkeleton />
      ) : conversations?.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <MessageCircle size={22} />
          </span>
          <p className="text-sm font-bold">Aucune conversation</p>
          <p className="text-xs text-ink-soft">
            Une conversation s&apos;ouvre dès qu&apos;un match est convenu : quand vous acceptez une proposition,
            ou quand la vôtre est acceptée.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {conversations?.map((c) => (
            <Link
              key={c.id}
              href={`/coach/messages/${c.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-paper active:bg-paper"
            >
              <Avatar
                name={c.coach.nickname}
                avatarUrl={c.coach.avatarUrl}
                size={48}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className={cn("truncate text-sm", c.unread > 0 ? "font-black" : "font-bold")}>
                    {c.coach.nickname}
                  </p>
                  <span className="ml-auto shrink-0 text-[11px] text-ink-faint font-semibold">
                    {timeAgo(c.lastMessage?.createdAt ?? c.updatedAt, now)}
                  </span>
                </div>
                {/* L'aperçu prend la place de l'équipe dès qu'il y a un message :
                    savoir de quoi on parlait compte plus que savoir qui c'est,
                    le nom est juste au-dessus. Un match inscrit par
                    l'application s'annonce par son icône — sans elle, « Match
                    confirmé — U13… » se lirait comme une phrase du confrère. */}
                <p
                  className={cn(
                    "truncate text-xs flex items-center gap-1",
                    c.unread > 0 ? "text-ink font-bold" : "text-ink-soft font-semibold",
                  )}
                >
                  {c.lastMessage?.kind === "system" && (
                    <CalendarCheck2 size={12} className="shrink-0 text-blue" aria-hidden />
                  )}
                  <span className="truncate">
                    {c.lastMessage
                      ? `${c.lastMessage.mine ? "Vous : " : ""}${c.lastMessage.body}`
                      : (c.teamName ?? "Match convenu — écrivez-lui")}
                  </span>
                </p>
              </div>
              {c.unread > 0 ? (
                <span
                  className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-alert text-white text-[11px] font-black
                    flex items-center justify-center"
                  aria-label={`${c.unread} message${c.unread > 1 ? "s" : ""} non lu${c.unread > 1 ? "s" : ""}`}
                >
                  {c.unread > 9 ? "9+" : c.unread}
                </span>
              ) : (
                <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
