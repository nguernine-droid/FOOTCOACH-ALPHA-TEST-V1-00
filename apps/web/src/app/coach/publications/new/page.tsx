"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useQuickActionOverride } from "@/components/QuickActionContext";
import { Button, ButtonLink } from "@/components/ui/Button";

const FORM_ID = "nouvelle-publication";

export default function NewPublicationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = title.trim().length >= 3 && body.trim().length >= 10;

  useQuickActionOverride({
    kind: "submit",
    formId: FORM_ID,
    label: "Publier",
    disabled: loading || !valid,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      await api("/publications", { method: "POST", body: JSON.stringify({ title: title.trim(), body: body.trim() }) });
      router.push("/coach/publications");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : "Publication impossible");
      }
      setLoading(false);
    }
  }

  if (forbidden) {
    return (
      <div className="max-w-[560px] mx-auto card p-6 space-y-3 text-center">
        <span className="w-12 h-12 rounded-lg bg-coral-soft text-coral flex items-center justify-center mx-auto">
          <BookOpen size={22} />
        </span>
        <p className="text-sm font-bold">Réservé aux coachs contributeurs</p>
        <p className="text-xs text-ink-soft">
          Activez la casquette « Contributeur » dans votre profil pour pouvoir publier.
        </p>
        <ButtonLink href="/coach/profile" variant="soft" className="w-full">
          Aller à mon profil
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <BookOpen size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Écrire une publication</h2>
          <p className="text-xs text-white/85">Visible de tous les coachs de l&apos;application.</p>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="card p-6 space-y-4 animate-rise-in">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-xs font-bold text-ink-soft">Titre</label>
          <input
            id="title"
            required
            minLength={3}
            maxLength={120}
            autoCapitalize="sentences"
            enterKeyHint="next"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
            placeholder="Ce que vous avez à partager, en une phrase"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="body" className="text-xs font-bold text-ink-soft">Contenu</label>
          <textarea
            id="body"
            required
            minLength={10}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="field resize-none"
            rows={10}
            placeholder="Un conseil, un retour d'expérience, une information utile aux autres coachs…"
          />
          <p className="text-[11px] text-ink-soft">{body.trim().length}/4000</p>
        </div>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading || !valid}>
          {loading ? "Publication…" : "Publier"}
        </Button>
      </form>
    </div>
  );
}
