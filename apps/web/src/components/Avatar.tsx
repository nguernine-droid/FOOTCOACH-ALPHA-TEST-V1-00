"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Initiales d'un nom d'affichage : premières lettres des deux premiers mots
 * (« Coach Alex » → CA), ou les deux premières lettres d'un mot seul
 * (« Bruno » → BR). Le nom peut être un surnom comme un état civil — le
 * composant n'a pas à le savoir.
 */
function initialsOf(name: string): string {
  // `?? ""` : une session d'avant le surnom peut passer un nom encore absent
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length >= 2 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2);
  return letters.toUpperCase();
}

/** Photo de profil, ou initiales sur fond navy quand aucune photo n'est posée. */
export function Avatar({
  name,
  avatarUrl,
  size = 44,
  className,
}: {
  /** Nom d'affichage : le surnom d'un coach, ou l'état civil côté gestion */
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  // Une photo supprimée côté serveur laisserait sinon l'icône « image brisée »
  const [broken, setBroken] = useState(false);

  if (avatarUrl && !broken) {
    return (
      // Photo servie par l'API : pas d'optimisation next/image, une balise suffit
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={style}
        onError={() => setBroken(true)}
        className={cn("rounded-full object-cover bg-paper shrink-0", className)}
      />
    );
  }

  return (
    <span
      style={style}
      aria-label={name}
      className={cn(
        "rounded-full bg-navy-700 text-white flex items-center justify-center font-black shrink-0",
        size >= 64 ? "text-xl" : size >= 44 ? "text-sm" : "text-xs",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
