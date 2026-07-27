"use client";

import { cn } from "@/lib/utils";

/** Photo de profil, ou initiales sur fond navy quand aucune photo n'est posée. */
export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 44,
  className,
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const style = { width: size, height: size };

  if (avatarUrl) {
    return (
      // Photo servie par l'API : pas d'optimisation next/image, une balise suffit
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        style={style}
        className={cn("rounded-full object-cover bg-paper shrink-0", className)}
      />
    );
  }

  return (
    <span
      style={style}
      aria-label={`${firstName} ${lastName}`}
      className={cn(
        "rounded-full bg-navy-700 text-white flex items-center justify-center font-black shrink-0",
        size >= 64 ? "text-xl" : size >= 44 ? "text-sm" : "text-xs",
        className,
      )}
    >
      {initials}
    </span>
  );
}
