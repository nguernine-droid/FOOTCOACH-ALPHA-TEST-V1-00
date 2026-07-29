"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    } catch {
      // Réponse volontairement identique quoi qu'il arrive
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4 animate-rise-in">
        <div className="text-center space-y-1">
          <p className="display text-xl text-primary leading-none">
            FOOT<span className="text-pitch">COACH</span>
          </p>
          <h1 className="text-2xl font-black">Mot de passe oublié</h1>
        </div>

        {sent ? (
          <div className="card p-8 text-center space-y-4">
            <span className="w-14 h-14 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto">
              <MailCheck size={26} />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold">Demande transmise</p>
              <p className="text-sm text-ink-soft">
                Si un compte existe avec cette adresse, l&apos;administrateur a été prévenu : il vous transmettra un mot
                de passe temporaire (via votre coach ou directement).
              </p>
            </div>
            <ButtonLink href="/login" variant="soft" className="w-full">
              Retour à la connexion
            </ButtonLink>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
                <KeyRound size={18} />
              </span>
              <p className="text-sm text-ink-soft">
                Indiquez l&apos;adresse email de votre compte : une demande de réinitialisation sera envoyée à
                l&apos;administrateur.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fpEmail" className="text-xs font-bold text-ink-soft">Email</label>
              <input
                id="fpEmail"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="vous@exemple.fr"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Envoi…" : "Demander la réinitialisation"}
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold
                text-ink-soft transition hover:text-ink active:bg-paper"
            >
              <ArrowLeft size={16} /> Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
