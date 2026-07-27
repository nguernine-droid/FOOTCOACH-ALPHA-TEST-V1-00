"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Crosshair, MapPin, Navigation, Radar, X, XCircle } from "lucide-react";
import type { AnnouncementDto, UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { RADIUS_OPTIONS, RadarScope, toBlips } from "@/components/announcements/RadarScope";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";

const LEVEL_LABELS = { loisir: "Loisir", competition: "Compétition" } as const;
const CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "Seniors"];
/** Périmètre par défaut : la distance qu'un club accepte de faire pour un amical */
const DEFAULT_RADIUS_KM = 50;

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
 * Les équipes qui cherchent un adversaire : un écran de radar qui balaie le
 * périmètre choisi, puis la liste détaillée des annonces qu'il a détectées.
 * Affiché dans le tableau de bord du coach — le cœur de la V1.
 */
export function RadarFeed() {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState("");
  // `null` = sans limite. Réglage conservé côté serveur : il sert aussi à
  // décider quelles annonces déclenchent une notification push.
  const stored = getStoredUser();
  const [radiusKm, setRadiusKm] = useState<number | null>(
    stored?.radarRadiusKm === undefined ? DEFAULT_RADIUS_KM : stored.radarRadiusKm,
  );
  const [origin, setOrigin] = useState(stored?.location ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  // La session peut dater d'avant le réglage de position : on relit la fiche
  useEffect(() => {
    api<UserDto>("/me")
      .then((fresh) => {
        updateStoredUser(fresh);
        setOrigin(fresh.location ?? null);
        if (fresh.radarRadiusKm !== undefined) setRadiusKm(fresh.radarRadiusKm);
      })
      .catch(() => undefined);
  }, []);

  function changeRadius(value: number | null) {
    setRadiusKm(value);
    setSelectedId(null);
    api<UserDto>("/me/radar-radius", { method: "PUT", body: JSON.stringify({ radiusKm: value }) })
      .then(updateStoredUser)
      .catch(() => undefined);
  }

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

  /** Un point du radar renvoie à sa fiche dans la liste */
  function focusCard(id: string) {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const matchesFilters = useMemo(
    () =>
      (announcements ?? [])
        .filter((a) => (category ? a.category === category : true))
        .filter((a) => (date ? a.date === date : true)),
    [announcements, category, date],
  );

  // Le périmètre ne masque jamais une annonce dont la ville est inconnue : on
  // ne peut pas affirmer qu'elle est hors rayon, seulement qu'on ne sait pas.
  const inRange = useMemo(
    () =>
      matchesFilters
        .filter((a) => radiusKm === null || a.distanceKm === null || a.distanceKm <= radiusKm)
        .sort(byProximity),
    [matchesFilters, radiusKm],
  );
  const outOfRange = matchesFilters.filter(
    (a) => radiusKm !== null && a.distanceKm !== null && a.distanceKm > radiusKm,
  );
  const unknownCount = inRange.filter((a) => a.distanceKm === null).length;

  // Sans limite, le cercle extérieur se cale sur l'annonce la plus lointaine
  const farthest = Math.max(0, ...inRange.map((a) => a.distanceKm ?? 0));
  const scaleKm = radiusKm ?? Math.max(10, Math.ceil(farthest / 10) * 10);
  const blips = useMemo(() => toBlips(inRange, scaleKm), [inRange, scaleKm]);

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
        <Skeleton className="h-[300px] max-w-[300px] mx-auto rounded-full" />
        <Skeleton className="h-40" />
      </section>
    );
  }

  return (
    <section className="card p-5 space-y-4 animate-rise-in" aria-label="Radar des matchs">
      {header}

      <RadarScope
        blips={blips}
        scaleKm={scaleKm}
        unknownCount={unknownCount}
        onSelect={focusCard}
        selectedId={selectedId}
      />

      {/* D'où l'on balaie : le coach doit pouvoir le corriger d'un tap */}
      <Link
        href="/coach/profile"
        className="flex items-center gap-2.5 min-h-12 rounded-lg bg-paper px-4 transition active:bg-blue-soft hover:bg-blue-faint"
      >
        <Crosshair size={15} className="text-blue shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-xs">
          {origin ? (
            <>
              Centré sur <span className="font-bold">{origin.label}</span>
              {origin.source === "team" && <span className="text-ink-soft"> · ville de votre équipe</span>}
            </>
          ) : (
            <span className="font-bold text-coral">Aucune position — le radar reste vide</span>
          )}
        </span>
        <span className="text-[11px] font-bold text-blue shrink-0">Modifier</span>
      </Link>

      {/* Périmètre balayé */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Périmètre autour de moi</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Périmètre du radar">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => changeRadius(option.value)}
              aria-pressed={radiusKm === option.value}
              className={cn(
                // px resserré : quatre pastilles doivent tenir sur une rangée
                "chip-choice !px-2",
                radiusKm === option.value ? "chip-choice-on" : "chip-choice-off",
              )}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
        {outOfRange.length > 0 && (
          <p className="text-[11px] text-ink-soft">
            {outOfRange.length} annonce{outOfRange.length > 1 ? "s" : ""} au-delà de {radiusKm} km, hors du
            périmètre.{" "}
            <button
              type="button"
              onClick={() => changeRadius(null)}
              className="font-bold text-blue hover:underline"
            >
              Balayer sans limite
            </button>
          </p>
        )}
      </div>

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
      ) : inRange.length === 0 ? (
        <div className="rounded-lg bg-paper px-4 py-8 text-center space-y-3">
          <p className="text-sm font-bold">
            {outOfRange.length > 0
              ? `Aucune équipe dans un rayon de ${radiusKm} km`
              : "Aucune annonce ne correspond aux filtres"}
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setCategory(null);
              setDate("");
              changeRadius(null);
            }}
          >
            Élargir la recherche
          </Button>
        </div>
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-2 items-start">
          {inRange.map((a) => (
            <div
              key={a.id}
              ref={(node) => {
                if (node) cardRefs.current.set(a.id, node);
                else cardRefs.current.delete(a.id);
              }}
              className={cn(
                "rounded-lg border p-4 space-y-3 transition",
                selectedId === a.id ? "border-blue ring-2 ring-blue/15" : "border-line",
              )}
            >
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
