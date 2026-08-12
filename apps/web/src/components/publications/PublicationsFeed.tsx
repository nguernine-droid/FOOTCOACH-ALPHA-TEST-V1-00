"use client";

import { useCallback, useEffect, useState } from "react";
import { Newspaper, Trash2 } from "lucide-react";
import type { PublicationDto } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { CoachCardSheet } from "@/components/coach/CoachCardSheet";
import { Skeleton } from "@/components/ui/Skeleton";

export type PublicationsFeed = {
  /** null tant que le premier chargement n'a pas répondu */
  posts: PublicationDto[] | null;
  error: string | null;
  reload: () => void;
  publish: (body: string) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
};

/** Les billets du secteur, et les deux gestes qui vont avec : publier, effacer le sien. */
export function usePublicationsFeed(): PublicationsFeed {
  const [posts, setPosts] = useState<PublicationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setPosts(await api<PublicationDto[]>("/publications"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const publish = useCallback(
    async (body: string) => {
      try {
        await api("/publications", { method: "POST", body: JSON.stringify({ body }) });
        await reload();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de publier");
        return false;
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await api(`/publications/${id}`, { method: "DELETE" }).catch(() => undefined);
      reload();
    },
    [reload],
  );

  return { posts, error, reload, publish, remove };
}

/**
 * Le panneau d'affichage du secteur : les billets d'information des coachs
 * contributeurs — poules des matchs officiels, intempéries qui annulent…
 *
 * Lecture pour tous ; la rédaction se fait par le « + » de la barre d'onglets
 * (`/coach/publications/new`), qui ne propose l'option qu'aux contributeurs.
 * Les autres coachs lisent — c'est un panneau, pas un mur où chacun épingle.
 */
export function PublicationsFeedView({ feed }: { feed: PublicationsFeed }) {
  const { posts, error, remove } = feed;
  /** Billet dont la suppression attend confirmation — un seul à la fois */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  /** Auteur dont la carte est ouverte en feuille */
  const [cardCoachId, setCardCoachId] = useState<string | null>(null);
  const now = new Date();

  if (!posts && !error) {
    return (
      <div className="card divide-y divide-line" aria-busy aria-label="Chargement">
        {[0, 1].map((i) => (
          <div key={i} className="px-4 py-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-3 w-64" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Plus de zone de rédaction en tête du panneau. Elle occupait le haut de
          l'écran chez les contributeurs, à demeure, pour un geste qui se fait
          quelques fois par saison — et le « + » de la barre le propose déjà,
          au même endroit que les deux autres créations. */}

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {posts?.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Newspaper size={22} />
          </span>
          <p className="text-sm font-bold">Aucune publication pour l&apos;instant</p>
          <p className="text-xs text-ink-soft">
            Les coachs contributeurs partagent ici les informations du secteur : poules des matchs officiels,
            terrains impraticables, plateaux annulés…
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {posts?.map((p) => (
            <article key={p.id} className="px-4 py-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar
                  name={p.author.nickname}
                  avatarUrl={p.author.avatarUrl}
                  size={40}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  {/* Le nom d'un confrère ouvre sa carte — le même geste que
                      partout ailleurs. Le sien n'ouvre rien : sa carte est au
                      menu « Moi », et ce serait une porte de plus vers soi. */}
                  {p.mine ? (
                    <p className="text-sm font-bold truncate">
                      {p.author.nickname}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCardCoachId(p.author.id)}
                      className="block max-w-full text-sm font-bold truncate transition hover:text-blue
                        focus-visible:outline-accent rounded"
                    >
                      {p.author.nickname}
                    </button>
                  )}
                  <p className="text-[11px] text-ink-faint font-semibold truncate">
                    {p.teamName ? `${p.teamName} · ` : ""}
                    {timeAgo(p.createdAt, now)}
                  </p>
                </div>
                {p.mine &&
                  (confirmingId === p.id ? (
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      onBlur={() => setConfirmingId(null)}
                      className="shrink-0 min-h-11 px-3 rounded-lg text-xs font-bold text-coral bg-coral-soft
                        transition active:scale-95 focus-visible:outline-accent"
                    >
                      Supprimer ?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(p.id)}
                      aria-label="Supprimer cette publication"
                      className="shrink-0 w-11 h-11 -mr-2 rounded-lg flex items-center justify-center text-ink-faint
                        transition hover:text-coral active:bg-paper focus-visible:outline-accent"
                    >
                      <Trash2 size={16} />
                    </button>
                  ))}
              </div>
              {/* Les retours à la ligne de l'auteur sont sa mise en forme : une
                  liste de poules se lit en liste, pas en paragraphe. */}
              <p className="text-sm text-ink whitespace-pre-wrap break-words">{p.body}</p>
            </article>
          ))}
        </div>
      )}

      {cardCoachId && <CoachCardSheet coachId={cardCoachId} onClose={() => setCardCoachId(null)} />}
    </div>
  );
}
