"use client";

import {
  Car,
  FileCheck,
  Landmark,
  ShieldAlert,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { FFF_NOTICE_DAYS } from "@footcoach/shared";
import { LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

/**
 * Ce que le coach doit savoir avant de créer un compte.
 *
 * Ces points ne sont pas un résumé d'agrément : ce sont les limites du service,
 * énoncées là où elles ont une chance d'être lues — à l'inscription, avant que
 * le compte existe, et non dans un document qu'on ouvre rarement. Chacun
 * reprend une clause des CGU (§5 « Ce que le service fait — et ne fait pas »,
 * §8 « Scores et validation », §9 « Disponibilité »).
 *
 * Toute modification ici doit rester fidèle aux CGU publiées : c'est le même
 * engagement, dit deux fois. En cas d'écart, c'est le texte des CGU qui fait
 * foi — raison de plus pour ne pas laisser les deux diverger.
 */
const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldAlert,
    title: "La déclaration à votre district reste la vôtre",
    body: `Un match amical doit être déclaré au district ou à la ligue, en principe au moins ${FFF_NOTICE_DAYS} jours avant la rencontre. L'application vous rappelle ce délai et vous demande de l'attester : elle ne déclare rien à votre place et ne transmet rien à votre fédération.`,
  },
  {
    icon: FileCheck,
    title: "Licences, assurances, terrain, secours",
    body: "Rien de tout cela n'est vérifié par l'application : ni la validité des licences, ni les assurances, ni l'homologation du terrain, ni la présence d'un arbitre, d'un secouriste ou d'un défibrillateur. Ces vérifications vous appartiennent, à vous et à votre club.",
  },
  {
    icon: Car,
    title: "Transport des joueurs et encadrement des mineurs",
    body: "Hors du périmètre du service. Le covoiturage met des parents en relation et n'organise, n'encadre ni n'assure aucun déplacement.",
  },
  {
    icon: Users,
    title: "Nous ne contrôlons pas qui s'inscrit",
    body: "L'identité et la qualité d'éducateur des personnes inscrites ne sont pas vérifiées. Avant de déplacer une équipe, vérifiez auprès de votre interlocuteur ce qui doit l'être.",
  },
  {
    icon: Trophy,
    title: "Les scores n'ont aucune valeur officielle",
    body: "La double validation par QR code sert à éviter les désaccords entre coachs. Elle ne constitue pas un résultat officiel et n'est transmise à aucune fédération.",
  },
  {
    icon: Landmark,
    title: "FootCoach est indépendant",
    body: "L'application n'est ni affiliée, ni partenaire, ni mandatée par la Fédération française de football, ses ligues ou ses districts.",
  },
  {
    icon: Wrench,
    title: "Service gratuit, fourni en l'état",
    body: "La version 1 évolue régulièrement. Ni la disponibilité continue, ni l'absence d'erreur ne sont garanties.",
  },
];

/** Lien vers un document contractuel : nouvel onglet, l'inscription en cours est préservée */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-pitch underline underline-offset-2"
    >
      {children}
    </a>
  );
}

/** Case à cocher pleine largeur : toute la ligne est cliquable */
function ConsentBox({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  error: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className={cn(
          "flex gap-3 items-start rounded-lg border px-4 py-3 cursor-pointer transition",
          checked
            ? "border-blue bg-blue-faint"
            : error
              ? "border-coral bg-coral-soft"
              : "border-line bg-paper hover:border-blue/40",
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 shrink-0 accent-blue"
        />
        <span className="text-xs text-ink-soft leading-relaxed">{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="text-xs font-semibold text-coral">
          Cochez cette case pour continuer.
        </p>
      )}
    </div>
  );
}

/**
 * Les deux acceptations exigées à l'inscription.
 *
 * Deux cases et non une : la clause de responsabilité est celle qui compte le
 * jour où un litige survient. Acceptée séparément, elle ne peut pas être
 * présentée comme noyée dans un renvoi aux conditions générales.
 *
 * Aucune n'est pré-cochée, et rien ne les coche à la place du coach : une
 * acceptation par défaut n'est pas une acceptation. Le serveur applique la même
 * règle de son côté (`registerCoachSchema`), parce qu'une case cochée dans un
 * navigateur ne prouve rien.
 */
export function LegalConsent({
  responsibility,
  terms,
  onChange,
  showErrors,
}: {
  responsibility: boolean;
  terms: boolean;
  onChange: (key: "responsibility" | "terms", value: boolean) => void;
  showErrors: boolean;
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {POINTS.map((point) => (
          <li key={point.title} className="flex gap-2.5">
            <point.icon size={15} className="text-blue shrink-0 mt-0.5" aria-hidden />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-ink leading-snug">{point.title}</p>
              <p className="text-xs text-ink-soft leading-relaxed">{point.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2.5">
        <ConsentBox
          id="acceptResponsibility"
          checked={responsibility}
          onChange={(value) => onChange("responsibility", value)}
          error={showErrors && !responsibility}
        >
          <span className="font-bold text-ink">
            Je comprends que la déclaration du match à ma fédération, les licences, les assurances et
            le transport des joueurs relèvent de ma responsabilité et de celle de mon club.
          </span>{" "}
          FootCoach n&apos;en répond pas et n&apos;effectue aucune démarche auprès de la fédération.
        </ConsentBox>

        <ConsentBox
          id="acceptTerms"
          checked={terms}
          onChange={(value) => onChange("terms", value)}
          error={showErrors && !terms}
        >
          <span className="font-bold text-ink">
            J&apos;ai lu et j&apos;accepte les{" "}
            <LegalLink href={LEGAL_LINKS.cgu}>conditions générales d&apos;utilisation</LegalLink>, et
            je certifie être majeur et habilité à engager mon équipe.
          </span>{" "}
          J&apos;ai pris connaissance de la{" "}
          <LegalLink href={LEGAL_LINKS.privacy}>politique de confidentialité</LegalLink>.
        </ConsentBox>
      </div>
    </div>
  );
}
