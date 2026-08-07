"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Crosshair,
  MapPin,
  Navigation,
  Radar,
  SlidersHorizontal,
  Trophy,
  UserMinus,
  X,
  XCircle,
} from "lucide-react";
import {
  categoryLabel,
  MATCH_CATEGORIES,
  MATCH_GENDERS,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
  type MatchGender,
  type RadarDto,
  type TournamentDto,
  type UserDto,
} from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { RADIUS_OPTIONS, RadarScope, toBlips } from "@/components/announcements/RadarScope";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";

const LEVEL_LABELS = { loisir: "Loisir", competition: "Compétition" } as const;
/** Périmètre par défaut : la distance qu'un club accepte de faire pour un amical */
const DEFAULT_RADIUS_KM = 50;

/**
 * Les annonces en SOS passent devant, quelle que soit la distance : un coach
 * dont l'adversaire s'est désisté joue souvent dans les jours qui viennent, et
 * c'est le seul créneau où quelques kilomètres de plus ne pèsent rien.
 * Ensuite : proximité (distances inconnues en dernier), puis date.
 */
function bySosThenProximity(a: AnnouncementDto, b: AnnouncementDto): number {
  if (a.isSos !== b.isSos) return a.isSos ? -1 : 1;
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
  /**
   * Tournois du même périmètre. Gardés dans leur propre état plutôt que fondus
   * dans la liste des annonces : les filtres de catégorie et de date visent une
   * recherche d'adversaire, et un tournoi qu'un filtre ferait disparaître sans
   * qu'on l'ait voulu serait une occasion perdue.
   */
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  /** Annonces écartées par le périmètre : comptées par le serveur, jamais téléchargées */
  const [beyondRadius, setBeyondRadius] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [gender, setGender] = useState<MatchGender | null>(null);
  const [date, setDate] = useState("");
  // Réglages repliés au départ : la carte et les annonces passent devant. Ils
  // restent dépliés une fois ouverts — on règle rarement un seul filtre.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // `null` = sans limite. Réglage conservé côté serveur : il sert aussi à
  // décider quelles annonces déclenchent une notification push.
  const stored = getStoredUser();
  const [radiusKm, setRadiusKm] = useState<number | null>(
    stored?.radarRadiusKm === undefined ? DEFAULT_RADIUS_KM : stored.radarRadiusKm,
  );
  const [origin, setOrigin] = useState(stored?.location ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Annonce dont la feuille de détail est ouverte, depuis un maillot de la carte */
  const [detailId, setDetailId] = useState<string | null>(null);
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

  // Le périmètre est appliqué par le serveur : le changer impose de rebalayer.
  function changeRadius(value: number | null) {
    setRadiusKm(value);
    setSelectedId(null);
    setAnnouncements(null);
    api<UserDto>("/me/radar-radius", { method: "PUT", body: JSON.stringify({ radiusKm: value }) })
      .then(updateStoredUser)
      .catch(() => undefined)
      .finally(load);
  }

  // Le serveur applique déjà le périmètre enregistré et écarte mes propres
  // annonces : ce qui arrive ici est exactement ce que le radar affiche.
  const load = useCallback(async () => {
    try {
      const radar = await api<RadarDto>("/announcements/radar");
      setAnnouncements(radar.items);
      setTournaments(radar.tournaments);
      setBeyondRadius(radar.beyondRadius);
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

  /** Se désister avant que le coach n'ait tranché : la proposition disparaît */
  async function withdrawResponse(id: string) {
    setResponding(id);
    setError(null);
    try {
      await api(`/announcements/${id}/respond`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer la proposition");
      load();
    } finally {
      setResponding(null);
    }
  }

  /** Un maillot de la carte ouvre le détail de son équipe */
  function openDetail(id: string) {
    setSelectedId(id);
    setDetailId(id);
  }

  /** Depuis le détail : rejoindre la fiche complète, dans la liste */
  function focusCard(id: string) {
    setSelectedId(id);
    setDetailId(null);
    // La feuille se referme en 180 ms : on laisse la page se rendre avant de
    // viser la fiche, sinon le défilement part depuis une page encore figée.
    setTimeout(() => cardRefs.current.get(id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 200);
  }

  const matchesFilters = useMemo(
    () =>
      (announcements ?? [])
        .filter((a) => (category ? a.category === category : true))
        // Le genre non renseigné (annonces d'avant le champ) ne disparaît pas
        // sur un filtre : on ne sait pas, ce n'est pas une exclusion.
        .filter((a) => (gender ? a.gender === gender || a.gender === null : true))
        .filter((a) => (date ? a.date === date : true)),
    [announcements, category, gender, date],
  );

  // Le périmètre est appliqué par le serveur (celles hors rayon ne descendent
  // même pas jusqu'ici) ; il ne masque jamais une annonce dont la ville est
  // inconnue : on ne peut pas affirmer qu'elle est hors rayon, seulement qu'on
  // ne sait pas. Restent les filtres de la page : catégorie et date.
  const inRange = useMemo(() => [...matchesFilters].sort(bySosThenProximity), [matchesFilters]);
  const unknownCount = inRange.filter((a) => a.distanceKm === null).length;

  // Sans limite, le cercle extérieur se cale sur l'annonce la plus lointaine
  const farthest = Math.max(0, ...inRange.map((a) => a.distanceKm ?? 0));
  const scaleKm = radiusKm ?? Math.max(10, Math.ceil(farthest / 10) * 10);
  const blips = useMemo(() => toBlips(inRange, scaleKm), [inRange, scaleKm]);

  // L'annonce dont la feuille est ouverte. Relue dans la liste courante plutôt
  // que copiée : un rechargement (réponse envoyée, retrait) la met à jour, et
  // une annonce qui disparaît referme la feuille au lieu de la figer.
  const detail = detailId ? (announcements ?? []).find((a) => a.id === detailId) ?? null : null;

  /**
   * Ce que les filtres repliés retirent de la liste. Le périmètre n'en fait pas
   * partie : il est appliqué par le serveur, il se règle une fois et il est
   * rappelé en toutes lettres — il n'y a rien à « effacer » là.
   */
  const activeFilters = [
    category ? categoryLabel(category) : null,
    gender ? MATCH_GENDER_LABELS[gender] : null,
    date ? formatDate(date) : null,
  ].filter((label): label is string => label !== null);

  function clearFilters() {
    setCategory(null);
    setGender(null);
    setDate("");
  }

  const header = (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-lg bg-accent-surface border border-defined text-accent flex items-center justify-center shrink-0">
        <Radar size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="display text-lg leading-none">Carte des matchs proches</h3>
        <p className="text-xs text-ink-soft">
          Explorez votre zone et découvrez les équipes qui s&apos;entraînent ou cherchent des adversaires.
        </p>
      </div>
    </div>
  );

  if (!announcements) {
    return (
      <section className="card p-5 space-y-4" aria-label="Carte des matchs proches" aria-busy>
        {header}
        <Skeleton className="w-full aspect-square rounded-card" />
        <Skeleton className="h-40" />
      </section>
    );
  }

  return (
    <section className="card p-5 space-y-4 animate-rise-in" aria-label="Carte des matchs proches">
      {header}

      <RadarScope
        blips={blips}
        scaleKm={scaleKm}
        unknownCount={unknownCount}
        onSelect={openDetail}
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

      {/* Réglages du radar, repliés derrière un bouton : le coach vient voir la
          carte et les annonces, pas quatre rangées de pastilles. Ce qui est
          actif est réécrit sous le bouton — un filtre qu'on ne voit plus est un
          filtre dont on oublie qu'il cache des annonces. */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="radar-filters"
            className={cn(
              "chip-choice flex-1 min-[960px]:flex-none justify-between gap-3",
              filtersOpen || activeFilters.length > 0 ? "chip-choice-on" : "chip-choice-off",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal size={15} aria-hidden />
              Filtrer
              {activeFilters.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/25 text-[11px] font-black">
                  {activeFilters.length}
                </span>
              )}
            </span>
            <ChevronDown
              size={15}
              aria-hidden
              className={cn("transition-transform", filtersOpen && "rotate-180")}
            />
          </button>
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
              Effacer
            </Button>
          )}
        </div>

        {/* Résumé de ce qui est appliqué, seulement une fois replié : panneau
            ouvert, les pastilles le disent déjà. Le périmètre ouvre la ligne —
            c'est lui qui décide de ce que le radar a le droit de montrer, y
            compris quand rien n'est filtré. */}
        {!filtersOpen && (
          <p className="text-[11px] text-ink-soft">
            {radiusKm === null ? "Sans limite de distance" : `${radiusKm} km autour de moi`}
            {activeFilters.map((label) => ` · ${label}`)}
          </p>
        )}

        {/* Toujours dans le DOM, masqué : `aria-controls` doit désigner quelque
            chose, et l'attribut `hidden` suffit à le sortir du parcours clavier. */}
        <div id="radar-filters" hidden={!filtersOpen} className="space-y-3 pt-1">
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
          </div>

          {announcements.length > 0 && (
            <div className="space-y-2">
              {/* Rangée de catégories qui défile horizontalement plutôt que de se
                  replier : dix-huit pastilles de 44 px ne tiennent sur aucun écran
                  de téléphone sans le manger entièrement. */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  aria-pressed={category === null}
                  className={cn("chip-choice shrink-0", category === null ? "chip-choice-on" : "chip-choice-off")}
                >
                  Toutes
                </button>
                {MATCH_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(category === c ? null : c)}
                    aria-pressed={category === c}
                    className={cn("chip-choice shrink-0", category === c ? "chip-choice-on" : "chip-choice-off")}
                  >
                    {categoryLabel(c)}
                  </button>
                ))}
              </div>

              {/* Genre : quatre choix seulement, donc une grille pleine largeur */}
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Filtrer par genre">
                <button
                  type="button"
                  onClick={() => setGender(null)}
                  aria-pressed={gender === null}
                  className={cn("chip-choice !px-2", gender === null ? "chip-choice-on" : "chip-choice-off")}
                >
                  <span className="truncate">Tous</span>
                </button>
                {MATCH_GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(gender === g ? null : g)}
                    aria-pressed={gender === g}
                    className={cn("chip-choice !px-2", gender === g ? "chip-choice-on" : "chip-choice-off")}
                  >
                    <span className="truncate">{MATCH_GENDER_LABELS[g]}</span>
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
        </div>

        {/* Hors du panneau : ce n'est pas un réglage mais une explication du
            résultat — « il y en a d'autres, plus loin ». La cacher derrière le
            bouton reviendrait à cacher la raison pour laquelle on l'ouvre. */}
        {beyondRadius > 0 && (
          <p className="text-[11px] text-ink-soft">
            {beyondRadius} annonce{beyondRadius > 1 ? "s" : ""} au-delà de {radiusKm} km, hors du périmètre.{" "}
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

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {/* Tournois du secteur, avant les annonces : ils se préparent plus à
          l'avance qu'un amical, et une place qui se libère part vite. Section
          à part et non fondue dans la grille — un tournoi ne se « propose »
          pas, il s'organise et on s'y inscrit. */}
      <section className="space-y-3" aria-label="Tournois du secteur">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
            <Trophy size={13} aria-hidden /> Tournois du secteur
          </h3>
          <ButtonLink href="/coach/tournaments/new" size="sm" variant="soft" className="shrink-0">
            Organiser
          </ButtonLink>
        </div>
        {tournaments.length === 0 ? (
          <p className="rounded-lg bg-paper px-4 py-4 text-xs text-ink-soft text-center">
            Aucun tournoi annoncé autour de vous. Vous pouvez être le premier à en organiser un.
          </p>
        ) : (
          <div className="stagger grid gap-4 lg:grid-cols-2 items-start">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </section>

      {/* Vraiment rien à jouer, périmètre compris : inviter à publier. S'il y a
          des annonces plus loin, c'est l'écran suivant — élargir, pas publier. */}
      {announcements.length === 0 && beyondRadius === 0 ? (
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
            {beyondRadius > 0
              ? `Aucune équipe dans un rayon de ${radiusKm} km`
              : "Aucune annonce ne correspond aux filtres"}
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              // Tous les filtres, genre compris : repliés, ils ne se voient plus
              // — un bouton qui promet d'élargir doit en lever la totalité.
              clearFilters();
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
                selectedId === a.id
                  ? "border-blue ring-2 ring-blue/15"
                  : a.isSos
                    ? "border-coral"
                    : "border-line",
              )}
            >
              {/* Un match qui existe déjà et qu'il faut sauver : l'annonce le dit
                  d'entrée, avec le motif — le coach juge s'il peut dépanner. */}
              {a.isSos && (
                <p className="-m-4 mb-0 rounded-t-lg bg-coral-soft px-4 py-2.5 text-xs font-bold text-coral flex items-start gap-2">
                  <UserMinus size={14} className="shrink-0 mt-px" aria-hidden />
                  <span>
                    SOS — l&apos;adversaire s&apos;est désisté
                    {a.sosReason && ` (${WITHDRAWAL_REASON_LABELS[a.sosReason].toLowerCase()})`}
                    {a.sosDetails && <span className="block font-semibold text-ink-soft">{a.sosDetails}</span>}
                  </span>
                </p>
              )}

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
                  <span className="chip bg-blue-soft text-primary shrink-0">
                    <Navigation size={11} /> à {a.distanceKm.toLocaleString("fr-FR")} km
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="chip bg-pitch-soft text-primary">{categoryLabel(a.category)}</span>
                {a.gender && (
                  <span className="chip bg-pitch-soft text-primary">{MATCH_GENDER_LABELS[a.gender]}</span>
                )}
                <span className="chip bg-pitch-soft text-primary">{a.format}</span>
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
                <div className="space-y-2">
                  <p className="text-xs font-bold text-sun bg-sun-soft rounded-lg px-4 py-3 flex items-center gap-2">
                    <Clock3 size={14} className="shrink-0" />
                    Proposition envoyée — en attente de validation du coach
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => withdrawResponse(a.id)}
                    disabled={responding === a.id}
                  >
                    {responding === a.id ? "Retrait…" : "Retirer ma proposition"}
                  </Button>
                </div>
              ) : a.myResponseStatus === "declined" ? (
                <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-4 py-3 flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  Proposition déclinée par le coach
                </p>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => respond(a.id)} disabled={responding === a.id}>
                    {responding === a.id ? "Envoi…" : "Proposer de jouer"}
                  </Button>
                  {/* Le détail porte la carte du coach : on hésite moins à
                      traverser le département quand on voit qui l'on va
                      rencontrer. */}
                  <ButtonLink href={`/coach/announcements/${a.id}`} variant="ghost" className="w-full">
                    Voir le détail et le coach
                  </ButtonLink>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Détail de l'équipe touchée sur la carte. La feuille ne double pas la
          fiche de la liste : elle en donne l'essentiel et propose les deux
          suites possibles — répondre tout de suite, ou aller voir la fiche. */}
      {detail && (
        <BottomSheet
          label={`Détail de l'annonce de ${detail.team.name}`}
          onClose={() => setDetailId(null)}
          footer={
            <div className="space-y-2">
              {detail.myResponseStatus === "pending" ? (
                <p className="text-xs font-bold text-sun bg-sun-soft rounded-lg px-4 py-3 flex items-center gap-2">
                  <Clock3 size={14} className="shrink-0" />
                  Proposition envoyée — en attente de validation du coach
                </p>
              ) : detail.myResponseStatus === "declined" ? (
                <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-4 py-3 flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  Proposition déclinée par le coach
                </p>
              ) : (
                <Button
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={() => respond(detail.id)}
                  disabled={responding === detail.id}
                >
                  {responding === detail.id ? "Envoi…" : "Proposer de jouer"}
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={() => focusCard(detail.id)}>
                Voir l&apos;annonce dans la liste
              </Button>
            </div>
          }
        >
          <div className="px-5 pb-4 space-y-4">
            {detail.isSos && (
              <p className="rounded-lg bg-coral-soft px-4 py-2.5 text-xs font-bold text-coral flex items-start gap-2">
                <UserMinus size={14} className="shrink-0 mt-px" aria-hidden />
                <span>
                  SOS — l&apos;adversaire s&apos;est désisté
                  {detail.sosReason && ` (${WITHDRAWAL_REASON_LABELS[detail.sosReason].toLowerCase()})`}
                </span>
              </p>
            )}

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-12 h-12 rounded-full text-white flex items-center justify-center text-sm font-black shrink-0",
                  teamColor(detail.team),
                )}
              >
                {teamInitials(detail.team.name)}
              </span>
              <div className="min-w-0">
                <p className="font-bold truncate">{detail.team.name}</p>
                <p className="text-xs text-ink-soft truncate">
                  {detail.team.city}
                  {detail.distanceKm !== null && ` · à ${detail.distanceKm.toLocaleString("fr-FR")} km`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="chip bg-pitch-soft text-primary">{categoryLabel(detail.category)}</span>
              {detail.gender && (
                <span className="chip bg-pitch-soft text-primary">{MATCH_GENDER_LABELS[detail.gender]}</span>
              )}
              <span className="chip bg-pitch-soft text-primary">{detail.format}</span>
              <span className="chip bg-paper text-ink-soft">{LEVEL_LABELS[detail.level]}</span>
            </div>

            <div className="space-y-1.5 text-xs text-ink-soft font-semibold">
              <p className="flex items-center gap-1.5 capitalize">
                <CalendarDays size={13} className="text-pitch shrink-0" /> {formatDate(detail.date)} à{" "}
                {detail.time}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin size={13} className="text-pitch shrink-0" /> {detail.stadium}, {detail.city}
              </p>
            </div>

            {detail.comment && (
              <div className="text-xs surface-2 rounded-lg px-4 py-3 space-y-0.5">
                <p className="font-bold text-ink-soft">Informations pratiques</p>
                <p className="text-ink-soft">{detail.comment}</p>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </section>
  );
}
