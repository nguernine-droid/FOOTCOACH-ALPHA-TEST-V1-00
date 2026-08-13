"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, ShieldCheck, Users } from "lucide-react";
import {
  categoryLabel,
  DIVISION_LEVEL_LABELS,
  divisionLevelsFor,
  MATCH_GENDER_LABELS,
  type CoachTeamDto,
  type DivisionLevel,
  type MatchCategory,
  type MatchGender,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { DivisionLevelPicker } from "@/components/DivisionLevelPicker";
import { GenderPicker } from "@/components/GenderPicker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";

/**
 * Mes équipes : les équipes encadrées, et celle au nom de laquelle on publie.
 * La V1 ne gère ni effectif ni club — l'application ne connaît que des coachs,
 * qui se rencontrent en match amical.
 *
 * Chaque équipe porte ses références (catégorie, stade habituel) : c'est d'ici
 * qu'on les règle, et c'est de là que partent les annonces préremplies.
 */
export default function CoachTeamPage() {
  const { teams, activeTeamId, setActiveTeam } = useActiveTeam();
  const [editing, setEditing] = useState<CoachTeamDto | null>(null);

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Users size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="display text-lg">Mes équipes</h2>
          <p className="text-xs text-white/80">
            {teams.length > 1
              ? "Choisissez l'équipe active : annonces, radar et matchs la suivent."
              : "L'équipe au nom de laquelle vous publiez vos annonces."}
          </p>
        </div>
      </div>

      <div className="stagger space-y-2">
        {teams.map((team) => {
          const active = team.id === activeTeamId;
          return (
            /* Deux actions distinctes sur une même ligne — rendre l'équipe
               active, et régler ses références — donc deux boutons côte à côte
               plutôt qu'une carte cliquable qui en contiendrait un second. */
            <div
              key={team.id}
              className={cn(
                "card flex items-stretch transition",
                active ? "border-blue ring-2 ring-blue/15" : "hover:border-blue/40",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveTeam(team.id)}
                aria-pressed={active}
                className="min-w-0 flex-1 px-4 py-3 flex items-center gap-3 text-left rounded-l-xl"
              >
                <span
                  className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
                    active ? "bg-blue text-white" : "bg-paper text-ink-soft",
                  )}
                >
                  <Users size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold truncate">{team.name}</span>
                    {team.category && (
                      <span className="chip bg-paper text-ink-soft shrink-0">{categoryLabel(team.category)}</span>
                    )}
                    {team.gender && (
                      <span className="chip bg-paper text-ink-soft shrink-0">
                        {MATCH_GENDER_LABELS[team.gender]}
                      </span>
                    )}
                    {team.level && (
                      <span className="chip bg-paper text-ink-soft shrink-0">
                        {DIVISION_LEVEL_LABELS[team.level]}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-soft truncate">
                    {team.stadium ? `${team.stadium} · ${team.city}` : team.city}
                  </span>
                  {/* Sans catégorie ni genre, l'annonce repart d'une valeur par
                      défaut et les coachs qui répondent ne sont comparés à rien :
                      autant le dire là où on peut y remédier. */}
                  {(!team.category || !team.gender) && (
                    <span className="block text-[11px] text-warning font-semibold">
                      {!team.category && !team.gender
                        ? "Catégorie et genre à renseigner"
                        : !team.category
                          ? "Catégorie à renseigner"
                          : "Genre à renseigner"}
                    </span>
                  )}
                </span>
                {team.role === "adjoint" && <span className="chip bg-paper text-ink-soft shrink-0">Adjoint</span>}
                {active && (
                  <span className="chip bg-blue-soft text-primary shrink-0">
                    <ShieldCheck size={11} /> Équipe active
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setEditing(team)}
                aria-label={`Modifier les références de ${team.name}`}
                className="shrink-0 w-12 flex items-center justify-center border-l border-line
                  text-ink-soft rounded-r-xl transition hover:text-blue active:bg-paper"
              >
                <Pencil size={16} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      {/* Le « + » de la barre mène ici aussi : tout le monde ne le trouve pas. */}
      <ButtonLink href="/coach/team/new" variant="soft" className="w-full">
        <Plus size={15} /> Créer une équipe
      </ButtonLink>

      {editing && <ReferencesSheet team={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/**
 * Réglage des références d'une équipe. En feuille basse plutôt qu'en page : on
 * y arrive depuis la liste, on y change deux champs, on revient — une
 * navigation complète ferait perdre la liste et sa position de défilement.
 */
function ReferencesSheet({ team, onClose }: { team: CoachTeamDto; onClose: () => void }) {
  const { reloadTeams } = useActiveTeam();
  const [category, setCategory] = useState<MatchCategory | null>(team.category);
  const [gender, setGender] = useState<MatchGender | null>(team.gender);
  const [stadium, setStadium] = useState(team.stadium ?? "");
  // Le niveau ne survit pas à un changement de catégorie qui ne le propose
  // plus : rester sur un D2 affiché sous une catégorie U8-U9 mentirait.
  const [level, setLevel] = useState<DivisionLevel | null>(team.level);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function changeCategory(c: MatchCategory) {
    setCategory(c);
    if (!(divisionLevelsFor(c) as readonly string[]).includes(level ?? "")) setLevel(null);
  }

  async function save() {
    if (saving || !category || !gender) return;
    setSaving(true);
    setError(null);
    try {
      await api<CoachTeamDto>(`/coach/teams/${team.id}`, {
        method: "PATCH",
        body: JSON.stringify({ category, gender, stadium: stadium.trim() || undefined, level }),
      });
      // La liste des équipes vit dans la session : sans ce rechargement, les
      // annonces continueraient d'être préremplies avec l'ancienne référence.
      await reloadTeams();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      label={`Références de ${team.name}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="soft" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" className="flex-1" onClick={save} disabled={saving || !category || !gender}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="font-black">{team.name}</h3>
          <p className="text-xs text-ink-soft flex items-center gap-1">
            <MapPin size={12} aria-hidden /> {team.city}
          </p>
        </div>

        <CategoryPicker
          value={category}
          onChange={changeCategory}
          idPrefix="references-category"
          hint="Proposée d'office à chaque annonce publiée au nom de cette équipe."
        />

        <DivisionLevelPicker
          category={category}
          value={level}
          onChange={setLevel}
          idPrefix="references-level"
          hint="Le niveau réel de l'équipe — affiché sur votre carte de coach."
        />

        <GenderPicker
          value={gender}
          onChange={setGender}
          idPrefix="references-gender"
          hint="Proposé d'office lui aussi, et comparé à celui des équipes qui vous répondent."
        />

        <div className="space-y-1.5">
          <label htmlFor="references-stadium" className="text-xs font-bold text-ink-soft">
            Stade habituel (optionnel)
          </label>
          <input
            id="references-stadium"
            maxLength={150}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            value={stadium}
            onChange={(e) => setStadium(e.target.value)}
            className="field"
            placeholder="Stade municipal"
          />
          <p className="text-[11px] text-ink-soft">Laissez vide si vous n&apos;en avez pas d&apos;attitré.</p>
        </div>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
      </div>
    </BottomSheet>
  );
}
