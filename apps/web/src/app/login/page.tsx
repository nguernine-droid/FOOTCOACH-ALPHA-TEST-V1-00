"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Hand, Heart, Volleyball } from "lucide-react";
import { homeForRole, login } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { label: "Coach A", sub: "FC Nexus", email: "coach.a@demo.fr", icon: ClipboardList, color: "text-pitch bg-pitch-soft" },
  { label: "Coach B", sub: "AS Cyber", email: "coach.b@demo.fr", icon: ClipboardList, color: "text-pitch bg-pitch-soft" },
  { label: "Joueur", sub: "Paul", email: "player@demo.fr", icon: Volleyball, color: "text-sky bg-sky-soft" },
  { label: "Parent", sub: "Patricia", email: "parent@demo.fr", icon: Hand, color: "text-tangerine bg-tangerine-soft" },
  { label: "Supporter", sub: "Sam", email: "supporter@demo.fr", icon: Heart, color: "text-sun bg-sun-soft" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          <h1 className="display text-4xl leading-none">
            FOOT<span className="text-pitch-soft/80">COACH</span>
          </h1>
          <p className="text-sm text-white/85 font-medium">Organisez vos matchs amicaux en deux touches de balle.</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-ink-soft">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="coach.a@demo.fr"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-ink-soft">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="Demo1234!"
            />
          </div>
          {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
          <p className="text-center">
            <Link href="/forgot-password" className="text-xs font-bold text-ink-soft hover:text-ink hover:underline">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-ink-soft">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-bold text-pitch hover:underline">
            Créer un compte
          </Link>
        </p>

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
