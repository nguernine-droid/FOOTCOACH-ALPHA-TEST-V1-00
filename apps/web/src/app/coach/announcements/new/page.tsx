"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, SlidersHorizontal, Users } from "lucide-react";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_TIME_SLOTS,
  DIVISION_LEVEL_LABELS,
  MATCH_GENDER_LABELS,
  PLATEAU_TEAMS_WANTED,
  announcementCategoryLabel,
  announcementCategoryOf,
  categoryLabel,
  divisionLevelsFor,
  isPlateauCategory,
  type AnnouncementCategory,
  type AnnouncementDefaultsDto,
  type AnnouncementSuggestionsDto,
  type CoachTeamDto,
  type DivisionLevel,
  type MatchCategory,
  type MatchGender,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { PreciseCategoryPicker } from "@/components/PreciseCategoryPicker";
import { DivisionLevelPicker } from "@/components/DivisionLevelPicker";
import { VenueField } from "@/components/VenueField";
import { SuggestedOpponents } from "@/components/announcements/SuggestedOpponents";
import { GenderPicker } from "@/components/GenderPicker";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Cible du bouton « ✓ » de la barre d'onglets (association HTML par `form`) */
const FORM_ID = "publier-annonce";

/**
 * « catégorie, stade et ville ». Énumération placée APRÈS le verbe dans la
 * phrase (« Repris de X : … ») : l'accord du participe dépendrait sinon du
 * genre des mots listés, qui varie avec ce que l'équipe a renseigné.
 */
