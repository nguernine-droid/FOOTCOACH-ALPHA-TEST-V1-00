import { cn } from "@/lib/utils";

/**
 * Logo FootCoach.
 *
 * La marque est bleue (#124BCB) : posée directement sur le header navy, elle
 * tomberait à 2,35:1 de contraste et se lirait à peine. Elle est donc portée
 * par une pastille claire, qui lui rend son intensité d'origine — celle du
 * fichier fourni, dessiné pour un fond blanc.
 *
 * `alt` vide : le logo jouxte toujours le mot-repère « FOOTCOACH », un lecteur
 * d'écran annoncerait deux fois la même chose.
 */
export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  // Marque à 76 % de la pastille : assez de marge pour que le cercle du logo
  // ne touche pas le bord arrondi.
  const mark = Math.round(size * 0.76);
  return (
    <span
      className={cn("shrink-0 inline-flex items-center justify-center rounded-xl bg-white shadow-sm", className)}
      style={{ width: size, height: size }}
    >
      {/* Fichier statique servi tel quel : dimensions fixées, donc zéro
          décalage de mise en page au chargement. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={mark} height={mark} style={{ width: mark, height: mark }} />
    </span>
  );
}
