"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin, Navigation, Radar, X, XCircle } from "lucide-react";
import type { AnnouncementDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";

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

/**
 * Les équipes qui cherchent un adversaire, triées par proximité.
 * Affiché dans le tableau de bord du coach — le cœur de la V1.
 */
export function RadarFeed() {
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
      await api(`/announcements/${id}/respond`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de répondre");
      load();
    } finally {
      setResponding(null);
    }
  }

  const header = (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
        <Radar size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="display text-lg leading-none">Radar des matchs</h3>
        <p className="text-xs text-ink-soft">Les équipes autour de vous qui cherchent un adversaire.</p>
      </div>
    </div>
  );

  if (!announcements) {
    return (
      <section className="card p-5 space-y-4" aria-label="Radar des matchs" aria-busy>
        {header}
        <Skeleton className="h-40" />
      </section>
    );
  }

  const filtered = announcements
    .filter((a) => (category ? a.category === category : true))
    .filter((a) => (date ? a.date === date : true))
    .sort(byProximity);

  return (
    <section className="card p-5 space-y-4 animate-rise-in" aria-label="Radar des matchs">
      {header}

      {announcements.length > 0 && (
        <div className="space-y-2">
          {/* Rangée de catégories qui défile horizontalement plutôt que de se
              replier : sept pastilles de 44 px ne tiennent pas sur deux lignes
              sans manger l'écran. */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            <button
              type="button"
              onClick={() => setCategory(null)}
              aria-pressed={category === null}
              className={cn("chip-choice shrink-0", category === null ? "chip-choice-on" : "chip-choice-off")}
            >
              Toutes
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(category === c ? null : c)}
                aria-pressed={category === c}
                className={cn("chip-choice shrink-0", category === c ? "chip-choice-on" : "chip-choice-off")}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 min-[960px]:max-w-64">
            <div className="flex-1 min-w-0">
              <DateField value={date} onChange={setDate} placeholder="Toutes les dates" />
            </div>
            {date && (
              <button
                type="button"
                onClick={() => setDate("")}
                className="icon-btn text-ink-soft hover:text-coral hover:bg-coral-soft"
                aria-label="Effacer le filtre de date"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {announcements.length === 0 ? (
        <div className="rounded-lg bg-paper px-4 py-8 text-center space-y-3">
          <p className="text-sm font-bold">Aucun match autour de vous</p>
          <p className="text-xs text-ink-soft">
            Publiez une annonce : elle apparaîtra sur le radar des autres coachs.
          </p>
          <ButtonLink href="/coach/announcements/new" variant="soft" className="w-full sm:w-auto">
            Publier une annonce
          </ButtonLink>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg bg-paper px-4 py-8 text-center space-y-2">
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
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-lg border border-line p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "w-10 h-10 rounded-full text-white flex items-center justify-center text-xs font-black shrink-0",
                      teamColor(a.team),
                    )}
                  >
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

              {a.myResponseStatus === "pending" ? (
                <p className="text-xs font-bold text-sun bg-sun-soft rounded-lg px-4 py-3 flex items-center gap-2">
                  <Clock3 size={14} className="shrink-0" />
                  Proposition envoyée — en attente de validation du coach
                </p>
              ) : a.myResponseStatus === "declined" ? (
                <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-4 py-3 flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  Proposition déclinée par le coach
                </p>
              ) : (
                <Button className="w-full" onClick={() => respond(a.id)} disabled={responding === a.id}>
                  {responding === a.id ? "Envoi…" : "Proposer de jouer"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
