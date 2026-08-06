"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { CoachTeamDto, MatchCategory } from "@footcoach/shared";
import { api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { CategoryPicker } from "@/components/CategoryPicker";
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
  const [stadium, setStadium] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const incomplete = name.trim().length < 2 || city.trim().length < 1 || !category;
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
          stadium: stadium.trim() || undefined,
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
          <input
            id="team-name"
            required
            minLength={2}
            maxLength={60}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
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

        {error &&<p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading || incomplete}>
          {loading ? "Création…" : "Créer l'équipe"}
        </Button>
      </form>
    </div>
  );
}
