"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Users } from "lucide-react";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_TIME_SLOTS,
  MATCH_GENDERS,
  MATCH_GENDER_LABELS,
  PLATEAU_TEAMS_WANTED,
  announcementCategoryOf,
  isPlateauCategory,
  type AnnouncementCategory,
  type MatchGender,
} from "@footcoach/shared";
import { api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
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

const LEVELS = [
  { value: "loisir", label: "Loisir" },
  { value: "competition", label: "Compétition" },
] as const;
const FORMATS = ["5v5", "8v8", "11v11"] as const;

export default function NewAnnouncementPage() {
  const router = useRouter();
  /**
   * Références de l'équipe active : catégorie, stade habituel et ville. Elles
   * ne sont que des valeurs de départ — un déplacement se joue ailleurs, et un
   * amical peut se caler sur une autre catégorie. Le formulaire reste entier.
   *
   * Lues une seule fois, à l'initialisation de l'état : changer d'équipe
   * remonte toute la page (RoleGuard la re-monte par sa clé), donc un
   * formulaire à moitié rempli ne se fait jamais réécrire sous les doigts.
   */
  const { activeTeam } = useActiveTeam();
  const [form, setForm] = useState({
    date: "",
    time: "",
    city: activeTeam?.city ?? "",
    stadium: activeTeam?.stadium ?? "",
    // La catégorie FINE de l'équipe (U13) est reprise dans son groupe d'âges
    // (U12-U13) : les rencontres s'apparient par paires, comme au district.
    // Équipes créées avant les références : rien à reprendre, on retombe sur le
    // groupe le plus courant plutôt que sur un formulaire bloqué.
    category: (announcementCategoryOf(activeTeam?.category) ?? "U12-U13") as AnnouncementCategory,
    level: "loisir",
    format: "8v8",
    comment: "",
  });
  // Ce qui a RÉELLEMENT été repris — annoncer un stade que l'équipe n'a pas
  // ferait douter du reste du formulaire. La ville en fait toujours partie dès
  // qu'une équipe est active : c'est le seul des trois qui ne manque jamais.
  const fromTeam = [
    activeTeam?.category ? "catégorie" : null,
    activeTeam?.stadium ? "stade" : null,
    activeTeam ? "ville" : null,
  ].filter((v): v is string => v !== null);
  // Aucun genre présélectionné : le supposer reviendrait à publier une annonce
  // masculine par défaut pour une équipe qui ne l'est pas.
  const [gender, setGender] = useState<MatchGender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Jusqu'aux U11 l'annonce cherche un plateau de quatre équipes, pas un
  // adversaire : le formulaire doit le dire avant la publication, pas après.
  const plateau = isPlateauCategory(form.category);

  // Genre et créneau n'ont pas de valeur par défaut : le formulaire n'est
  // publiable qu'une fois les deux choisis. Les autres champs sont soit
  // préremplis, soit `required` et pris en charge par le navigateur.
  const incomplete = !gender || !form.time;

  // Le « + » de la barre d'onglets devient un « ✓ » qui publie cette annonce
  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Publier l'annonce",
    disabled: loading || incomplete,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api("/announcements", {
        method: "POST",
        body: JSON.stringify({ ...form, gender, comment: form.comment || undefined }),
      });
      router.push("/coach/announcements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
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

        {/* Grilles plutôt que rangées repliées : chaque choix garde une cible
            pleine et régulière, même à 390 px de large. */}
        <CategoryPicker
          value={form.category}
          onChange={(c) => set("category", c)}
          categories={ANNOUNCEMENT_CATEGORIES}
          idPrefix="announcement-category"
          hint={
            activeTeam && fromTeam.length > 1
              ? `Repris de ${activeTeam.name} : ${enumerate(fromTeam)} — modifiables si ce match fait exception.`
              : undefined
          }
        />

        {/* Le mot « plateau » doit apparaître AVANT la publication : un coach
            U10 qui croit chercher un adversaire découvrirait sinon trois
            équipes acceptées sur son annonce. */}
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

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Genre</span>
          <div className="grid grid-cols-3 gap-2">
            {MATCH_GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gender === g}
                onClick={() => setGender(g)}
                className={cn("chip-choice", gender === g ? "chip-choice-on" : "chip-choice-off")}
              >
                {MATCH_GENDER_LABELS[g]}
              </button>
            ))}
          </div>
          {!gender && (
            <p className="text-[11px] text-ink-soft">
              À préciser : une équipe féminine ne se déplace pas pour affronter une équipe masculine.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Niveau</span>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                aria-pressed={form.level === l.value}
                onClick={() => set("level", l.value)}
                className={cn("chip-choice", form.level === l.value ? "chip-choice-on" : "chip-choice-off")}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

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

        <div className="space-y-1.5">
          <label htmlFor="stadium" className="text-xs font-bold text-ink-soft">Stade</label>
          <input id="stadium" required autoComplete="off" autoCapitalize="words" enterKeyHint="next" value={form.stadium} onChange={(e) => set("stadium", e.target.value)} className="field" placeholder="Stade municipal" />
        </div>
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
