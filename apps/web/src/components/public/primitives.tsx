import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Les primitives de la vitrine.
 *
 * Volontairement distinctes de `.card` / `.btn` de `globals.css`, qui sont
 * partagées avec l'application connectée : leur donner le halo et la grande
 * ombre que demande la vitrine repeindrait le tableau de bord d'un coach au
 * passage. Ici, un seul jeu de règles, un seul endroit où les changer.
 *
 * Ce sont des composants serveur — aucun n'a d'état. Les trois qui ont besoin
 * du navigateur (entrée au défilement, compteur, parallaxe) vivent dans leurs
 * propres fichiers, marqués `"use client"`.
 */

/** La largeur de lecture commune à toute la page */
export function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("max-w-[1100px] mx-auto px-5", className)}>{children}</div>;
}

/**
 * Une section et son air. Le manque d'espace vertical est ce qui fait le plus
 * « amateur » sur une page de présentation : on respire large, et on ne
 * rattrape pas cet espace sur mobile, où il compte encore plus.
 */
export function Section({
  children,
  className,
  label,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Nom accessible de la section — chaque section en porte un */
  label: string;
  id?: string;
}) {
  return (
    <section id={id} aria-label={label} className={cn("py-24 md:py-36", className)}>
      <Shell>{children}</Shell>
    </section>
  );
}

/**
 * L'en-tête d'une section : une étiquette, un titre, une phrase.
 *
 * La ligne de corps est bornée à 65 caractères. Ce n'est pas une préférence :
 * au-delà, l'œil perd la ligne suivante en revenant à la marge gauche.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-4", align === "center" && "text-center")}>
      {eyebrow && <p className="section-title text-[12px] text-accent">{eyebrow}</p>}
      <h2 className="display text-3xl md:text-5xl leading-[0.95] text-primary">{title}</h2>
      {lead && (
        <p
          className={cn(
            "text-base md:text-lg text-secondary leading-relaxed max-w-[65ch]",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

/** Une carte de la vitrine. `lift` lui donne sa réponse au survol. */
export function VCard({
  children,
  className,
  lift = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  lift?: boolean;
  as?: "div" | "li" | "article";
}) {
  return <Tag className={cn("v-card", lift && "v-lift", className)}>{children}</Tag>;
}

export function Pill({
  children,
  accent = false,
  className,
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return <span className={cn("v-chip", accent && "v-chip-accent", className)}>{children}</span>;
}

/**
 * Le carré d'icône en relief. Il monte d'une strate sur son fond et porte le
 * même liseré que les cartes : c'est ce qui le fait paraître posé DESSUS
 * plutôt que découpé dedans.
 */
export function IconTile({
  children,
  accent = false,
  className,
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "w-12 h-12 rounded-[var(--v-radius-chip)] flex items-center justify-center shrink-0",
        "border border-[var(--v-rim)] shadow-[var(--v-inset)]",
        accent ? "text-accent-on" : "v-surface-3 text-accent",
        className,
      )}
      style={accent ? { backgroundImage: "linear-gradient(180deg, var(--v-cta-from), var(--v-cta-to))" } : undefined}
    >
      {children}
    </span>
  );
}

const BUTTON_SIZES = {
  md: "px-5 py-2.5 text-sm min-h-11",
  lg: "px-7 py-4 text-[17px] min-h-14",
} as const;

/** Un lien qui a l'air d'un bouton — la vitrine n'a que des liens */
export function VButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("v-btn", variant === "primary" ? "v-btn-primary" : "v-btn-ghost", BUTTON_SIZES[size], className)}
    >
      {children}
    </Link>
  );
}
