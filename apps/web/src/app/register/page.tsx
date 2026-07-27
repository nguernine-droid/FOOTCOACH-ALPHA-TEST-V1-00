"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserRound, Users } from "lucide-react";
import type { PlayerPosition, TeamJoinInfoDto } from "@footcoach/shared";
import { PLAYER_POSITIONS } from "@footcoach/shared";
import { api, homeForRole, register } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const POSITION_LABELS: Record<PlayerPosition, string> = {
  gardien: "Gardien",
  defenseur: "Défenseur",
  milieu: "Milieu",
  attaquant: "Attaquant",
};

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

function JoinWizard({ initialCode, onBack }: { initialCode: string; onBack: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [info, setInfo] = useState<TeamJoinInfoDto | null>(null);
  const [role, setRole] = useState<"player" | "parent" | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    position: "" as PlayerPosition | "",
    jerseyNumber: "",
    childUserId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setInfo(await api<TeamJoinInfoDto>(`/teams/join/${code.trim().toUpperCase()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const user = await register("/auth/register-join", {
        code: code.trim().toUpperCase(),
        role,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        ...(role === "player" && form.position ? { position: form.position } : {}),
        ...(role === "player" && form.jerseyNumber ? { jerseyNumber: Number(form.jerseyNumber) } : {}),
        ...(role === "parent" ? { childUserId: form.childUserId } : {}),
      });
      // Le RoleGuard affichera l'écran "demande en attente de validation"
      router.replace(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
      setLoading(false);
    }
  }

  const step = !info ? 0 : !role ? 1 : 2;

  return (
    <div className="space-y-4">
      <Dots total={3} current={step} />
      {step === 0 && (
        <StepCard title="Le code de votre équipe" subtitle="Le coach a transmis un code unique à toute l'équipe." onBack={onBack}>
          <form onSubmit={checkCode} className="space-y-4">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="field text-center text-xl font-black tracking-[0.3em] uppercase"
              placeholder="ABC123"
              maxLength={10}
              aria-label="Code d'équipe"
            />
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Vérification…" : "Vérifier le code"}
            </Button>
          </form>
        </StepCard>
      )}
      {step === 1 && info && (
        <StepCard
          title={`Vous rejoignez ${info.teamName}`}
          subtitle={`${info.city} — qui êtes-vous ?`}
          onBack={() => setInfo(null)}
        >
          <div className="space-y-3">
            <button onClick={() => setRole("player")} className="card w-full p-5 flex items-center gap-4 text-left hover:border-pitch/50 transition">
              <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
                <UserRound size={22} />
              </span>
              <span>
                <span className="block font-bold">Je suis joueur</span>
                <span className="block text-xs text-ink-soft">Je fais partie de l&apos;effectif de {info.teamName}.</span>
              </span>
            </button>
            <button onClick={() => setRole("parent")} className="card w-full p-5 flex items-center gap-4 text-left hover:border-pitch/50 transition">
              <span className="w-12 h-12 rounded-lg bg-tangerine-soft text-tangerine flex items-center justify-center shrink-0">
                <Users size={22} />
              </span>
              <span>
                <span className="block font-bold">Je suis parent</span>
                <span className="block text-xs text-ink-soft">Mon enfant joue dans cette équipe.</span>
              </span>
            </button>
          </div>
        </StepCard>
      )}
      {step === 2 && info && role && (
        <StepCard
          title={role === "player" ? "Votre fiche joueur" : "Votre compte parent"}
          subtitle="Votre demande sera envoyée au coach pour validation."
          onBack={() => setRole(null)}
        >
          <form onSubmit={finish} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="jFirstName" className="text-xs font-bold text-ink-soft">Prénom</label>
                <input id="jFirstName" required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="field" placeholder={role === "player" ? "Paul" : "Patricia"} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="jLastName" className="text-xs font-bold text-ink-soft">Nom</label>
                <input id="jLastName" required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="field" placeholder="Petit" />
              </div>
            </div>

            {role === "parent" && (
              <div className="space-y-1.5">
                <label htmlFor="jChild" className="text-xs font-bold text-ink-soft">Votre enfant dans l&apos;équipe</label>
                {info.players.length === 0 ? (
                  <p className="text-xs font-semibold text-ink-soft bg-sun-soft/60 rounded-lg px-3 py-2.5">
                    Aucun joueur n&apos;est encore inscrit : demandez à votre enfant de créer son compte d&apos;abord.
                  </p>
                ) : (
                  <select
                    id="jChild"
                    required
                    value={form.childUserId}
                    onChange={(e) => setForm((f) => ({ ...f, childUserId: e.target.value }))}
                    className="field"
                  >
                    <option value="">Choisir…</option>
                    {info.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {p.hasParent ? " (a déjà un parent lié)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {role === "player" && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-ink-soft">Votre poste (optionnel)</p>
                  <div className="flex flex-wrap gap-2">
                    {PLAYER_POSITIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, position: f.position === p ? "" : p }))}
                        aria-pressed={form.position === p}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition",
                          form.position === p
                            ? "bg-pitch text-white border-pitch shadow-sm"
                            : "bg-white text-ink-soft border-line hover:border-pitch/40",
                        )}
                      >
                        {POSITION_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="jJersey" className="text-xs font-bold text-ink-soft">N° de maillot (optionnel)</label>
                  <input
                    id="jJersey"
                    type="number"
                    min={1}
                    max={99}
                    value={form.jerseyNumber}
                    onChange={(e) => setForm((f) => ({ ...f, jerseyNumber: e.target.value }))}
                    className="field w-24"
                    placeholder="10"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="jEmail" className="text-xs font-bold text-ink-soft">Email</label>
              <input id="jEmail" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field" placeholder="vous@exemple.fr" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="jPassword" className="text-xs font-bold text-ink-soft">Choisissez un mot de passe (8 caractères minimum)</label>
              <input id="jPassword" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="field" />
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading || (role === "parent" && !form.childUserId)}>
              {loading ? "Envoi…" : "Envoyer ma demande au coach"}
            </Button>
          </form>
        </StepCard>
      )}
    </div>
  );
}

// V1 réservée aux coachs : le parcours « j'ai un code d'équipe » (JoinWizard)
// reste implémenté mais n'est plus proposé — /register mène droit au coach.
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
