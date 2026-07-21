"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { NeonButton } from "@/components/ui/NeonButton";

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-neon-orange/60 [color-scheme:dark]";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [form, setForm] = useState({ date: "", time: "", city: "", stadium: "", category: "U13", comment: "" });
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
    <form onSubmit={submit} className="card-cyber p-6 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Nouvelle annonce de match amical</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="date" className="text-xs text-white/50 font-bold uppercase">Date</label>
          <input id="date" type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="time" className="text-xs text-white/50 font-bold uppercase">Heure</label>
          <input id="time" type="time" required value={form.time} onChange={(e) => set("time", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="category" className="text-xs text-white/50 font-bold uppercase">Catégorie</label>
        <select id="category" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
          {["U9", "U11", "U13", "U15", "U17", "Seniors"].map((c) => (
            <option key={c} value={c} className="bg-dark-card">{c}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="stadium" className="text-xs text-white/50 font-bold uppercase">Stade</label>
        <input id="stadium" required value={form.stadium} onChange={(e) => set("stadium", e.target.value)} className={inputClass} placeholder="Stade municipal" />
      </div>
      <div className="space-y-1">
        <label htmlFor="city" className="text-xs text-white/50 font-bold uppercase">Ville</label>
        <input id="city" required value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} placeholder="Lyon" />
      </div>
      <div className="space-y-1">
        <label htmlFor="comment" className="text-xs text-white/50 font-bold uppercase">Commentaire (optionnel)</label>
        <textarea id="comment" value={form.comment} onChange={(e) => set("comment", e.target.value)} className={inputClass} rows={3} placeholder="Terrain synthétique, vestiaires…" />
      </div>
      {error && <p className="text-xs text-match-red">{error}</p>}
      <NeonButton type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Publication…" : "Publier l'annonce"}
      </NeonButton>
    </form>
  );
}
