"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Radar } from "lucide-react";
import type { AnnouncementDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { NeonButton } from "@/components/ui/NeonButton";

export default function RadarPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await api<AnnouncementDto[]>("/announcements?status=open");
      setAnnouncements(all.filter((a) => !a.isMine));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string) {
    setResponding(id);
    setError(null);
    try {
      const { matchId } = await api<{ matchId: string }>(`/announcements/${id}/respond`, { method: "POST" });
      router.push(`/coach/matches/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de répondre");
      setResponding(null);
      load();
    }
  }

  if (!announcements) return <p className="text-white/40 animate-soft-pulse text-sm">Balayage du radar…</p>;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
        <Radar size={15} className="text-neon-cyan" /> Annonces des autres coachs
      </h2>
      {error && <p className="text-sm text-match-red">{error}</p>}
      {announcements.length === 0 && <p className="text-sm text-white/40">Aucune annonce ouverte pour le moment.</p>}
      {announcements.map((a) => (
        <div key={a.id} className="card-cyber p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">{a.team.name}</p>
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
              {a.category}
            </span>
          </div>
          <p className="text-sm text-white/70">
            {formatDate(a.date)} à {a.time}
          </p>
          <p className="text-xs text-white/50 flex items-center gap-1">
            <MapPin size={13} /> {a.stadium}, {a.city}
          </p>
          {a.comment && <p className="text-xs text-white/50 italic">« {a.comment} »</p>}
          <NeonButton size="sm" className="w-full" onClick={() => respond(a.id)} disabled={responding === a.id}>
            {responding === a.id ? "Confirmation…" : "Répondre à l'annonce"}
          </NeonButton>
        </div>
      ))}
    </div>
  );
}