function enumerate(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}` : items[0];
}

const FORMATS = ["5v5", "8v8", "11v11"] as const;

/**
 * Au-delà, on publie sans attendre les correspondances.
 *
 * Le raccourci s'intercale entre un clic et un enregistrement : un coach qui
 * patiente trois secondes après avoir appuyé sur « Publier » croit que
 * l'application a planté, pas qu'elle cherche à l'aider. Passé ce délai, la
 * recherche est abandonnée et la publication se fait comme avant — perdre une
 * mise en relation coûte moins cher que rendre la publication poussive.
 */
const SUGGESTIONS_TIMEOUT_MS = 2_500;

/**
 * Publier une annonce. La page attend de savoir ce que la DERNIÈRE annonce du
 * coach lègue à celle-ci avant de dessiner le formulaire : appliquer un
 * héritage arrivé en retard réécrirait des champs sous les doigts, et un
 * formulaire qui change tout seul est pire qu'un formulaire lent.
 *
 * L'héritage est servi par le serveur (`/announcements/last`) plutôt que retenu
 * par le navigateur : un coach qui publie depuis le téléphone du club puis
 * depuis le sien doit retrouver ses habitudes.
 */
export default function NewAnnouncementPage() {
  const { activeTeam } = useActiveTeam();
  const [loaded, setLoaded] = useState<{ defaults: AnnouncementDefaultsDto | null } | null>(null);

  useEffect(() => {
    api<AnnouncementDefaultsDto | null>("/announcements/last")
      .then((defaults) => setLoaded({ defaults }))
      // Un héritage illisible ne doit pas empêcher de publier : on retombe sur
      // le formulaire complet, celui de la toute première annonce.
      .catch(() => setLoaded({ defaults: null }));
  }, []);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }
  return <NewAnnouncementForm defaults={loaded.defaults} activeTeam={activeTeam} />;
}

function NewAnnouncementForm({
  defaults,
  activeTeam,
}: {
  defaults: AnnouncementDefaultsDto | null;
  activeTeam: CoachTeamDto | null;
}) {
  const router = useRouter();
  /**
   * Deux sources de préremplissage, dans cet ordre : la dernière annonce du
   * coach, puis les références de son équipe. La première dit ce qu'il publie
   * réellement, la seconde ce qu'il a déclaré une fois. Aucune n'est une
   * contrainte — le formulaire reste entier.
   *
   * Lues une seule fois, à l'initialisation de l'état : changer d'équipe
   * remonte toute la page (RoleGuard la re-monte par sa clé), donc un
   * formulaire à moitié rempli ne se fait jamais réécrire sous les doigts.
   */
  const [form, setForm] = useState({
    date: "",
    time: "",
    city: defaults?.city ?? activeTeam?.city ?? "",
    stadium: defaults?.stadium ?? activeTeam?.stadium ?? "",
    // La catégorie FINE de l'équipe (U13) est reprise dans son groupe d'âges
    // (U12-U13) : les rencontres s'apparient par paires, comme au district.
    // Équipes créées avant les références : rien à reprendre, on retombe sur le
    // groupe le plus courant plutôt que sur un formulaire bloqué.
    category: (defaults?.category ??
      announcementCategoryOf(activeTeam?.category) ??
      "U12-U13") as AnnouncementCategory,
    format: (defaults?.format ?? "8v8") as (typeof FORMATS)[number],
    comment: "",
  });
  /**
   * Le genre vient de la dernière annonce, sinon de l'équipe. Le reprendre de
   * l'équipe n'est plus une supposition depuis qu'elle le déclare : c'est
   * exactement la donnée qu'on cherchait. `null` ne subsiste que pour les
   * équipes d'avant, et il ouvre alors le panneau (voir plus bas).
   */
  /**
   * Terrain retenu — celui de la dernière annonce, sinon celui de l'équipe.
   * Il n'est pas dans `form` : le formulaire porte ce que le coach écrit, et
   * ceci est ce qu'il a choisi.
   */
  const [venueId, setVenueId] = useState<string | null>(defaults?.venueId ?? activeTeam?.venueId ?? null);
  /**
   * Âge précisé dans le groupe (U14 sur une annonce U14-U15). `null` par
   * défaut, et c'est bien ainsi : la paire d'âges est ce qui remplit le radar,
   * la précision n'est là que pour celui qui ne peut pas jouer l'autre année.
   */
  const [preciseCategory, setPreciseCategory] = useState<MatchCategory | null>(
    defaults?.preciseCategory ?? null,
  );
  const [gender, setGender] = useState<MatchGender | null>(defaults?.gender ?? activeTeam?.gender ?? null);
  // Niveau souhaité de l'adversaire — dépend de la catégorie, donc à part du
  // reste du formulaire plutôt que dans `form` (même raison que `gender`).
  const [level, setLevel] = useState<DivisionLevel | null>(defaults?.level ?? null);
  /**
   * Ce qui ne change presque jamais d'une annonce à l'autre — catégorie, genre,
   * niveau, format — se replie derrière un résumé dès la deuxième publication.
   * Ce qui change à chaque fois — la date, le créneau, le lieu, les
   * informations — reste sous les yeux.
   *
   * Deux cas forcent l'ouverture : la première annonce (rien à résumer) et
   * l'absence de genre (le formulaire ne serait pas publiable, avec le seul
   * contrôle qui manque caché derrière un bouton).
   */
  const [showAll, setShowAll] = useState(defaults === null || (defaults.gender ?? activeTeam?.gender) == null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /**
   * ————— L'étape intercalée entre « Valider » et l'enregistrement —————
   * Non nul = l'écran des correspondances a pris la place du formulaire. Il ne
   * s'affiche que s'il a trouvé quelque chose : sans correspondance, la
   * publication suit son cours sans qu'aucun écran ne s'interpose.
   */
  const [suggestions, setSuggestions] = useState<AnnouncementSuggestionsDto | null>(null);
  /** Ce qui est en cours sur cet écran : l'id d'une annonce, "publish", ou rien */
  const [busy, setBusy] = useState<string | null>(null);
  /**
   * L'annonce une fois partie en base. Une référence et non un état : elle sert
   * de GARDE — publier deux fois la même annonce parce qu'une proposition a
   * échoué et que le coach a réessayé laisserait un doublon sur le radar, que
   * personne ne saurait ensuite lequel retirer.
   */
  const publishedId = useRef<string | null>(null);

  // Ce qui a RÉELLEMENT été repris de l'équipe — annoncer un stade qu'elle n'a
  // pas ferait douter du reste du formulaire. La ville en fait toujours partie
  // dès qu'une équipe est active : c'est le seul qui ne manque jamais.
  const fromTeam = [
    activeTeam?.category ? "catégorie" : null,
    activeTeam?.gender ? "genre" : null,
    activeTeam?.stadium ? "stade" : null,
    activeTeam ? "ville" : null,
  ].filter((v): v is string => v !== null);
  const inheritance = defaults
    ? "Reprises de votre dernière annonce — modifiables si celle-ci fait exception."
    : activeTeam && fromTeam.length > 1
      ? `Repris de ${activeTeam.name} : ${enumerate(fromTeam)} — modifiables si ce match fait exception.`
      : undefined;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Le niveau ne survit pas à un changement de catégorie qui ne le propose
  // plus : rester sur un D2 affiché sous une catégorie U8-U9 mentirait.
  function changeCategory(category: AnnouncementCategory) {
    set("category", category);
    if (!(divisionLevelsFor(category) as readonly string[]).includes(level ?? "")) setLevel(null);
    // L'âge précisé appartenait à l'ancien groupe : le garder ferait annoncer
    // un U14 sous une catégorie U16-U17.
    setPreciseCategory(null);
  }

  // Jusqu'aux U11 l'annonce cherche un plateau de quatre équipes, pas un
  // adversaire : le formulaire doit le dire avant la publication, pas après.
  const plateau = isPlateauCategory(form.category);

  // Genre et créneau n'ont pas de valeur par défaut garantie : le formulaire
  // n'est publiable qu'une fois les deux tenus. Les autres champs sont soit
  // préremplis, soit `required` et pris en charge par le navigateur.
  const incomplete = !gender || !form.time;

  // Le « + » de la barre d'onglets devient un « ✓ » qui publie cette annonce.
  // Éteint pendant l'écran des correspondances : le formulaire y est démonté,
  // et un bouton qui ne fait rien vaut moins qu'un bouton grisé.
  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Publier l'annonce",
    disabled: loading || incomplete || suggestions !== null,
  });

  /** Ce qui part au serveur — identique pour la recherche et pour la publication */
  function payload() {
    return {
      ...form,
      gender,
      level,
      preciseCategory,
      venueId,
      comment: form.comment || undefined,
    };
  }

  /**
   * Publie l'annonce, une fois et une seule.
   *
   * Idempotente par construction : les deux chemins de l'écran des
   * correspondances y mènent (« publier » et « proposer de jouer », qui publie
   * aussi en filet), et un coach qui réessaie après un échec ne doit pas se
   * retrouver avec deux annonces identiques sur le radar.
   */
  async function publishOnce(): Promise<void> {
    if (publishedId.current) return;
    const created = await api<{ id: string }>("/announcements", {
      method: "POST",
      body: JSON.stringify(payload()),
    });
    publishedId.current = created.id;
  }

  /**
   * Valider ne publie plus directement : on regarde d'abord si le match cherché
   * n'est pas DÉJÀ publié par une autre équipe.
   *
   * La recherche est au mieux — jamais bloquante. Si elle échoue, si elle
   * dépasse son délai, ou si elle ne trouve rien, la publication se fait
   * exactement comme avant. C'est la règle qui prime sur toutes les autres :
   * un raccourci ne doit jamais empêcher le geste qu'il prétend raccourcir.
   */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Une course plutôt qu'un `AbortSignal.timeout` : celui-ci manque sur les
      // Safari d'avant iOS 16, et une méthode absente lèverait ici même — ce
      // qui empêcherait de publier au lieu de simplement chercher moins bien.
      // La requête abandonnée continue côté réseau, sans conséquence : elle ne
      // modifie rien.
      const found = await Promise.race([
        api<AnnouncementSuggestionsDto>("/announcements/suggestions", {
          method: "POST",
          body: JSON.stringify(payload()),
        }).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SUGGESTIONS_TIMEOUT_MS)),
      ]);
      if (found && found.items.length > 0) {
        setSuggestions(found);
        setLoading(false);
        return;
      }
      await publishOnce();
      router.push("/coach/announcements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
  }

  /**
   * Retenir une correspondance : on publie SON annonce, puis on propose de
   * jouer sur celle d'en face.
   *
   * Dans cet ordre, et les deux : le match n'est convenu qu'une fois que les
   * deux coachs ont validé dans le fil (voir la double validation des
   * propositions). Une proposition déclinée laisserait sinon le coach sans rien
   * en ligne, à tout ressaisir — l'annonce publiée est son filet.
   */
  async function acceptSuggestion(announcementId: string) {
    setBusy(announcementId);
    setError(null);
    try {
      await publishOnce();
      const { conversationId } = await api<{ responseId: string; conversationId: string | null }>(
        `/announcements/${announcementId}/respond`,
        { method: "POST" },
      );
      // Le fil est l'endroit où le match se décide : y déposer le coach vaut
      // mieux que de le renvoyer à une liste d'annonces.
      router.push(conversationId ? `/coach/messages/${conversationId}` : "/coach/announcements");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de proposer ce match";
      // Dire exactement où l'on en est. Une annonce publiée dont la proposition
      // a échoué n'est pas un échec complet, et laisser croire le contraire
      // ferait republier par-dessus.
      setError(
        publishedId.current
          ? `Votre annonce est bien publiée, mais la proposition n'est pas partie : ${message}`
          : message,
      );
      setBusy(null);
    }
  }

  /** Publier sans retenir aucune correspondance — le geste que le coach venait faire */
  async function publishOnly() {
    setBusy("publish");
    setError(null);
    try {
      await publishOnce();
      router.push("/coach/announcements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setBusy(null);
    }
  }

  if (suggestions) {
    return (
      <SuggestedOpponents
        items={suggestions.items}
        totalFound={suggestions.totalFound}
        busy={busy}
        error={error}
        onAccept={acceptSuggestion}
        onPublish={publishOnly}
        // Revenir au formulaire n'a plus de sens une fois l'annonce en base :
        // ce qu'on y modifierait ne serait jamais republié.
        onBack={
          publishedId.current
            ? undefined
            : () => {
                setSuggestions(null);
                setError(null);
              }
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Megaphone size={22} />
        </span>
        <div>
          <h2 className="display text-lg">{plateau ? "Proposer un plateau" : "Proposer un match amical"}</h2>
          <p className="text-xs text-white/85">Votre annonce sera visible par tous les coachs sur le radar.</p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <label htmlFor="date" className="text-xs font-bold text-ink-soft">Date</label>
          <DateField id="date" required min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(v) => set("date", v)} />
        </div>

        {/* Créneaux plutôt que sélecteur d'heure : sept choix se prennent d'un
            geste, là où le sélecteur demandait d'ouvrir une feuille, viser une
            heure puis des minutes pour retomber sur l'un de ces mêmes horaires. */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Créneau</span>
          <div className="grid grid-cols-4 gap-2">
            {ANNOUNCEMENT_TIME_SLOTS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={form.time === t}
                onClick={() => set("time", t)}
                className={cn("chip-choice tabular-nums", form.time === t ? "chip-choice-on" : "chip-choice-off")}
              >
                {Number(t.slice(0, 2))} h
              </button>
            ))}
          </div>
          {!form.time && <p className="text-[11px] text-ink-soft">L&apos;heure du coup d&apos;envoi.</p>}
        </div>

        {/* Le mot « plateau » doit apparaître AVANT la publication, panneau
            replié ou non : un coach U10 qui croit chercher un adversaire
            découvrirait sinon trois équipes acceptées sur son annonce. */}
        {plateau && (
          <div className="rounded-lg bg-blue-faint border border-line px-4 py-3 flex gap-2.5">
            <Users size={15} className="text-blue shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-ink-soft">
              Jusqu&apos;aux U11, on ne joue pas de match amical : un <span className="font-bold text-ink">plateau</span>{" "}
              réunit quatre équipes. Votre annonce restera ouverte jusqu&apos;à ce que{" "}
              <span className="font-bold text-ink">{PLATEAU_TEAMS_WANTED} équipes</span> l&apos;aient rejointe.
            </p>
          </div>
        )}

        {showAll ? (
          <>
            {/* Grilles plutôt que rangées repliées : chaque choix garde une
                cible pleine et régulière, même à 390 px de large. */}
            <CategoryPicker
              value={form.category}
              onChange={changeCategory}
              categories={ANNOUNCEMENT_CATEGORIES}
              idPrefix="announcement-category"
              hint={inheritance}
            />

            <PreciseCategoryPicker
              category={form.category}
              value={preciseCategory}
              onChange={setPreciseCategory}
              idPrefix="announcement-precise"
            />

            <GenderPicker
              value={gender}
              onChange={setGender}
              idPrefix="announcement-gender"
              hint={
                gender
                  ? undefined
                  : "À préciser : une équipe féminine ne se déplace pas pour affronter une équipe masculine."
              }
            />

            <DivisionLevelPicker
              category={form.category}
              value={level}
              onChange={setLevel}
              label="Niveau souhaité"
              idPrefix="announcement-level"
              hint="Optionnel — laissez vide pour accepter tous les niveaux."
            />

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-ink-soft">Format</span>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={form.format === f}
                    onClick={() => set("format", f)}
                    className={cn("chip-choice", form.format === f ? "chip-choice-on" : "chip-choice-off")}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Le résumé n'est pas un pense-bête décoratif : c'est la garantie
             qu'on publie en connaissance de cause. Il porte les quatre valeurs
             en toutes lettres, et le bouton les rouvre toutes d'un geste. */
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full flex items-center gap-3 rounded-lg bg-paper px-4 py-3 text-left
              transition hover:bg-blue-faint active:bg-blue-soft"
          >
            <SlidersHorizontal size={15} className="text-blue shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold truncate">
                {announcementCategoryLabel({ category: form.category, preciseCategory })}
                {gender && ` · ${MATCH_GENDER_LABELS[gender]}`}
                {level && ` · ${DIVISION_LEVEL_LABELS[level]}`} · {form.format}
              </span>
              <span className="block text-[11px] text-ink-soft">Reprises de votre dernière annonce.</span>
            </span>
            <span className="text-[11px] font-bold text-blue shrink-0">Modifier</span>
          </button>
        )}

        {/* Le terrain d'abord, la ville ensuite : retenir un terrain remplit la
            ville tout seul, et l'ordre inverse ferait ressaisir ce qu'on vient
            d'obtenir. */}
        <VenueField
          id="stadium"
          label="Stade"
          required
          value={form.stadium}
          onChange={(value) => set("stadium", value)}
          onPick={(venue) => {
            setVenueId(venue?.id ?? null);
            // La commune du terrain fait foi : c'est elle que le serveur
            // retiendra de toute façon.
            if (venue) set("city", venue.city);
          }}
          hint="Le retenir dans la liste situe le match au terrain près — les coachs du secteur voient alors la vraie distance."
        />
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-xs font-bold text-ink-soft">Ville</label>
          <input id="city" required autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" value={form.city} onChange={(e) => set("city", e.target.value)} className="field" placeholder="Lyon" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="comment" className="text-xs font-bold text-ink-soft">Informations pratiques (optionnel)</label>
          <textarea id="comment" value={form.comment} onChange={(e) => set("comment", e.target.value)} className="field resize-none" rows={3} placeholder="Terrain synthétique, vestiaires dispo, ambiance conviviale…" />
        </div>

        {/* Ni attestation à cocher, ni rappel du délai FFF : la responsabilité de
            déclarer le match à la fédération, et le délai qui va avec, sont
            acceptés une fois pour toutes à l'inscription (voir LegalConsent).
            Les répéter à chaque annonce n'ajoutait rien. */}

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || incomplete}>
          {loading ? "Publication…" : "Publier l'annonce"}
        </Button>
      </form>
    </div>
  );
}
