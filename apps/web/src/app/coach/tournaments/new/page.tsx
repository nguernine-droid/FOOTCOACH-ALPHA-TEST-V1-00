"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trophy, X } from "lucide-react";
import {
  categoryLabel,
  MATCH_CATEGORIES,
  MATCH_GENDERS,
  MATCH_GENDER_LABELS,
  TOURNAMENT_MAX_SLOTS,
  TOURNAMENT_MIN_SLOTS,
  TOURNAMENT_SESSION_LABELS,
  TOURNAMENT_SESSIONS,
  type MatchCategory,
  type MatchGender,
  type TournamentSession,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { cn } from "@/lib/utils";

const FORM_ID = "creer-tournoi";
const FORMATS = ["5v5", "8v8", "11v11"] as const;
const MAX_POSTER_BYTES = 2 * 1024 * 1024;

/**
 * Organiser un tournoi. L'application n'en gère que la visibilité et les
 * inscriptions : ni poules, ni calendrier, ni résultats.
 *
 * L'affiche est envoyée APRÈS la création, en second appel : le tournoi doit
 * pouvoir exister sans image, et une affiche se remplace ensuite sans toucher
 * au reste. Le formulaire garde le fichier de côté et l'envoie dans la foulée.
 */
export default function NewTournamentPage() {
  const router = useRouter();
  const { activeTeam } = useActiveTeam();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    date: "",
    endDate: "",
    session: "day" as TournamentSession,
    city: activeTeam?.city ?? "",
    stadium: activeTeam?.stadium ?? "",
    format: "8v8",
    comment: "",
  });
  const [categories, setCategories] = useState<MatchCategory[]>(
    activeTeam?.category ? [activeTeam.category] : [],
  );
  const [gender, setGender] = useState<MatchGender | null>(null);
  const [slots, setSlots] = useState(8);
  const [poster, setPoster] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(category: MatchCategory) {
    setCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  }

  const incomplete =
    !form.name.trim() || !form.date || !form.city.trim() || !form.stadium.trim() || categories.length === 0 || !gender;

  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Créer le tournoi",
    disabled: loading || incomplete,
  });

  function pickPoster(file: File | null) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_POSTER_BYTES) {
      setError("Affiche trop lourde (2 Mo maximum)");
      return;
    }
    setPoster(file);
    // Aperçu local : l'affiche n'existe côté serveur qu'après la création
    setPosterPreview(URL.createObjectURL(file));
  }

  function clearPoster() {
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPoster(null);
    setPosterPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || incomplete) return;
    setLoading(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          category: categories,
          gender,
          slots,
          endDate: form.endDate || undefined,
          comment: form.comment.trim() || undefined,
        }),
      });
      if (poster) {
        const body = new FormData();
        body.append("file", poster);
        // L'échec de l'affiche ne perd pas le tournoi : il est déjà créé, et
        // l'organisateur peut la reposer depuis sa page.
        await api(`/tournaments/${id}/poster`, { method: "POST", body }).catch(() => undefined);
      }
      router.push(`/coach/tournaments/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Trophy size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Organiser un tournoi</h2>
          <p className="text-xs text-white/85">
            Il apparaîtra sur le radar des coachs du secteur, qui pourront s&apos;y inscrire.
          </p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-bold text-ink-soft">Nom du tournoi</label>
          <input id="name" required minLength={3} maxLength={80} autoCapitalize="words" enterKeyHint="next" value={form.name} onChange={(e) => set("name", e.target.value)} className="field" placeholder="Tournoi de la Pentecôte" />
        </div>

        {/* Affiche : le seul contenu que l'organisateur compose lui-même */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Affiche (optionnelle)</span>
          {posterPreview ? (
            <div className="relative rounded-lg overflow-hidden border border-line">
              {/* Aperçu local d'un fichier choisi : pas de next/image possible */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterPreview} alt="Aperçu de l'affiche" className="w-full aspect-[16/9] object-cover" />
              <button
                type="button"
                onClick={clearPoster}
                aria-label="Retirer l'affiche"
                className="absolute top-2 right-2 icon-btn bg-navy-900/70 text-white hover:bg-navy-900"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-line bg-paper px-4 py-6 flex flex-col
                items-center gap-2 text-ink-soft transition hover:border-blue/40 hover:text-blue"
            >
              <ImagePlus size={22} aria-hidden />
              <span className="text-xs font-bold">Ajouter une affiche</span>
              <span className="text-[11px]">JPEG, PNG ou WebP — 2 Mo maximum</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickPoster(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="date" className="text-xs font-bold text-ink-soft">Date</label>
            <DateField id="date" required min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(v) => set("date", v)} />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-ink-soft">Moment</span>
            <div className="grid grid-cols-2 gap-2">
              {TOURNAMENT_SESSIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.session === s}
                  onClick={() => set("session", s)}
                  className={cn("chip-choice", form.session === s ? "chip-choice-on" : "chip-choice-off")}
                >
                  {TOURNAMENT_SESSION_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="endDate" className="text-xs font-bold text-ink-soft">Dernier jour (si le tournoi dure)</label>
          <DateField id="endDate" min={form.date || undefined} value={form.endDate} onChange={(v) => set("endDate", v)} />
          <p className="text-[11px] text-ink-soft">Laissez vide pour un tournoi d&apos;une seule journée.</p>
        </div>

        {/* Plusieurs catégories : un même tournoi accueille souvent plusieurs
            tranches d'âge, en poules séparées. */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Catégories</span>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Catégories du tournoi">
            {MATCH_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={categories.includes(c)}
                onClick={() => toggleCategory(c)}
                className={cn("chip-choice !px-2", categories.includes(c) ? "chip-choice-on" : "chip-choice-off")}
              >
                <span className="truncate">{categoryLabel(c)}</span>
              </button>
            ))}
          </div>
          {activeTeam?.category && (
            <p className="text-[11px] text-ink-soft">Reprise de {activeTeam.name} — modifiable.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Genre</span>
          <div className="grid grid-cols-3 gap-2">
            {MATCH_GENDERS.map((g) => (
              <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)} className={cn("chip-choice", gender === g ? "chip-choice-on" : "chip-choice-off")}>
                {MATCH_GENDER_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Format</span>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => (
              <button key={f} type="button" aria-pressed={form.format === f} onClick={() => set("format", f)} className={cn("chip-choice", form.format === f ? "chip-choice-on" : "chip-choice-off")}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Compteur plutôt qu'un champ libre : au bord d'un terrain, régler un
            nombre au pouce vaut mieux que d'ouvrir un clavier numérique. */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Équipes attendues</span>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3">
            <button
              type="button"
              onClick={() => setSlots((v) => Math.max(TOURNAMENT_MIN_SLOTS, v - 1))}
              aria-label="Une équipe de moins"
              className="w-12 h-12 shrink-0 rounded-lg border border-line surface text-xl text-ink-soft transition active:scale-90"
            >
              −
            </button>
            <span className="display text-4xl tabular-nums text-primary">{slots}</span>
            <button
              type="button"
              onClick={() => setSlots((v) => Math.min(TOURNAMENT_MAX_SLOTS, v + 1))}
              aria-label="Une équipe de plus"
              className="w-12 h-12 shrink-0 rounded-lg border border-blue/30 bg-blue-soft text-xl text-primary transition active:scale-90"
            >
              +
            </button>
          </div>
          <p className="text-[11px] text-ink-soft">
            Hors votre équipe. Les inscriptions se ferment d&apos;elles-mêmes une fois ce nombre atteint.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stadium" className="text-xs font-bold text-ink-soft">Stade</label>
          <input id="stadium" required maxLength={150} autoCapitalize="words" enterKeyHint="next" value={form.stadium} onChange={(e) => set("stadium", e.target.value)} className="field" placeholder="Stade municipal" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="city" className="text-xs font-bold text-ink-soft">Ville</label>
          <input id="city" required maxLength={100} autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" value={form.city} onChange={(e) => set("city", e.target.value)} className="field" placeholder="Lyon" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="comment" className="text-xs font-bold text-ink-soft">Informations pratiques (optionnel)</label>
          <textarea id="comment" maxLength={1000} value={form.comment} onChange={(e) => set("comment", e.target.value)} className="field resize-none" rows={4} placeholder="Buvette sur place, 4 terrains, engagement 30 € par équipe…" />
        </div>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || incomplete}>
          {loading ? "Création…" : "Créer le tournoi"}
        </Button>
      </form>
    </div>
  );
}
