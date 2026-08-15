import { cn } from "@/lib/utils";

/**
 * L'écusson d'une équipe, avec ses initiales en repli.
 *
 * Le repli n'est pas un pis-aller : la plupart des équipes n'auront jamais de
 * logo, et deux lettres sur un fond stable se reconnaissent mieux qu'une icône
 * générique répétée vingt fois sur un écran. C'est le même principe que la
 * photo de profil d'un coach.
 *
 * Sans `next/image` : les logos viennent du volume d'uploads servi par l'API,
 * l'optimiseur n'y apporterait rien et imposerait une configuration de domaine.
 */
export function TeamLogo({
  name,
  logoUrl,
  size = 32,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={cn(
        "shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-paper",
        "border border-line text-ink-soft font-black",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      aria-hidden
    >
      {logoUrl ? (
        // `alt` vide et `aria-hidden` sur le conteneur : le nom de l'équipe est
        // toujours écrit juste à côté, le répéter alourdirait la lecture vocale.
        <img src={logoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
