"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Megaphone, ShieldCheck } from "lucide-react";
import { FFF_NOTICE_DAYS, daysBetweenIso } from "@footcoach/shared";
import { api } from "@/lib/api";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { cn } from "@/lib/utils";

/** Cible du bouton « ✓ » de la barre d'onglets (association HTML par `form`) */
const FORM_ID = "publier-annonce";

const CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "Seniors"];
const LEVELS = [
  { value: "loisir", label: "Loisir" },
  { value: "competition", label: "Compétition" },
] as const;
const FORMATS = ["5v5", "8v8", "11v11"] as const;

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    date: "",
    time: "",
    city: "",
    stadium: "",
    category: "U13",
    level: "loisir",
    format: "8v8",
    comment: "",
  });
  const [federationDeclared, setFederationDeclared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Délai FFF : la date choisie laisse-t-elle les 10 jours de déclaration ?
  const today = new Date().toISOString().slice(0, 10);
  const noticeDays = form.date ? daysBetweenIso(today, form.date) : null;
  const noticeTooShort = noticeDays !== null && noticeDays < FFF_NOTICE_DAYS;

  // Le « + » de la barre d'onglets devient un « ✓ » qui publie cette annonce
  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Publier l'annonce",
    disabled: loading || !federationDeclared,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api("/announcements", {
        method: "POST",
        body: JSON.stringify({ ...form, comment: form.comment || undefined, federationDeclared }),
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
          <h2 className="display text-lg">Proposer un match amical</h2>
          <p className="text-xs text-white/85">Votre annonce sera visible par tous les coachs sur le radar.</p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        {/* Une colonne au pouce : les libellés de date complets ne tiennent pas
            dans une demi-largeur de téléphone, et le champ y perd sa cible. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="date" className="text-xs font-bold text-ink-soft">Date</label>
            <DateField id="date" required min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(v) => set("date", v)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="time" className="text-xs font-bold text-ink-soft">Heure</label>
            <TimeField id="time" required value={form.time} onChange={(v) => set("time", v)} />
          </div>
        </div>

        {/* Délai réglementaire FFF : information par défaut, alerte si la date est trop proche */}
        {noticeTooShort ? (
          <div className="rounded-lg bg-coral-soft border border-coral/25 px-4 py-3 flex gap-2.5" role="alert">
            <AlertTriangle size={15} className="text-coral shrink-0 mt-0.5" aria-hidden />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-coral">
                Délai FFF non respecté — {noticeDays === 0 ? "aujourd'hui" : `dans ${noticeDays} jour${noticeDays! > 1 ? "s" : ""}`}
              </p>
              <p className="text-ink-soft">
                Un match amical doit être déclaré à votre district au moins {FFF_NOTICE_DAYS} jours avant la
                rencontre. Vous pouvez publier quand même, mais la déclaration peut être refusée.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-blue-faint border border-line px-4 py-3 flex gap-2.5">
            <ShieldCheck size={15} className="text-blue shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-ink-soft">
              Rappel FFF : tout match amical doit être déclaré à votre district au moins{" "}
              <span className="font-bold text-ink">{FFF_NOTICE_DAYS} jours</span> avant la rencontre.
            </p>
          </div>
        )}

        {/* Grilles plutôt que rangées repliées : chaque choix garde une cible
            pleine et régulière, même à 390 px de large. */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Catégorie</span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={form.category === c}
                onClick={() => set("category", c)}
                className={cn("chip-choice", form.category === c ? "chip-choice-on" : "chip-choice-off")}
              >
                {c}
              </button>
            ))}
          </div>
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
          <input id="stadium" required value={form.stadium} onChange={(e) => set("stadium", e.target.value)} className="field" placeholder="Stade municipal" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-xs font-bold text-ink-soft">Ville</label>
          <input id="city" required value={form.city} onChange={(e) => set("city", e.target.value)} className="field" placeholder="Lyon" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="comment" className="text-xs font-bold text-ink-soft">Informations pratiques (optionnel)</label>
          <textarea id="comment" value={form.comment} onChange={(e) => set("comment", e.target.value)} className="field resize-none" rows={3} placeholder="Terrain synthétique, vestiaires dispo, ambiance conviviale…" />
        </div>

        {/* Attestation obligatoire : la déclaration à la fédération reste à la charge du coach */}
        <label
          htmlFor="federationDeclared"
          className={cn(
            "flex gap-3 items-start rounded-lg border px-4 py-3 cursor-pointer transition",
            federationDeclared ? "border-blue bg-blue-faint" : "border-line bg-paper hover:border-blue/40",
          )}
        >
          <input
            id="federationDeclared"
            type="checkbox"
            required
            checked={federationDeclared}
            onChange={(e) => setFederationDeclared(e.target.checked)}
            className="mt-0.5 w-5 h-5 shrink-0 accent-blue"
          />
          <span className="text-xs text-ink-soft leading-relaxed">
            <span className="font-bold text-ink">
              J&apos;atteste avoir déclaré ce match amical à ma fédération (district / ligue).
            </span>{" "}
            La déclaration préalable relève de la responsabilité du club ; FootCoach en conserve seulement la trace.
          </span>
        </label>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || !federationDeclared}>
          {loading ? "Publication…" : noticeTooShort ? "Publier quand même" : "Publier l'annonce"}
        </Button>
      </form>
    </div>
  );
}
