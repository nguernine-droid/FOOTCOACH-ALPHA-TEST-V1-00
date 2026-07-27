"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Radar, ShieldCheck } from "lucide-react";
import { FFF_NOTICE_DAYS, type AnnouncementDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MyAnnouncementCard } from "@/components/announcements/MyAnnouncementCard";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

type Filter = "open" | "matched" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "En recherche" },
  { key: "matched", label: "Confirmées" },
  { key: "cancelled", label: "Annulées" },
];

/**
 * Espace « Annonces » du coach : le cœur de la V1 — publier une recherche
 * d'adversaire, suivre les propositions reçues et confirmer le match amical.
 */
export default function AnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");

  const load = useCallback(async () => {
    try {
      const all = await api<AnnouncementDto[]>("/announcements");
      setAnnouncements(all.filter((a) => a.isMine));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Accepter une proposition crée le match : on enchaîne sur sa feuille de match
  async function accept(announcementId: string, responseId: string) {
    try {
      const { matchId } = await api<{ matchId: string }>(
        `/announcements/${announcementId}/responses/${responseId}/accept`,
        { method: "POST" },
      );
      router.push(`/coach/matches/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'accepter cette proposition");
      load();
    }
  }

  async function decline(announcementId: string, responseId: string) {
    await api(`/announcements/${announcementId}/responses/${responseId}/decline`, { method: "POST" }).catch(
      () => undefined,
    );
    load();
  }

  async function cancel(id: string) {
    await api(`/announcements/${id}`, { method: "DELETE" }).catch(() => undefined);
    load();
  }

  if (!announcements) return <CardGridSkeleton cards={3} />;

  const counts: Record<Filter, number> = {
    open: announcements.filter((a) => a.status === "open").length,
    matched: announcements.filter((a) => a.status === "matched").length,
    cancelled: announcements.filter((a) => a.status === "cancelled").length,
  };
  const shown = announcements
    .filter((a) => a.status === filter)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pendingTotal = announcements
    .filter((a) => a.status === "open")
    .reduce((n, a) => n + a.responses.filter((r) => r.status === "pending").length, 0);

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Megaphone size={22} />
        </span>
        {/* min-w assez large pour que le bouton passe à la ligne au lieu d'écraser le texte */}
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Mes annonces</h2>
          <p className="text-xs text-white/80">
            {pendingTotal > 0
              ? `${pendingTotal} proposition${pendingTotal > 1 ? "s" : ""} d'adversaire à valider.`
              : "Publiez une recherche d'adversaire : elle apparaît sur le radar des autres coachs."}
          </p>
        </div>
        <ButtonLink href="/coach/announcements/new" variant="accent" className="shrink-0 w-full sm:w-auto">
          <Megaphone size={14} /> Publier une annonce
        </ButtonLink>
      </div>

      <div className="rounded-lg bg-white border border-line px-4 py-3 flex gap-2.5">
        <ShieldCheck size={15} className="text-blue shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-ink-soft">
          Un match amical doit être déclaré à votre district au moins{" "}
          <span className="font-bold text-ink">{FFF_NOTICE_DAYS} jours</span> avant la rencontre. Chaque annonce
          indique si le délai est tenu.
        </p>
      </div>

      {/* Trois filtres qui se partagent la largeur : cible large, pas de repli */}
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Filtrer mes annonces">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn("chip-choice", filter === f.key ? "chip-choice-on" : "chip-choice-off")}
          >
            <span className="truncate">{f.label}</span> ({counts[f.key]})
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {shown.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Megaphone size={22} />
          </span>
          <p className="text-sm font-bold">
            {filter === "open"
              ? "Aucune annonce en recherche"
              : filter === "matched"
                ? "Aucun match confirmé pour l'instant"
                : "Aucune annonce annulée"}
          </p>
          {filter === "open" && (
            <>
              <p className="text-xs text-ink-soft">
                Publiez une annonce, ou répondez à une équipe depuis le radar du tableau de bord.
              </p>
              <div className="grid gap-2 sm:flex sm:justify-center">
                <ButtonLink href="/coach/announcements/new">Publier une annonce</ButtonLink>
                <ButtonLink href="/coach" variant="soft">
                  <Radar size={14} /> Ouvrir le radar
                </ButtonLink>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start">
          {shown.map((a) => (
            <MyAnnouncementCard
              key={a.id}
              announcement={a}
              onAccept={accept}
              onDecline={decline}
              onCancel={cancel}
              showLocation
            />
          ))}
        </div>
      )}
    </div>
  );
}
