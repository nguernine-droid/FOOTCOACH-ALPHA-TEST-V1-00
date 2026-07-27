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
          <button type="button" onClick={onBack} className="text-xs font-bold text-ink-soft hover:text-ink inline-flex items-center gap-1 mb-2">
            <ArrowLeft size={13} /> Retour
          </button>
        )}
        <h2 className="text-lg font-black">{title}</h2>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function CoachWizard({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", teamName: "", teamCity: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
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
            onSubmit={(e) => {
              e.preventDefault();
              setStep(1);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-bold text-ink-soft">Prénom</label>
              <input id="firstName" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="field" placeholder="Alexandre" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-bold text-ink-soft">Nom</label>
              <input id="lastName" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="field" placeholder="Martin" />
            </div>
            <Button type="submit" size="lg" className="w-full">Continuer</Button>
          </form>
        </StepCard>
      )}
      {step === 1 && (
        <StepCard title="Votre compte" subtitle="Vous les utiliserez pour vous connecter." onBack={() => setStep(0)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-ink-soft">Email</label>
              <input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className="field" placeholder="vous@exemple.fr" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-ink-soft">Mot de passe (8 caractères minimum)</label>
              <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} className="field" />
            </div>
            <Button type="submit" size="lg" className="w-full">Continuer</Button>
          </form>
        </StepCard>
      )}
      {step === 2 && (
        <StepCard title="Votre équipe" subtitle="Dernière étape ! Elle sera créée avec vous." onBack={() => setStep(1)}>
          <form onSubmit={finish} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="teamName" className="text-xs font-bold text-ink-soft">Nom de l&apos;équipe</label>
              <input id="teamName" required value={form.teamName} onChange={(e) => set("teamName", e.target.value)} className="field" placeholder="FC Exemple" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="teamCity" className="text-xs font-bold text-ink-soft">Ville</label>
              <input id="teamCity" required value={form.teamCity} onChange={(e) => set("teamCity", e.target.value)} className="field" placeholder="Lyon" />
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
          <p className="display text-xl text-pitch-deep leading-none">
            FOOT<span className="text-pitch">COACH</span>
          </p>
          <h1 className="text-2xl font-black">Créer un compte coach</h1>
        </div>

        <CoachWizard onBack={() => router.push("/login")} />

        <p className="text-center text-xs text-ink-soft">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-bold text-pitch hover:underline">
            Se connecter
          </Link>
        </p>
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
