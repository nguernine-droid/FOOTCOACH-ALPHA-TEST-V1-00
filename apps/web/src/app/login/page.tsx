"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { homeForRole, login } from "@/lib/api";
import { NeonButton } from "@/components/ui/NeonButton";

const DEMO_ACCOUNTS = [
  { label: "Coach A", email: "coach.a@demo.fr" },
  { label: "Coach B", email: "coach.b@demo.fr" },
  { label: "Joueur", email: "player@demo.fr" },
  { label: "Parent", email: "parent@demo.fr" },
  { label: "Supporter", email: "supporter@demo.fr" },
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
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black tracking-tight">
            FOOT<span className="text-neon-orange">COACH</span>
          </h1>
          <p className="text-sm text-white/50">Matchs amicaux, simplement.</p>
        </div>

        <form onSubmit={submit} className="card-cyber p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs uppercase tracking-wide text-white/50 font-bold">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-neon-orange/60"
              placeholder="coach.a@demo.fr"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs uppercase tracking-wide text-white/50 font-bold">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-neon-orange/60"
              placeholder="Demo1234!"
            />
          </div>
          {error && <p className="text-xs text-match-red">{error}</p>}
          <NeonButton type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </NeonButton>
        </form>

        <div className="card-cyber p-4">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Comptes de démo · Demo1234!</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("Demo1234!");
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-neon-orange/50 transition"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
