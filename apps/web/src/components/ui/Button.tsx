"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "soft" | "ghost" | "danger" | "cta";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

/**
 * Chaque variante est une classe de composant définie dans `globals.css`, et
 * non une chaîne d'utilitaires : c'est le point unique où un thème (ici le
 * thème nocturne de l'espace coach) reteinte tous les boutons de l'app sans
 * qu'aucun appelant ne change.
 */
const variants: Record<Variant, string> = {
  primary: "btn-primary",
  accent: "btn-accent",
  soft: "btn-soft",
  ghost: "btn-ghost",
  danger: "btn-danger",
  cta: "btn-cta",
};

// Hauteurs minimales pensées pour le pouce (44/48/52 px) puis ramenées à la
// densité d'origine au-delà de 960 px, où l'on vise à la souris.
// `xl` est l'action pleine largeur des états vides : 56 px, elle ne se réduit
// pas sur desktop — c'est la seule chose à faire sur l'écran.
const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-xs min-h-11 min-[960px]:min-h-0",
  md: "px-5 py-2.5 text-sm min-h-12 min-[960px]:min-h-0",
  lg: "px-6 py-3.5 text-sm min-h-13 min-[960px]:min-h-0",
  xl: "px-6 py-4 text-[17px] font-semibold min-h-14",
};

function buttonClassName(variant: Variant, size: Size, className?: string) {
  return cn(
    "btn inline-flex items-center justify-center gap-2 font-bold rounded-lg select-none transition-all",
    "active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", children, className, ...props }: ButtonProps) {
  return (
    <button className={buttonClassName(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

/**
 * Même apparence, mais c'est bien un lien. Évite d'imbriquer un <button> dans
 * un <a> — HTML invalide, et la cible tactile ne couvrait pas toujours toute
 * la surface dessinée.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={buttonClassName(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
