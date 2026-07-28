"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Users } from "lucide-react";
import type { CoachTeamDto } from "@footcoach/shared";
import { api, getStoredUser } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { useQuickActionOverride } from "@/components/QuickActionContext";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const clubName = getStoredUser()?.clubName ?? null;

  const incomplete = name.trim().length < 2 || city.trim().length < 1;
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
        body: JSON.stringify({ name: name.trim(), city: city.trim() }),
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

        {clubName && (
          <div className="rounded-lg bg-blue-faint border border-line px-4 py-3 flex gap-2.5">
            <Info size={15} className="text-blue shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-ink-soft">
              Vous êtes affilié à <span className="font-bold text-ink">{clubName}</span> : cette équipe sera
              rattachée à ce club.
            </p>
          </div>
        )}

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading || incomplete}>
          {loading ? "Création…" : "Créer l'équipe"}
        </Button>
      </form>
    </div>
  );
}
