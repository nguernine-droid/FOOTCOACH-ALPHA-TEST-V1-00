"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { PublicationDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { timeAgo, useNow } from "@/lib/time";

export default function PublicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const now = useNow(60000);
  const [publication, setPublication] = useState<PublicationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      setPublication(await api<PublicationDto>(`/publications/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/publications/${id}`, { method: "DELETE" });
      router.push("/coach/publications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
      setBusy(false);
    }
  }

  if (error && !publication) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  }
  if (!publication) return <Skeleton className="h-96" />;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link
        href="/coach/publications"
        className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
          transition hover:text-ink active:bg-paper"
      >
        <ArrowLeft size={16} /> Retour aux publications
      </Link>

      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar
            firstName={publication.author.firstName}
            lastName={publication.author.lastName}
            avatarUrl={publication.author.avatarUrl}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">
              {publication.author.firstName} {publication.author.lastName}
            </p>
            <p className="text-xs text-ink-soft">{timeAgo(publication.createdAt, now)}</p>
          </div>
        </div>

        <h2 className="display text-xl leading-tight">{publication.title}</h2>
        <p className="text-sm text-ink whitespace-pre-wrap">{publication.body}</p>
      </section>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {publication.isMine &&
        (confirmDelete ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" disabled={busy} onClick={remove}>
              <Trash2 size={14} /> Confirmer la suppression
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Supprimer cette publication
          </Button>
        ))}
    </div>
  );
}
