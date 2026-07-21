"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Ticket } from "lucide-react";
import type { InvitationInfoDto } from "@footcoach/shared";
import { api, homeForRole, register } from "@/lib/api";
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
              {loading ? "Création…" : "Créer mon compte et mon équipe 🎉"}
            </Button>
          </form>
        </StepCard>
      )}
    </div>
  );
}

function InviteWizard({ initialCode, onBack }: { initialCode: string; onBack: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [info, setInfo] = useState<InvitationInfoDto | null>(null);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setInfo(await api<InvitationInfoDto>(`/invitations/${code.trim().toUpperCase()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await register("/auth/register-invite", {
        code: code.trim().toUpperCase(),
        email: form.email,
        password: form.password,
        ...(info?.role === "parent" && form.firstName ? { firstName: form.firstName, lastName: form.lastName } : {}),
      });
      router.replace(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Dots total={2} current={info ? 1 : 0} />
      {!info ? (
        <StepCard title="Votre code d'invitation" subtitle="Il vous a été transmis par le coach (ou par votre enfant)." onBack={onBack}>
          <form onSubmit={checkCode} className="space-y-4">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="field text-center text-xl font-black tracking-[0.3em] uppercase"
              placeholder="ABC123"
              maxLength={10}
              aria-label="Code d'invitation"
            />
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Vérification…" : "Vérifier le code"}
            </Button>
          </form>
        </StepCard>
      ) : (
        <StepCard
          title={info.role === "player" ? `Bienvenue ${info.firstName} ! ⚽` : "Bienvenue ! 👋"}
          subtitle={
            info.role === "player"
              ? `Vous rejoignez l'équipe ${info.teamName} en tant que joueur.`
              : `Vous rejoignez ${info.teamName} en tant que parent${info.playerName ? ` de ${info.playerName}` : ""}.`
          }
          onBack={() => setInfo(null)}
        >
          <form onSubmit={finish} className="space-y-4">
            {info.role === "parent" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="pFirstName" className="text-xs font-bold text-ink-soft">Votre prénom</label>
                  <input id="pFirstName" required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="field" placeholder="Patricia" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="pLastName" className="text-xs font-bold text-ink-soft">Votre nom</label>
                  <input id="pLastName" required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="field" placeholder="Petit" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="inviteEmail" className="text-xs font-bold text-ink-soft">Email</label>
              <input id="inviteEmail" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field" placeholder="vous@exemple.fr" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invitePassword" className="text-xs font-bold text-ink-soft">Choisissez un mot de passe (8 caractères minimum)</label>
              <input id="invitePassword" type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="field" />
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
          </form>
        </StepCard>
      )}
    </div>
  );
}

function RegisterContent() {
  const params = useSearchParams();
  const codeFromUrl = params.get("code") ?? "";
  const [path, setPath] = useState<"choice" | "coach" | "invite">(codeFromUrl ? "invite" : "choice");

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <p className="text-3xl" aria-hidden>⚽</p>
          <h1 className="text-2xl font-black">Créer un compte</h1>
        </div>

        {path === "choice" && (
          <div className="space-y-3 animate-rise-in">
            <button onClick={() => setPath("coach")} className="card w-full p-5 flex items-center gap-4 text-left hover:border-pitch/50 transition">
              <span className="w-12 h-12 rounded-2xl bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
                <ClipboardList size={22} />
              </span>
              <span>
                <span className="block font-bold">Je suis coach</span>
                <span className="block text-xs text-ink-soft">Je crée mon équipe, puis j&apos;invite mes joueurs et leurs parents.</span>
              </span>
            </button>
            <button onClick={() => setPath("invite")} className="card w-full p-5 flex items-center gap-4 text-left hover:border-pitch/50 transition">
              <span className="w-12 h-12 rounded-2xl bg-tangerine-soft text-tangerine flex items-center justify-center shrink-0">
                <Ticket size={22} />
              </span>
              <span>
                <span className="block font-bold">J&apos;ai un code d&apos;invitation</span>
                <span className="block text-xs text-ink-soft">Un coach ou un joueur m&apos;a transmis un code pour rejoindre l&apos;équipe.</span>
              </span>
            </button>
          </div>
        )}
        {path === "coach" && <CoachWizard onBack={() => setPath("choice")} />}
        {path === "invite" && <InviteWizard initialCode={codeFromUrl} onBack={() => setPath("choice")} />}

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
