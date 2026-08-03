"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, ShieldHalf } from "lucide-react";
import { homeForRole, login } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// V1 réservée aux coachs : seuls les comptes de démo accessibles sont proposés
const DEMO_ACCOUNTS = [
  { label: "Coach A", sub: "FC Nexus", email: "coach.a@demo.fr", icon: ClipboardList, color: "text-pitch bg-pitch-soft" },
  { label: "Coach B", sub: "AS Cyber", email: "coach.b@demo.fr", icon: ClipboardList, color: "text-pitch bg-pitch-soft" },
  { label: "Admin", sub: "Alice", email: "admin@demo.fr", icon: ShieldHalf, color: "text-primary bg-blue-soft" },
];

/** Contrôle volontairement large : on signale une faute de frappe, pas une RFC */
function emailLooksWrong(value: string): string | null {
  if (!value.trim()) return "Indiquez votre adresse email.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : "Cette adresse email semble incomplète.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailError = emailLooksWrong(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Validation en ligne, sous le champ : pas de bulle native qui masque le
    // formulaire et disparaît au premier appui.
    setTouched(true);
    if (emailError || !password) return;
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      router.replace(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4 animate-rise-in">
        <div className="hero-pitch p-7 text-center space-y-2">
          <Logo size={64} className="mx-auto mb-4" />
          <h1 className="display text-4xl leading-none">
            FOOT<span className="text-accent-solid">COACH</span>
          </h1>
          <p className="text-sm text-white/85 font-medium">Organisez vos matchs amicaux en deux touches de balle.</p>
        </div>

        <form onSubmit={submit} noValidate className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              // Le clavier email, le trousseau et l'absence de majuscule
              // automatique évitent la moitié des échecs de connexion mobile.
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              aria-invalid={Boolean(touched && emailError) || undefined}
              aria-describedby={touched && emailError ? "email-error" : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="coach.a@demo.fr"
            />
            {touched && emailError && (
              <p id="email-error" className="text-xs font-semibold text-coral">
                {emailError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-ink-soft">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(touched && !password) || undefined}
              aria-describedby={touched && !password ? "password-error" : undefined}
              className="field"
              placeholder="Demo1234!"
            />
            {touched && !password && (
              <p id="password-error" className="text-xs font-semibold text-coral">
                Saisissez votre mot de passe.
              </p>
            )}
          </div>
          {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
          <Link
            href="/forgot-password"
            className="flex items-center justify-center min-h-11 rounded-lg text-xs font-bold text-ink-soft
              transition hover:text-ink active:bg-paper"
          >
            Mot de passe oublié ?
          </Link>
        </form>

        {/* Le lien sort de la phrase pour devenir une vraie cible de 44 px */}
        <div className="text-center">
          <p className="text-xs text-ink-soft">Vous êtes coach et n&apos;avez pas de compte ?</p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg text-xs font-bold
              text-pitch transition hover:underline active:bg-blue-soft"
          >
            Créer un compte coach
          </Link>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-ink-soft text-center">Essayez avec un compte de démo</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(({ label, sub, email: demoEmail, icon: Icon, color }) => (
              <button
                key={demoEmail}
                type="button"
                onClick={() => {
                  setEmail(demoEmail);
                  setPassword("Demo1234!");
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-left transition hover:border-pitch/40 hover:bg-paper",
                  email === demoEmail && "border-pitch bg-pitch-soft/50",
                )}
              >
                <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", color)}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold truncate">{label}</span>
                  <span className="block text-[10px] text-ink-soft truncate">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
