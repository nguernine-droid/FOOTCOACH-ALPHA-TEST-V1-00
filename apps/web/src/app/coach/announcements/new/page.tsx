"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { cn } from "@/lib/utils";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/announcements", {
        method: "POST",
        body: JSON.stringify({ ...form, comment: form.comment || undefined }),
      });
      router.push("/coach");
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

      <form onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="date" className="text-xs font-bold text-ink-soft">Date</label>
            <DateField id="date" required min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(v) => set("date", v)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="time" className="text-xs font-bold text-ink-soft">Heure</label>
            <TimeField id="time" required value={form.time} onChange={(v) => set("time", v)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Catégorie</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("category", c)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold border transition",
                  form.category === c
                    ? "bg-pitch text-white border-pitch shadow-sm"
                    : "bg-white text-ink-soft border-line hover:border-pitch/40",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-ink-soft">Niveau</span>
            <div className="flex gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set("level", l.value)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition",
                    form.level === l.value
                      ? "bg-pitch text-white border-pitch shadow-sm"
                      : "bg-white text-ink-soft border-line hover:border-pitch/40",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-ink-soft">Format</span>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set("format", f)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition",
                    form.format === f
                      ? "bg-pitch text-white border-pitch shadow-sm"
                      : "bg-white text-ink-soft border-line hover:border-pitch/40",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
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

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Publication…" : "Publier l'annonce"}
        </Button>
      </form>
    </div>
  );
}
