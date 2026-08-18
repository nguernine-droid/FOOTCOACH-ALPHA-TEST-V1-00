"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, MapPin, Plus, Send, Trash2, Users } from "lucide-react";
import {
  AVAILABILITY_RADIUS_OPTIONS,
  AVAILABILITY_VENUES,
  AVAILABILITY_VENUE_LABELS,
  categoryLabel,
  DIVISION_LEVELS,
  DIVISION_LEVEL_LABELS,
  divisionLevelsFor,
  type AvailabilityDto,
  type AvailabilityVenue,
  type DivisionLevel,
  type SuggestionDto,
} from "@teamnexus/shared";
import { api, ApiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { Avatar } from "@/components/Avatar";
import { TeamLogo } from "@/components/TeamLogo";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { WeekendPicker } from "@/components/availabilities/WeekendPicker";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Disponibilités déclarées et appariements proposés.
 *
 * L'inverse de l'annonce, et c'est tout le propos : au lieu de publier puis
 * d'attendre qu'un confrère passe voir, le coach déclare une fois les jours où
 * son équipe est libre, et l'application lui présente les équipes qui le sont
 * aussi. Il ne subit plus la latence de deux coachs présents au même moment.
 *
 * Les suggestions ne sont pas des matchs : « prévenir » publie une annonce
 * ordinaire pour cette date et alerte nommément l'équipe suggérée. Tout ce qui
 * suit emprunte le chemin déjà connu — proposition, fil de discussion,
 * acceptation, feuille de match.
 */
export default function AvailabilitiesPage() {
  const { activeTeam } = useActiveTeam();
  const [availabilities, setAvailabilities] = useState<AvailabilityDto[] | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declaring, setDeclaring] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, matches] = await Promise.all([
        api<AvailabilityDto[]>("/availabilities/mine"),
        api<SuggestionDto[]>("/availabilities/suggestions"),
      ]);
      setAvailabilities(mine);
      setSuggestions(matches);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    try {
      await api(`/availabilities/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  // Sans catégorie, le serveur ne peut apparier personne : le dire ici évite un
  // écran vide qu'on prendrait pour « il n'y a personne ».
  const categoryMissing = activeTeam !== null && activeTeam.category === null;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <CalendarCheck size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Nos disponibilités</h2>
          <p className="text-xs text-white/80">
            Dites une fois quand vous êtes libres. Les équipes libres en face vous sont proposées.
          </p>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {categoryMissing && (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-bold">Réglez la catégorie de votre équipe</p>
          <p className="text-xs text-ink-soft">
            C&apos;est elle qui définit votre tableau d&apos;âges. Sans elle, aucun appariement n&apos;est calculable.
          </p>
          <ButtonLink href="/coach/team" variant="soft" size="sm">
            Aller à mon équipe
          </ButtonLink>
        </div>
      )}

      <Button size="lg" className="w-full" onClick={() => setDeclaring(true)}>
        <Plus size={16} /> Déclarer des dates libres
      </Button>

      {!availabilities ? (
        <CardGridSkeleton cards={2} />
      ) : availabilities.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <CalendarCheck size={22} />
          </span>
          <p className="text-sm font-bold">Aucune date déclarée</p>
          <p className="text-xs text-ink-soft">
            Un dimanche sans match ne se voit nulle part tant que vous ne l&apos;avez pas dit. Déclarez-le, et les
            équipes libres du secteur vous seront proposées sans que vous ayez à chercher.
          </p>
        </div>
      ) : (
        <section className="space-y-2" aria-label="Mes dates déclarées">
          {availabilities.map((a) => (
            <article key={a.id} className="card p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-bold text-sm capitalize">{formatDate(a.date)}</p>
                <p className="text-xs text-ink-soft">
                  {AVAILABILITY_VENUE_LABELS[a.venue]}
                  {a.time ? ` · ${a.time}` : ""}
                  {a.radiusKm ? ` · ${a.radiusKm} km` : ""}
                  {a.acceptedLevels.length > 0 && ` · ${a.acceptedLevels.join(", ")}`}
                </p>
              </div>
              <span
                className={cn(
                  "chip shrink-0",
                  a.suggestionCount > 0 ? "bg-success-soft text-success" : "bg-paper text-ink-soft",
                )}
              >
                <Users size={11} aria-hidden />
                {a.suggestionCount > 0 ? `${a.suggestionCount} équipe${a.suggestionCount > 1 ? "s" : ""}` : "aucune"}
              </span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="icon-btn text-ink-soft hover:bg-coral-soft hover:text-coral shrink-0"
                aria-label={`Retirer la disponibilité du ${formatDate(a.date)}`}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </section>
      )}

      {suggestions !== null && suggestions.length > 0 && (
        <section className="space-y-2" aria-label="Équipes proposées">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint px-1">
            Équipes libres en face
          </h3>
          {suggestions.map((s) => (
            <SuggestionCard key={`${s.availabilityId}-${s.team.id}`} suggestion={s} onDone={load} />
          ))}
        </section>
      )}

      {declaring && (
        <DeclareSheet
          existing={(availabilities ?? []).map((a) => a.date)}
          category={activeTeam?.category ?? null}
          onClose={() => setDeclaring(false)}
          onSaved={async () => {
            setDeclaring(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

/** Une équipe proposée, et le geste unique qui va avec : la prévenir. */
function SuggestionCard({ suggestion: s, onDone }: { suggestion: SuggestionDto; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function propose() {
    setBusy(true);
    setError(null);
    try {
      await api("/availabilities/propose", {
        method: "POST",
        body: JSON.stringify({ availabilityId: s.availabilityId, teamId: s.team.id }),
      });
      setSent(true);
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <TeamLogo name={s.team.name} logoUrl={s.team.logoUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{s.team.name}</p>
          <p className="text-xs text-ink-soft truncate flex items-center gap-1.5">
            <MapPin size={11} className="shrink-0" aria-hidden /> {s.team.city}
            {s.distanceKm !== null && ` · ${Math.round(s.distanceKm)} km`}
          </p>
        </div>
        {s.coach && <Avatar name={s.coach.nickname} avatarUrl={s.coach.avatarUrl} size={32} />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="chip bg-pitch-soft text-primary capitalize">{formatDate(s.date)}</span>
        <span className="chip bg-paper text-ink-soft">{s.time}</span>
        <span className="chip bg-paper text-ink-soft">{categoryLabel(s.category)}</span>
        {s.level && <span className="chip bg-paper text-ink-soft">{DIVISION_LEVEL_LABELS[s.level]}</span>}
        <span className="chip bg-paper text-ink-soft">
          {s.host === "mine" ? "Chez nous" : s.host === "theirs" ? "Chez eux" : "Lieu à convenir"}
        </span>
        <ReliabilityBadge reliability={s.reliability} />
      </div>

      {error && <p className="text-xs font-semibold text-coral">{error}</p>}

      {sent ? (
        <p className="text-xs font-bold text-success flex items-center gap-1.5">
          <Check size={13} aria-hidden /> Prévenue — la balle est dans leur camp
        </p>
      ) : (
        <div className="space-y-1.5">
          <Button variant="soft" size="sm" className="w-full" onClick={propose} disabled={busy}>
            <Send size={14} /> {busy ? "Envoi…" : "Prévenir cette équipe"}
          </Button>
          <p className="text-[11px] text-ink-faint">
            {s.announcementId
              ? "Votre annonce de ce jour-là leur sera signalée."
              : "Publie votre annonce pour cette date et la leur signale."}
          </p>
        </div>
      )}
    </article>
  );
}

/** Le formulaire de déclaration : des dates, et les conditions qui vont avec. */
function DeclareSheet({
  existing,
  category,
  onClose,
  onSaved,
}: {
  existing: string[];
  category: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [dates, setDates] = useState<string[]>([]);
  const [venue, setVenue] = useState<AvailabilityVenue>("any");
  const [time, setTime] = useState<string>("");
  const [levels, setLevels] = useState<DivisionLevel[]>([]);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Les niveaux proposés dépendent de la catégorie, comme partout ailleurs :
  // en dessous des U10, les districts ne classent pas.
  const available = divisionLevelsFor(category) ?? DIVISION_LEVELS;

  async function save() {
    if (dates.length === 0) {
      setError("Choisissez au moins une date");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/availabilities", {
        method: "POST",
        body: JSON.stringify({
          dates,
          venue,
          time: time || null,
          acceptedLevels: levels,
          radiusKm,
        }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      onClose={onClose}
      label="Déclarer des dates libres"
      footer={
        <Button size="lg" className="w-full" onClick={save} disabled={busy || dates.length === 0}>
          {busy ? "Enregistrement…" : `Déclarer ${dates.length || ""} date${dates.length > 1 ? "s" : ""}`}
        </Button>
      }
    >
      <div className="space-y-5">
        <WeekendPicker selected={dates} onChange={setDates} existing={existing} />

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Nous jouons</span>
          <div className="grid grid-cols-3 gap-2">
            {AVAILABILITY_VENUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVenue(v)}
                aria-pressed={venue === v}
                className={cn(
                  "min-h-11 rounded-lg text-xs font-bold transition px-2",
                  venue === v ? "bg-blue text-white" : "bg-paper text-ink-soft hover:bg-blue-faint",
                )}
              >
                {AVAILABILITY_VENUE_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="availability-time" className="text-xs font-bold text-ink-soft">
            Heure souhaitée <span className="font-semibold text-ink-faint">(facultatif)</span>
          </label>
          <input
            id="availability-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="field"
          />
        </div>

        {available.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-ink-soft">
              Niveaux acceptés <span className="font-semibold text-ink-faint">(aucun coché = tous)</span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {available.map((l) => {
                const on = levels.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevels(on ? levels.filter((x) => x !== l) : [...levels, l])}
                    aria-pressed={on}
                    className={cn(
                      "min-h-11 rounded-lg text-xs font-bold transition",
                      on ? "bg-blue text-white" : "bg-paper text-ink-soft hover:bg-blue-faint",
                    )}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">
            Distance maximale <span className="font-semibold text-ink-faint">(par défaut : votre radar)</span>
          </span>
          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => setRadiusKm(null)}
              aria-pressed={radiusKm === null}
              className={cn(
                "min-h-11 rounded-lg text-xs font-bold transition",
                radiusKm === null ? "bg-blue text-white" : "bg-paper text-ink-soft hover:bg-blue-faint",
              )}
            >
              Radar
            </button>
            {AVAILABILITY_RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRadiusKm(km)}
                aria-pressed={radiusKm === km}
                className={cn(
                  "min-h-11 rounded-lg text-xs font-bold transition tabular-nums",
                  radiusKm === km ? "bg-blue text-white" : "bg-paper text-ink-soft hover:bg-blue-faint",
                )}
              >
                {km}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

        <p className="text-[11px] text-ink-faint">
          Déclarer ne publie rien. Vous restez invisible au radar tant que vous n&apos;avez pas prévenu une équipe
          depuis les suggestions.{" "}
          <Link href="/coach/announcements" className="underline">
            Publier une annonce
          </Link>{" "}
          reste possible à côté.
        </p>
      </div>
    </BottomSheet>
  );
}
