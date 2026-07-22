"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Navigation, Radar, X } from "lucide-react";
import type { AnnouncementDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

const LEVEL_LABELS = { loisir: "Loisir", competition: "Compétition" } as const;
const CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "Seniors"];

/** Tri par proximité (distances inconnues en dernier), puis par date */
function byProximity(a: AnnouncementDto, b: AnnouncementDto): number {
  if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }
  if (a.distanceKm !== null && b.distanceKm === null) return -1;
  if (a.distanceKm === null && b.distanceKm !== null) return 1;
  return a.date.localeCompare(b.date);
}

export default function RadarPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState("");

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

  if (!announcements) return <CardGridSkeleton cards={3} />;

  const filtered = announcements
    .filter((a) => (category ? a.category === category : true))
    .filter((a) => (date ? a.date === date : true))
    .sort(byProximity);

  return (
    <div className="space-y-3">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Radar size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Radar des matchs</h2>
          <p className="text-xs text-white/80">Les équipes autour de vous qui cherchent un adversaire — triées par proximité.</p>
        </div>
      </div>

      {/* Filtres : catégorie + date */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={cn(
            "px-3.5 py-2 rounded-lg text-xs font-bold border transition",
            category === null ? "bg-navy-700 text-white border-navy-700" : "bg-white text-ink-soft border-line hover:border-blue/40",
          )}
        >
          Toutes
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            aria-pressed={category === c}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold border transition",
              category === c ? "bg-navy-700 text-white border-navy-700" : "bg-white text-ink-soft border-line hover:border-blue/40",
            )}
          >
            {c}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto min-w-44">
          <div className="flex-1">
            <DateField value={date} onChange={setDate} placeholder="Toutes les dates" />
          </div>
          {date && (
            <button
              type="button"
              onClick={() => setDate("")}
              className="p-2 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-soft transition"
              aria-label="Effacer le filtre de date"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}
      {filtered.length === 0 && announcements.length > 0 && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-sm font-bold">Aucune annonce ne correspond aux filtres</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategory(null);
              setDate("");
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}
      {announcements.length === 0 && (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center mx-auto">
            <Radar size={22} />
          </span>
          <p className="text-sm font-bold">Aucun match autour de vous</p>
          <p className="text-xs text-ink-soft">Publiez une annonce : elle apparaîtra sur le radar des autres coachs.</p>
          <Link href="/coach/announcements/new" className="inline-block">
            <Button variant="soft" size="sm">Publier une annonce</Button>
          </Link>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
      {filtered.map((a) => (
        <div key={a.id} className="card p-5 space-y-3 animate-rise-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn("w-10 h-10 rounded-full text-white flex items-center justify-center text-xs font-black shrink-0", teamColor(a.team))}>
                {teamInitials(a.team.name)}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{a.team.name}</p>
                <p className="text-xs text-ink-soft truncate">{a.team.city}</p>
              </div>
            </div>
            {a.distanceKm !== null && (
              <span className="chip bg-blue-soft text-navy-700 shrink-0">
                <Navigation size={11} /> à {a.distanceKm.toLocaleString("fr-FR")} km
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="chip bg-pitch-soft text-pitch-deep">{a.category}</span>
            <span className="chip bg-pitch-soft text-pitch-deep">{a.format}</span>
            <span className="chip bg-paper text-ink-soft">{LEVEL_LABELS[a.level]}</span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft font-semibold">
            <span className="flex items-center gap-1.5 capitalize">
              <CalendarDays size={13} className="text-pitch" /> {formatDate(a.date)} à {a.time}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-pitch" /> {a.stadium}, {a.city}
            </span>
          </div>

          {a.comment && (
            <div className="text-xs bg-paper rounded-lg px-4 py-3 space-y-0.5">
              <p className="font-bold text-ink-soft">Informations pratiques</p>
              <p className="text-ink-soft">{a.comment}</p>
            </div>
          )}

          <Button className="w-full" onClick={() => respond(a.id)} disabled={responding === a.id}>
            {responding === a.id ? "Confirmation…" : "Proposer de jouer"}
          </Button>
        </div>
      ))}
      </div>
    </div>
  );
}
