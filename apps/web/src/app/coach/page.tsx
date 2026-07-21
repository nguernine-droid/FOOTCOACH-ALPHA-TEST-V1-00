"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Car, Trash2 } from "lucide-react";
import type { AnnouncementDto, MatchDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { NeonButton } from "@/components/ui/NeonButton";

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

  if (error) return <p className="text-sm text-match-red">{error}</p>;
  if (!matches || !announcements) return <p className="text-white/40 animate-soft-pulse text-sm">Chargement…</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Mes matchs</h2>
        {matches.length === 0 && <p className="text-sm text-white/40">Aucun match. Postez une annonce ou répondez-en une via le radar.</p>}
        {matches.map((match) => (
          <MatchCard key={match.id} match={match}>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Car size={13} /> {match.transportSeats} place{match.transportSeats > 1 ? "s" : ""} de transport
              </span>
              <Link href={`/coach/matches/${match.id}`}>
                <NeonButton size="sm" variant="cyan">
                  Gérer
                </NeonButton>
              </Link>
            </div>
          </MatchCard>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Mes annonces</h2>
        {announcements.length === 0 && <p className="text-sm text-white/40">Aucune annonce en cours.</p>}
        {announcements.map((a) => (
          <div key={a.id} className="card-cyber p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {a.category} · {formatDate(a.date)} à {a.time}
              </p>
              <p className="text-xs text-white/50 truncate">
                {a.stadium}, {a.city}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-white/10 text-white/60">
                {a.status === "open" ? "Ouverte" : "Matchée"}
              </span>
              {a.status === "open" && (
                <button
                  onClick={() => cancelAnnouncement(a.id)}
                  className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-match-red hover:border-match-red/40 transition"
                  aria-label="Annuler l'annonce"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
