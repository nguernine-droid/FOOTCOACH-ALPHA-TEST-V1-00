import { cn } from "@/lib/utils";

/**
 * Marque FootCoach.
 *
 * Dessinée ici, en SVG et en jetons, plutôt que servie comme image. Trois
 * raisons : elle suit le thème sans qu'on ait à maintenir deux fichiers, elle
 * reste nette à toutes les tailles, et elle ne coûte pas une requête.
 *
 * Le motif n'est pas un blason. L'écusson est le code du club affilié, et
 * c'était l'un des signaux qui rattachaient l'ancienne direction à l'imagerie
 * fédérale. Ce n'est pas non plus une illustration : dans cette direction, la
 * marque est une MIRE — un carré, un repère, un point. Le vocabulaire d'un
 * système qui désigne plutôt qu'il ne décore.
 *
 * C'est le seul endroit de l'application où le signal apparaît sans qu'il y
 * ait rien à faire. La marque est l'exception qui fonde la règle : elle dit ce
 * que la couleur veut dire, avant qu'on ait à s'en servir.
 *
 * `aria-hidden` : le logo jouxte toujours le mot-repère « FOOTCOACH », un
 * lecteur d'écran annoncerait deux fois la même chose.
 */
export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* La tuile est NOIRE, pas orange : le signal ne remplit jamais une
          surface qui n'appelle pas d'action. */}
      <rect width="32" height="32" rx="8" fill="var(--structure-1)" />

      {/* La mire : quatre angles, ouverts. Un cadre fermé serait un cadre ;
          ouvert, il vise. */}
      <path
        d="M8 12V9.5C8 8.7 8.7 8 9.5 8H12M20 8H22.5C23.3 8 24 8.7 24 9.5V12M24 20V22.5C24 23.3 23.3 24 22.5 24H20M12 24H9.5C8.7 24 8 23.3 8 22.5V20"
        stroke="var(--text-on-structure)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Le point visé. Seul élément coloré de la marque, et seul élément
          plein : c'est lui qu'on regarde. */}
      <circle cx="16" cy="16" r="3.4" fill="var(--accent-solid)" />
    </svg>
  );
}
