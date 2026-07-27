"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-blue-dark shadow-[0_2px_8px_-2px_rgba(29,111,224,0.4)]",
  accent: "bg-tangerine text-white hover:brightness-95 shadow-[0_2px_8px_-2px_rgba(161,98,7,0.35)]",
  soft: "bg-blue-soft text-navy-700 hover:bg-blue/15",
  ghost: "bg-transparent text-ink-soft border border-line hover:bg-white hover:text-ink",
  danger: "bg-coral-soft text-coral hover:bg-coral/15",
};

// Hauteurs minimales pensées pour le pouce (44/48/52 px) puis ramenées à la
// densité d'origine au-delà de 960 px, où l'on vise à la souris.
const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-xs min-h-11 min-[960px]:min-h-0",
  md: "px-5 py-2.5 text-sm min-h-12 min-[960px]:min-h-0",
  lg: "px-6 py-3.5 text-sm min-h-13 min-[960px]:min-h-0",
};

function buttonClassName(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-bold rounded-lg select-none transition-all",
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
