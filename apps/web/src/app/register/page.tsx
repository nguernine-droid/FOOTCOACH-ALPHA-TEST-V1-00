"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  PASSWORD_MIN_LENGTH,
  passwordProblem,
  type CoachCategory,
  type MatchCategory,
  type MatchGender,
} from "@teamnexus/shared";
import { register } from "@/lib/api";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ClubNameField } from "@/components/ClubNameField";
import { GenderPicker } from "@/components/GenderPicker";
import { InstallAppCard } from "@/components/InstallAppCard";
import { CoachCategoryPicker } from "@/components/coach/CoachCategoryPicker";
import { Button } from "@/components/ui/Button";
import { LegalConsent } from "@/components/LegalConsent";
import { useInstallOffer } from "@/lib/install";
import { LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

// Inscription volontairement découpée en petites étapes :
// une seule question à l'écran, pour rester simple même sans être à l'aise avec la technologie.

/**
 * Écran d'après-inscription. Numéroté à la suite des cinq étapes pour tenir
 * dans le même `step`, mais il n'en est pas une : il vient APRÈS la création du
 * compte, et ne compte donc pas dans la progression.
 */
const DONE_STEP = 5;

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
  const [form, setForm] = useState({
    nickname: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    teamName: "",
    teamCity: "",
    teamStadium: "",
    licenseNumber: "",
  });
  // Hors de `form`, comme les acceptations : ce n'est pas une chaîne libre, et
  // surtout elle ne part d'aucune valeur — présélectionner une catégorie
  // reviendrait à en choisir une pour le coach.
  const [teamCategory, setTeamCategory] = useState<MatchCategory | null>(null);
  // Le genre suit la même règle que la catégorie, et pour la même raison : rien
  // de présélectionné, c'est une caractéristique de l'équipe, pas un défaut.
  const [teamGender, setTeamGender] = useState<MatchGender | null>(null);
  // Casquettes : aucune au départ, et aucune est une réponse valable — l'étape
  // se franchit sans rien cocher.
  const [categories, setCategories] = useState<CoachCategory[]>([]);
  // Les deux acceptations vivent hors de `form` : ce sont des booléens, et
  // surtout ils ne partent jamais d'une valeur « déjà donnée ».
  const [consent, setConsent] = useState({ responsibility: false, terms: false });
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  // Lu ici, et non dans l'écran final : c'est lui qui décide si cet écran a
  // quelque chose à dire, donc s'il faut s'y arrêter.
  const offer = useInstallOffer();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCategory(category: CoachCategory) {
    setCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  }

  // Chaque étape se valide sous ses champs plutôt que par une bulle native,
  // qui se place hors écran dès que le clavier est ouvert.
  const emailError = !form.email.trim()
    ? "Indiquez votre adresse email."
    : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())
      ? null
      : "Cette adresse email semble incomplète.";
  // Même règle que l'API, même message : la validation vient du paquet partagé.
  const passwordError =
    form.password.length === 0 ? "Choisissez un mot de passe." : passwordProblem(form.password);

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
    if (!consent.responsibility || !consent.terms) return;
    setLoading(true);
    setError(null);
    try {
      await register("/auth/register-coach", {
        ...form,
        teamCategory,
        teamGender,
        categories,
        teamStadium: form.teamStadium.trim() || undefined,
        licenseNumber: form.licenseNumber.trim() || undefined,
        acceptTerms: consent.terms,
        acceptResponsibility: consent.responsibility,
      });
      // Le compte existe, la session est ouverte : le parcours est fini. Reste
      // le seul moment où proposer l'installation a du sens — le coach vient
      // de décider que l'application lui servirait. S'il n'y a rien à lui
      // proposer (déjà installée, navigateur qui ne sait pas faire), on ne
      // l'arrête pas sur un écran vide.
      if (offer === "none") router.replace("/coach/team?bienvenue=1");
      else setStep(DONE_STEP);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible");
      setLoading(false);
    }
  }

  /**
   * Après l'inscription, hors du décompte d'étapes : le compte est créé, plus
   * rien n'est obligatoire ni annulable ici. D'où l'absence de « Retour » et de
   * points de progression — ce n'est plus une étape, c'est un aboutissement.
   */
  if (step === DONE_STEP) {
    return (
      <div className="card p-6 space-y-5 animate-rise-in">
        <div className="space-y-1">
          <h2 className="text-lg font-black">Bienvenue, {form.nickname.trim()}</h2>
          <p className="text-sm text-ink-soft">
            Votre compte et votre équipe sont créés. Une dernière chose, puis vous y êtes.
          </p>
        </div>
        <InstallAppCard />
        <Button type="button" size="lg" className="w-full" onClick={() => router.replace("/coach/team?bienvenue=1")}>
          Continuer vers mon équipe
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Dots total={5} current={step} />
      {step === 0 && (
        <StepCard title="Qui êtes-vous ?" subtitle="Choisissez le nom que les autres coachs verront." onBack={onBack}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              advance(1, !form.nickname.trim());
            }}
            className="space-y-4"
          >
            {/* Le surnom est LA seule identité montrée aux confrères : c'est
                donc lui qui est obligatoire. L'état civil suit, facultatif —
                il ne sort jamais du compte. */}
            <div className="space-y-1.5">
              <label htmlFor="nickname" className="text-xs font-bold text-ink-soft">Surnom</label>
              <input id="nickname" autoComplete="nickname" enterKeyHint="next" maxLength={30} value={form.nickname} onChange={(e) => set("nickname", e.target.value)} className="field" placeholder="Coach Alex" />
              {touched && !form.nickname.trim() ? (
                <FieldError id="nickname-error">Choisissez un surnom.</FieldError>
              ) : (
                <p className="text-[11px] text-ink-soft">
                  C&apos;est le nom que les autres coachs verront — sur vos annonces, vos messages, votre carte.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-xs font-bold text-ink-soft">Prénom <span className="text-ink-faint font-semibold">(optionnel)</span></label>
                <input id="firstName" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="field" placeholder="Alexandre" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-xs font-bold text-ink-soft">Nom <span className="text-ink-faint font-semibold">(optionnel)</span></label>
                <input id="lastName" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="field" placeholder="Martin" />
              </div>
            </div>
            {/* Facultatif, et à côté du nom parce que c'est une donnée de
                personne : on l'a sous la main en s'inscrivant, beaucoup moins
                le jour où il faudra la retrouver. */}
            <div className="space-y-1.5">
              <label htmlFor="licenseNumber" className="text-xs font-bold text-ink-soft">Numéro de licence (optionnel)</label>
              <input id="licenseNumber" autoComplete="off" autoCapitalize="characters" enterKeyHint="done" maxLength={30} value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} className="field" placeholder="2543678901" />
              <p className="text-[11px] text-ink-soft">
                Votre licence d&apos;éducateur. Visible de vous seul, et modifiable plus tard dans Mon profil.
              </p>
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
              <label htmlFor="password" className="text-xs font-bold text-ink-soft">Mot de passe ({PASSWORD_MIN_LENGTH} caractères minimum)</label>
              <input id="password" type="password" autoComplete="new-password" enterKeyHint="next" aria-invalid={Boolean(touched && passwordError) || undefined} value={form.password} onChange={(e) => set("password", e.target.value)} className="field" />
              {touched && passwordError && <FieldError id="password-error">{passwordError}</FieldError>}
            </div>
            <Button type="submit" size="lg" className="w-full">Continuer</Button>
          </form>
        </StepCard>
      )}
      {step === 2 && (
        <StepCard title="Votre équipe" subtitle="Elle sera créée avec vous." onBack={() => setStep(1)}>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              advance(3, !form.teamName.trim() || !form.teamCity.trim() || !teamCategory || !teamGender);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="teamName" className="text-xs font-bold text-ink-soft">Nom de l&apos;équipe</label>
              {/* Suggestions depuis l'annuaire public des entreprises. Choisir
                  un club remplit aussi la ville — mais rien n'oblige à choisir,
                  beaucoup de clubs amateurs n'y figurent pas. */}
              <ClubNameField
                id="teamName"
                value={form.teamName}
                onChange={(v) => set("teamName", v)}
                onPickCity={(city) => set("teamCity", city)}
                placeholder="FC Exemple"
              />
              {touched && !form.teamName.trim() && <FieldError id="teamName-error">Donnez un nom à votre équipe.</FieldError>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="teamCity" className="text-xs font-bold text-ink-soft">Ville</label>
              <input id="teamCity" autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" value={form.teamCity} onChange={(e) => set("teamCity", e.target.value)} className="field" placeholder="Lyon" />
              {touched && !form.teamCity.trim() && <FieldError id="teamCity-error">Indiquez la ville de l&apos;équipe.</FieldError>}
            </div>
            {/* Catégorie, genre et stade : demandés une fois ici, ils
                préremplissent ensuite chaque annonce — d'où leur place dès
                l'inscription. */}
            <CategoryPicker
              value={teamCategory}
              onChange={setTeamCategory}
              idPrefix="register-category"
              narrow
              hint="Elle sera reprise dans vos annonces de match."
            />
            {touched && !teamCategory && <FieldError id="teamCategory-error">Choisissez la catégorie de l&apos;équipe.</FieldError>}
            <GenderPicker
              value={teamGender}
              onChange={setTeamGender}
              idPrefix="register-gender"
              hint="Repris lui aussi, et comparé à celui des équipes qui répondront à vos annonces."
            />
            {touched && !teamGender && <FieldError id="teamGender-error">Choisissez le genre de l&apos;équipe.</FieldError>}
            <div className="space-y-1.5">
              <label htmlFor="teamStadium" className="text-xs font-bold text-ink-soft">Stade habituel (optionnel)</label>
              <input id="teamStadium" autoComplete="off" autoCapitalize="words" enterKeyHint="done" maxLength={150} value={form.teamStadium} onChange={(e) => set("teamStadium", e.target.value)} className="field" placeholder="Stade municipal" />
            </div>
            <Button type="submit" size="lg" className="w-full">Continuer</Button>
          </form>
        </StepCard>
      )}
      {step === 3 && (
        <StepCard
          title="Vos casquettes"
          subtitle="Coach simple, ou l'une des deux façons d'aider les autres coachs."
          onBack={() => setStep(2)}
        >
          {/* Étape à part entière, et non une ligne de plus au milieu des
              champs de l'équipe : ce sont deux engagements à lire, pas deux
              cases à expédier. « Coach simple » est coché d'avance parce que
              c'est le cas ordinaire — d'où le bouton « Continuer » toujours
              actif, l'étape se franchit sans rien toucher. */}
          <div className="space-y-4">
            <CoachCategoryPicker
              value={categories}
              onToggle={toggleCategory}
              onClear={() => setCategories([])}
              idPrefix="register-casquette"
            />
            <p className="text-[11px] text-ink-soft">
              Vous pourrez en prendre une, ou les retirer, plus tard dans Mon profil.
            </p>
            <Button type="button" size="lg" className="w-full" onClick={() => advance(4, false)}>
              Continuer
            </Button>
          </div>
        </StepCard>
      )}
      {step === 4 && (
        <StepCard
          title="À savoir avant de commencer"
          subtitle="Ce que l'application fait — et ce qu'elle ne fait pas à votre place."
          onBack={() => setStep(3)}
        >
          <form onSubmit={finish} noValidate className="space-y-4">
            <LegalConsent
              responsibility={consent.responsibility}
              terms={consent.terms}
              onChange={(key, value) => setConsent((c) => ({ ...c, [key]: value }))}
              showErrors={touched}
            />
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
            TEAM<span className="text-pitch">NEXUS</span>
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

        {/* Les mentions légales doivent rester atteignables sans compte : c'est
            la seule page qui dit qui édite le service et comment le joindre. */}
        <nav aria-label="Informations légales" className="flex justify-center gap-3 text-[11px] text-ink-faint">
          <a href={LEGAL_LINKS.legalNotice} target="_blank" rel="noopener noreferrer" className="hover:underline">
            Mentions légales
          </a>
          <a href={LEGAL_LINKS.cgu} target="_blank" rel="noopener noreferrer" className="hover:underline">
            CGU
          </a>
          <a href={LEGAL_LINKS.privacy} target="_blank" rel="noopener noreferrer" className="hover:underline">
            Confidentialité
          </a>
        </nav>
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
