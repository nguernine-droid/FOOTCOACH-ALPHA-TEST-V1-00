"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { register } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Inscription volontairement découpée en petites étapes :
// une seule question à l'écran, pour rester simple même sans être à l'aise avec la technologie.

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Étape ${current + 1} sur ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={cn("h-2 rounded-full transition-all", i === current ? "w-6 bg-pitch" : "w-2 bg-line")} />
      ))}
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="card p-6 space-y-5 animate-rise-in">
      <div className="space-y-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 min-h-11 -ml-2 px-2 mb-1 rounded-lg text-xs font-bold
              text-ink-soft transition hover:text-ink active:bg-paper"
          >
            <ArrowLeft size={16} /> Retour
          </button>
        )}
        <h2 className="text-lg font-black">{title}</h2>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Message d'erreur ancré sous son champ */
function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-xs font-semibold text-coral">
      {children}
    </p>
  );
}

function CoachWizard({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", teamName: "", teamCity: "" });
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Chaque étape se valide sous ses champs plutôt que par une bulle native,
  // qui se place hors écran dès que le clavier est ouvert.
  const emailError = !form.email.trim()
    ? "Indiquez votre adresse email."
    : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())
      ? null
      : "Cette adresse email semble incomplète.";
  const passwordError =
    form.password.length === 0
      ? "Choisissez un mot de passe."
      : form.password.length < 8
        ? "8 caractères minimum."
        : null;

  /** Passe à l'étape suivante si les champs de l'étape courante tiennent */
  function advance(to: number, blocked: boolean) {
    setTouched(true);
    if (blocked) return;
    setTouched(false);
    setStep(to);
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!form.teamName.trim() || !form.teamCity.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await register("/auth/register-coach", form);
      router.replace("/coach/team?bienvenue=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Dots total={3} current={step} />
      {step === 0 && (
        <StepCard title="Qui êtes-vous ?" subtitle="Commençons par votre nom." onBack={onBack}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              advance(1, !form.firstName.trim() || !form.lastName.trim());
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-bold text-ink-soft">Prénom</label>
              <input id="firstName" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="field" placeholder="Alexandre" />
              {touched && !form.firstName.trim() && <FieldError id="firstName-error">Indiquez votre prénom.</FieldError>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-bold text-ink-soft">Nom</label>
              <input id="lastName" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="field" placeholder="Martin" />
              {touched && !form.lastName.trim() && <FieldError id="lastName-error">Indiquez votre nom.</FieldError>}
            </div>
            <Button type="submit" size="lg" className="w-full">Continuer</Button>
          </form>
        </StepCard>
      )}
      {step === 1 && (
        <StepCard title="Votre compte" subtitle="Vous les utiliserez pour vous connecter." onBack={() => setStep(0)}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              advance(2, Boolean(emailError || passwordError));
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-ink-soft">Email</label>
              <input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-invalid={Boolean(touched && emailError) || undefined} value={form.email} onChange={(e) => set("email", e.target.value)} className="field" placeholder="vous@exemple.fr" />
              {touched && emailError && <FieldError id="email-error">{emailError}</FieldError>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-ink-soft">Mot de passe (8 caractères minimum)</label>
              <input id="password" type="password" autoComplete="new-password" enterKeyHint="next" aria-invalid={Boolean(touched && passwordError) || undefined} value={form.password} onChange={(e) => set("password", e.target.value)} className="field" />
              {touched && passwordError && <FieldError id="password-error">{passwordError}</FieldError>}
            </div>
            <Button type="submit" size="lg" className="w-full">Continuer</Button>
          </form>
        </StepCard>
      )}
      {step === 2 && (
        <StepCard title="Votre équipe" subtitle="Dernière étape ! Elle sera créée avec vous." onBack={() => setStep(1)}>
          <form onSubmit={finish} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="teamName" className="text-xs font-bold text-ink-soft">Nom de l&apos;équipe</label>
              <input id="teamName" autoComplete="organization" autoCapitalize="words" enterKeyHint="next" value={form.teamName} onChange={(e) => set("teamName", e.target.value)} className="field" placeholder="FC Exemple" />
              {touched && !form.teamName.trim() && <FieldError id="teamName-error">Donnez un nom à votre équipe.</FieldError>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="teamCity" className="text-xs font-bold text-ink-soft">Ville</label>
              <input id="teamCity" autoComplete="address-level2" autoCapitalize="words" enterKeyHint="done" value={form.teamCity} onChange={(e) => set("teamCity", e.target.value)} className="field" placeholder="Lyon" />
              {touched && !form.teamCity.trim() && <FieldError id="teamCity-error">Indiquez la ville de l&apos;équipe.</FieldError>}
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte et mon équipe"}
            </Button>
          </form>
        </StepCard>
      )}
    </div>
  );
}


// V1 réservée aux coachs : seule l'inscription coach existe.
function RegisterContent() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <p className="display text-xl text-primary leading-none">
            FOOT<span className="text-pitch">COACH</span>
          </p>
          <h1 className="text-2xl font-black">Créer un compte coach</h1>
        </div>

        <CoachWizard onBack={() => router.push("/login")} />

        <div className="text-center">
          <p className="text-xs text-ink-soft">Déjà un compte ?</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg text-xs font-bold
              text-pitch transition hover:underline active:bg-blue-soft"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
