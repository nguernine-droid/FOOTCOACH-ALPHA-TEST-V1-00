"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_TIME_SLOTS,
  divisionLevelsFor,
  type AnnouncementCategory,
  type AnnouncementDto,
  type DivisionLevel,
  type MatchCategory,
  type MatchGender,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { CategoryPicker } from "@/components/CategoryPicker";
import { PreciseCategoryPicker } from "@/components/PreciseCategoryPicker";
import { DivisionLevelPicker } from "@/components/DivisionLevelPicker";
import { VenueField } from "@/components/VenueField";
import { GenderPicker } from "@/components/GenderPicker";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const FORM_ID = "modifier-annonce";
const FORMATS = ["5v5", "8v8", "11v11"] as const;

/**
 * Modifier une annonce déjà publiée. Même formulaire que la publication,
 * toujours entièrement déplié : contrairement à une nouvelle annonce, il n'y a
 * rien à résumer, on vient justement corriger un détail précis.
 */
export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [announcement, setAnnouncement] = useState<AnnouncementDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api<AnnouncementDto>(`/announcements/${id}`)
      .then(setAnnouncement)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Annonce introuvable"));
  }, [id]);

  if (loadError) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{loadError}</p>;
  }
  if (!announcement) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }
  if (!announcement.isMine || announcement.status !== "open") {
    return (
      <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">
        Cette annonce ne peut plus être modifiée.
      </p>
    );
  }

  return <EditAnnouncementForm id={id} announcement={announcement} />;
}

function EditAnnouncementForm({ id, announcement }: { id: string; announcement: AnnouncementDto }) {
  const router = useRouter();
  /** Terrain de l'annonce : conservé tel quel tant que le coach n'en change pas */
  const [venueId, setVenueId] = useState<string | null>(announcement.venueId ?? null);
  const [form, setForm] = useState({
    date: announcement.date,
    time: announcement.time,
    city: announcement.city,
    stadium: announcement.stadium,
    category: announcement.category as AnnouncementCategory,
    format: announcement.format,
    comment: announcement.comment ?? "",
  });
  const [preciseCategory, setPreciseCategory] = useState<MatchCategory | null>(announcement.preciseCategory);
  const [gender, setGender] = useState<MatchGender | null>(announcement.gender);
  const [level, setLevel] = useState<DivisionLevel | null>(announcement.level);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Le niveau ne survit pas à un changement de catégorie qui ne le propose
  // plus : rester sur un D2 affiché sous une catégorie U8-U9 mentirait.
  function changeCategory(category: AnnouncementCategory) {
    set("category", category);
    if (!(divisionLevelsFor(category) as readonly string[]).includes(level ?? "")) setLevel(null);
    // Même raison que sur la publication : un âge précisé ne survit pas au
    // groupe auquel il appartenait.
    setPreciseCategory(null);
  }

  const incomplete = !gender || !form.time;

  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Enregistrer",
    disabled: loading || incomplete,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || incomplete) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          gender,
          level,
          preciseCategory,
          venueId,
          comment: form.comment || undefined,
        }),
      });
      router.push("/coach/announcements/mine");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible");
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
          <h2 className="display text-lg">Modifier l&apos;annonce</h2>
          <p className="text-xs text-white/85">Les coachs qui la voient déjà verront ces changements.</p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <label htmlFor="date" className="text-xs font-bold text-ink-soft">Date</label>
          <DateField id="date" required min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(v) => set("date", v)} />
        </div>

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
        </div>

        <CategoryPicker
          value={form.category}
          onChange={changeCategory}
          categories={ANNOUNCEMENT_CATEGORIES}
          idPrefix="edit-announcement-category"
        />

        <PreciseCategoryPicker
          category={form.category}
          value={preciseCategory}
          onChange={setPreciseCategory}
          idPrefix="edit-announcement-precise"
        />

        <GenderPicker value={gender} onChange={setGender} idPrefix="edit-announcement-gender" />

        <DivisionLevelPicker
          category={form.category}
          value={level}
          onChange={setLevel}
          label="Niveau souhaité"
          idPrefix="edit-announcement-level"
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

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || incomplete}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
