"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { CoachTeamDto, DeclaredClubDto, MatchCategory, MatchGender } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ClubNameField } from "@/components/ClubNameField";
import {
  ClubDeclarationFields,
  clubPayload,
  type ClubDeclaration,
} from "@/components/ClubDeclarationFields";
import { GenderPicker } from "@/components/GenderPicker";
import { Button } from "@/components/ui/Button";

/** Cible du bouton « ✓ » de la barre d'onglets (association HTML par `form`) */
const FORM_ID = "creer-equipe";

/**
 * Créer une équipe de plus. Un coach en encadre souvent deux — les U13 et les
 * U15 — et n'en déclarait qu'une à l'inscription.
 *
 * L'équipe créée devient l'équipe active : c'est ce que le coach vient faire,
 * et ses annonces suivantes doivent partir en son nom.
 */
export default function NewTeamPage() {
  const router = useRouter();
  const { reloadTeams, setActiveTeam } = useActiveTeam();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  // Aucune catégorie présélectionnée : en poser une reviendrait à décider à la
  // place du coach, et cette valeur repartira ensuite dans toutes ses annonces.
  const [category, setCategory] = useState<MatchCategory | null>(null);
  // Même raisonnement pour le genre : le supposer masculin publierait ensuite
  // des annonces masculines au nom d'une équipe qui ne l'est pas.
  const [gender, setGender] = useState<MatchGender | null>(null);
  const [stadium, setStadium] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Le club, facultatif : ce qui distingue « l'équipe » (les U15) du « club »
  // (l'AS Exemple), et ce qui permet à deux coachs du même club de se retrouver.
  const [club, setClub] = useState<ClubDeclaration>({ name: "", city: "", stadium: "" });
  const [pickedClub, setPickedClub] = useState<DeclaredClubDto | null>(null);

  const incomplete = name.trim().length < 2 || city.trim().length < 1 || !category || !gender;
  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Créer l'équipe",
    disabled: loading || incomplete,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || incomplete) return;
    setLoading(true);
    setError(null);
    try {
      const team = await api<CoachTeamDto>("/coach/teams", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          category,
          gender,
          stadium: stadium.trim() || undefined,
          ...clubPayload(club, pickedClub),
        }),
      });
      // La liste des équipes vit dans la session : sans ce rechargement, la
      // nouvelle équipe n'apparaîtrait qu'à la prochaine connexion.
      await reloadTeams();
      setActiveTeam(team.id);
      router.push("/coach/team");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Users size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Créer une équipe</h2>
          <p className="text-xs text-white/85">
            Elle s&apos;ajoute à celles que vous encadrez et devient votre équipe active.
          </p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <label htmlFor="team-name" className="text-xs font-bold text-ink-soft">
            Nom de l&apos;équipe
          </label>
          {/* Mêmes suggestions qu'à l'inscription. Le coach ajoute lui-même la
              catégorie au nom retenu : l'annuaire connaît « AS Lyon », pas
              « AS Lyon U15 ». */}
          <ClubNameField
            id="team-name"
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={setName}
            onPickCity={setCity}
            placeholder="AS Lyon U15"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="team-city" className="text-xs font-bold text-ink-soft">
            Ville
          </label>
          <input
            id="team-city"
            required
            maxLength={60}
            autoComplete="address-level2"
            autoCapitalize="words"
            enterKeyHint="done"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="field"
            placeholder="Lyon"
          />
          <p className="text-[11px] text-ink-soft">
            Elle sert de point de départ au radar quand vous n&apos;avez pas réglé de position.
          </p>
        </div>

        <CategoryPicker
          value={category}
          onChange={setCategory}
          idPrefix="team-category"
          hint="Reprise à chaque annonce publiée au nom de cette équipe, et modifiable au cas par cas."
        />

        <GenderPicker
          value={gender}
          onChange={setGender}
          idPrefix="team-gender"
          hint="Repris lui aussi à chaque annonce. Il dit surtout aux coachs qui vous répondent — et à vous quand ils vous répondent — si les deux équipes jouent dans le même tableau."
        />

        <div className="space-y-1.5">
          <label htmlFor="team-stadium" className="text-xs font-bold text-ink-soft">
            Stade habituel (optionnel)
          </label>
          <input
            id="team-stadium"
            maxLength={150}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            value={stadium}
            onChange={(e) => setStadium(e.target.value)}
            className="field"
            placeholder="Stade municipal"
          />
          <p className="text-[11px] text-ink-soft">
            Celui où vous recevez. Il sera proposé d&apos;office quand vous publierez une annonce.
          </p>
        </div>

        {/* Le club, à part de l'équipe : « AS Lyon U15 » est une équipe, « AS
            Lyon » est le club. Le déclarer permet aux autres coachs du même
            club de s'y rattacher au lieu d'en créer un second — d'où la
            question posée quand le nom saisi en rappelle un déjà connu. */}
        <div className="space-y-4 border-t border-line pt-4">
          <div>
            <h3 className="display text-lg">Mon club</h3>
            <p className="text-[11px] text-ink-soft">
              Facultatif. À remplir si votre club n&apos;apparaît pas dans les suggestions du nom
              d&apos;équipe — le stade indiqué ici sert de stade par défaut.
            </p>
          </div>
          <ClubDeclarationFields
            idPrefix="team"
            value={club}
            onChange={setClub}
            picked={pickedClub}
            onPick={setPickedClub}
          />
        </div>

        {error &&<p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading || incomplete}>
          {loading ? "Création…" : "Créer l'équipe"}
        </Button>
      </form>
    </div>
  );
}
