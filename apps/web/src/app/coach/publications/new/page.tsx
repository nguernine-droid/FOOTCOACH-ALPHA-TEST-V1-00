"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper } from "lucide-react";
import { PUBLICATION_MAX_LENGTH } from "@footcoach/shared";
import { api } from "@/lib/api";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { Button } from "@/components/ui/Button";

/** Cible du bouton « ✓ » de la barre d'onglets (association HTML par `form`) */
const FORM_ID = "publier-information";

/**
 * Rédiger un billet pour le panneau d'affichage du secteur.
 *
 * Cet écran remplace la zone de rédaction qui trônait en tête du panneau : elle
 * y occupait le haut de l'écran à demeure, chez les contributeurs, pour un
 * geste qui se fait quelques fois par saison. La publication rejoint donc les
 * deux autres créations, derrière le « + » de la barre d'onglets.
 *
 * Aucun contrôle de casquette ici : le « + » ne propose l'option qu'aux
 * contributeurs, et c'est le serveur qui tranche à l'envoi (`POST
 * /publications` refuse quiconque ne l'est pas). Un garde côté navigateur
 * n'aurait fait que dupliquer une décision qui ne lui appartient pas.
 */
export default function NewPublicationPage() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const empty = body.trim().length === 0;

  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Publier l'information",
    disabled: loading || empty,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || empty) return;
    setLoading(true);
    setError(null);
    try {
      await api("/publications", { method: "POST", body: JSON.stringify({ body: body.trim() }) });
      // Retour au panneau, sur l'onglet où le billet vient d'apparaître.
      router.push("/coach/announcements?cat=publications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de publier");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Newspaper size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Publier une information</h2>
          <p className="text-xs text-white/85">Elle s&apos;affiche au panneau du secteur, lue par tous les coachs.</p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <label htmlFor="publication-body" className="text-xs font-bold text-ink-soft">
            Votre information
          </label>
          <textarea
            id="publication-body"
            required
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={PUBLICATION_MAX_LENGTH}
            rows={6}
            className="field resize-none"
            placeholder="Les poules U13 sont publiées, plateau de samedi annulé pour intempéries…"
          />
          {/* Le décompte n'apparaît qu'en fin de course : tant qu'il reste de la
              place, il n'y a rien à surveiller. */}
          <p className="text-[11px] text-ink-soft" aria-live="polite">
            {body.length >= PUBLICATION_MAX_LENGTH - 100
              ? `${PUBLICATION_MAX_LENGTH - body.length} caractères restants`
              : "Les retours à la ligne sont conservés : une liste de poules se lira en liste."}
          </p>
        </div>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading || empty}>
          {loading ? "Publication…" : "Publier l'information"}
        </Button>
      </form>
    </div>
  );
}
