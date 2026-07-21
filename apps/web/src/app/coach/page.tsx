"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Car, ChevronRight, Megaphone, Trash2 } from "lucide-react";
import type { AnnouncementDto, MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";

function EmptyState({ icon, text, cta }: { icon: React.ReactNode; text: string; cta?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-pitch-soft text-pitch flex items-center justify-center mx-auto">{icon}</div>
      <p className="text-sm text-ink-soft font-medium">{text}</p>
      {cta}
    </div>
  );
}

export default function CoachDashboard() {
  const [matches, setMatches] = useState<MatchDto[] | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([api<MatchDto[]>("/matches"), api<AnnouncementDto[]>("/announcements")]);
      setMatches(m);
      setAnnouncements(a.filter((x) => x.isMine && x.status !== "cancelled"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancelAnnouncement(id: string) {
    await api(`/announcements/${id}`, { method: "DELETE" });
    load();
  }

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-2xl px-4 py-3">{error}</p>;
  if (!matches || !announcements) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-black text-ink px-1">Mes matchs</h2>
        {matches.length === 0 && (
          <EmptyState
            icon={<CalendarPlus size={20} />}
            text="Aucun match pour l'instant. Postez une annonce ou explorez le radar !"
            cta={
              <Link href="/coach/radar">
                <Button variant="soft" size="sm">Ouvrir le radar</Button>
              </Link>
            }
          />
        )}
        {matches.map((match) => (
          <MatchCard key={match.id} match={match}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
                <Car size={13} className="text-tangerine" /> {match.transportSeats} place{match.transportSeats > 1 ? "s" : ""} dispo
              </span>
              <Link href={`/coach/matches/${match.id}`}>
                <Button size="sm">
                  Gérer <ChevronRight size={14} />
                </Button>
              </Link>
            </div>
          </MatchCard>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black text-ink px-1">Mes annonces</h2>
        {announcements.length === 0 && (
          <EmptyState
            icon={<Megaphone size={20} />}
            text="Aucune annonce en cours."
            cta={
              <Link href="/coach/announcements/new">
                <Button variant="soft" size="sm">Créer une annonce</Button>
              </Link>
            }
          />
        )}
        {announcements.map((a) => (
          <div key={a.id} className="card p-4 flex items-center justify-between gap-3 animate-rise-in">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-2xl bg-tangerine-soft text-tangerine flex items-center justify-center shrink-0">
                <Megaphone size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate capitalize">
                  {a.category} · {formatDate(a.date)} à {a.time}
                </p>
                <p className="text-xs text-ink-soft truncate">
                  {a.stadium}, {a.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={a.status === "open" ? "chip bg-sky-soft text-sky" : "chip bg-pitch-soft text-pitch-deep"}>
                {a.status === "open" ? "Ouverte" : "Matchée"}
              </span>
              {a.status === "open" && (
                <button
                  onClick={() => cancelAnnouncement(a.id)}
                  className="p-2.5 rounded-xl text-ink-soft/60 hover:text-coral hover:bg-coral-soft transition"
                  aria-label="Annuler l'annonce"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
